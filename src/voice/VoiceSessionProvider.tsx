import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { apiHeaders, config, hasRemote } from '../config';
import { repository } from '../data/repository';
import { useData } from '../data/store';
import { DESCRIPTORS } from '../domain/lexicon';
import { REGIONS } from '../domain/regions';
import type { SessionType } from '../domain/types';
import { applyScript, VOICE_DIRECTION } from '../engine/guide/lines';
import { LocalGuideBrain } from '../engine/guide/LocalGuideBrain';
import { RemoteGuideBrain } from '../engine/guide/RemoteGuideBrain';
import type { SessionLength } from '../engine/phases';
import { SessionEngine } from '../engine/SessionEngine';
import { SessionRunner, type PauseReason, type RunnerStatus } from '../engine/SessionRunner';
import type { GuideBrain } from '../engine/types';
import { Ambience } from './ambience';
import { endSessionAudio } from './audioSession';
import { DevTextInput } from './input/DevTextInput';
import { OnDeviceSpeechInput } from './input/OnDeviceSpeechInput';
import { SimulatedParticipantInput } from './input/SimulatedParticipantInput';
import { ElevenLabsSpeechOutput } from './output/ElevenLabsSpeechOutput';
import type { SpeechInput, SpeechOutput, VoiceError } from './types';

/**
 * VoiceSessionProvider — the one place the app touches a voice session.
 *
 * It chooses the implementations (real or simulated listening, the
 * ElevenLabs voice, Claude or local guide), wires them into a SessionRunner, and
 * exposes a small surface to the UI: start, pause, resume, end, and a status
 * the session screen can show in a single word. The UI never imports a
 * vendor.
 *
 * It also owns the things a session needs from the phone: the screen stays
 * awake, the session pauses if the app is backgrounded, progress is saved as
 * a draft after every answer, and the finished session is written to local
 * storage.
 */

export type SessionStatus = RunnerStatus | 'idle' | 'unavailable';

export type DebugEntry = { at: number; who: 'guide' | 'user' | 'silence' | 'system'; text: string };

type VoiceSessionValue = {
  status: SessionStatus;
  error?: VoiceError;
  pausedBy?: PauseReason;
  sessionType?: SessionType;
  completedSessionId?: string;
  /** Session time excluding pauses, read on demand by the timer. */
  activeMs(): number;
  level: SharedValue<number>;
  labels: { input: string; output: string; brain: string };
  debug: DebugEntry[];
  devInput?: DevTextInput;
  start(type: SessionType, minutes?: SessionLength): Promise<void>;
  pause(): void;
  resume(): void;
  end(): void;
  reset(): void;
};

const Ctx = createContext<VoiceSessionValue | null>(null);

const CONTEXTUAL_STRINGS = [
  ...new Set([
    ...Object.values(REGIONS).map((r) => r.label),
    ...DESCRIPTORS.map((d) => d.word),
    'pulling',
    'tightness',
    'pressure',
    'shoulder blade',
    'back of my head',
    'continue',
    'pause',
  ]),
];

async function chooseInput(mode: string): Promise<SpeechInput> {
  const onDevice = new OnDeviceSpeechInput({ onDeviceOnly: true });
  if (!__DEV__) return onDevice;
  if (mode === 'simulated') return new SimulatedParticipantInput();
  if (mode === 'dev-text') return new DevTextInput();
  if (mode === 'on-device') return onDevice;
  // Auto: real speech where the native module exists, a simulated participant elsewhere (Expo Go, web).
  if (await onDevice.isAvailable()) return onDevice;
  return new SimulatedParticipantInput();
}

function chooseOutput(voiceId?: string): SpeechOutput {
  // ElevenLabs is the guide's only voice. If it can't be reached the session pauses; it never switches to the phone's voice.
  return new ElevenLabsSpeechOutput({
    apiUrl: config.apiUrl,
    headers: apiHeaders(),
    voiceId: voiceId ?? config.voiceId,
    direction: () => VOICE_DIRECTION,
  });
}

/**
 * The guide's words are edited in server/lib/guideScript.ts and served by the voice server.
 * Fetched at the start of each session; offline or slow, the last script (or the bundled one) is used.
 */
async function refreshScript(): Promise<void> {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 2500);
    const res = await fetch(`${config.apiUrl.replace(/\/$/, '')}/script`, { headers: apiHeaders(), signal: ctl.signal });
    clearTimeout(t);
    if (!res.ok) return;
    const rejected = applyScript(await res.json());
    if (__DEV__ && rejected.length) console.warn(`Guide script: kept the bundled words for ${rejected.join(', ')}`);
  } catch {
    // Keep whatever script is already in use.
  }
}

function chooseBrain(pref: string): GuideBrain {
  const remote = () => new RemoteGuideBrain({ url: config.apiUrl, headers: apiHeaders(), model: config.guideModel });
  if (__DEV__ && pref === 'local') return new LocalGuideBrain();
  if (__DEV__ && pref === 'claude' && hasRemote) return remote();
  return hasRemote ? remote() : new LocalGuideBrain();
}

export function VoiceSessionProvider({ children }: { children: ReactNode }) {
  const data = useData();
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [error, setError] = useState<VoiceError | undefined>();
  const [pausedBy, setPausedBy] = useState<PauseReason | undefined>();
  const [sessionType, setSessionType] = useState<SessionType | undefined>();
  const [completedSessionId, setCompleted] = useState<string | undefined>();
  const [labels, setLabels] = useState({ input: '', output: '', brain: '' });
  const [debug, setDebug] = useState<DebugEntry[]>([]);
  const [devInput, setDevInput] = useState<DevTextInput | undefined>();
  const level = useSharedValue(0);
  const runner = useRef<SessionRunner | null>(null);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  const start = useCallback(
    async (type: SessionType, minutes?: SessionLength) => {
      if (runner.current) return;
      const prefs = dataRef.current.prefs;
      setError(undefined);
      setCompleted(undefined);
      setDebug([]);
      setSessionType(type);
      setStatus('preparing');
      if (hasRemote) await refreshScript();

      const input = await chooseInput(prefs.dev.inputMode);
      const output = chooseOutput(prefs.voiceId);
      const brain = chooseBrain(prefs.dev.brain);
      setLabels({ input: input.label, output: output.label, brain: brain.id });
      setDevInput(input instanceof DevTextInput ? input : undefined);

      if (!(await input.isAvailable())) {
        setStatus('unavailable');
        setError({ code: 'unavailable', message: 'Speech recognition is not available on this device.' });
        return;
      }
      if (!(await input.requestPermission())) {
        setStatus('unavailable');
        setError({ code: 'permission', message: 'Attend needs the microphone and speech recognition to hear you.' });
        return;
      }

      const engine = new SessionEngine({ sessionType: type, minutes, keepTranscript: __DEV__ && prefs.dev.keepTranscripts });
      const ambience = prefs.ambience === false ? undefined : new Ambience();
      const r = new SessionRunner({
        engine,
        brain,
        voice: { input, output },
        contextualStrings: CONTEXTUAL_STRINGS,
        onState: (s) => {
          setStatus(s.status);
          setPausedBy(s.pausedBy);
          ambience?.follow(s.status);
          if (s.error) setError(s.error);
        },
        onLevel: (l) => {
          // Smoothed on the UI thread so the visual follows the voice without flicker.
          level.value = withTiming(l, { duration: 160 });
        },
        onDraft: (d) => {
          if (draftTimer.current) clearTimeout(draftTimer.current);
          draftTimer.current = setTimeout(() => {
            repository.saveDraft(d).catch(() => {});
          }, 400);
        },
        onDebug: __DEV__ ? (e) => setDebug((prev) => [...prev.slice(-80), { ...e, at: Date.now() }]) : undefined,
      });
      runner.current = r;
      activateKeepAwakeAsync('attend-session').catch(() => {});

      try {
        const { session, moments } = await r.run();
        const meaningful =
          session.outcome !== 'ended_early' || session.bodyMapEnd.sensations.length > 0 || session.endedAt - session.startedAt > 90_000;
        if (draftTimer.current) clearTimeout(draftTimer.current);
        if (meaningful) {
          await dataRef.current.saveSession(session, moments);
          setCompleted(session.id);
        } else {
          await repository.clearDraft();
          setCompleted('');
        }
      } catch (e) {
        setError({ code: 'unknown', message: String(e) });
        setStatus('error');
      } finally {
        runner.current = null;
        deactivateKeepAwake('attend-session');
        input.dispose();
        output.dispose();
        ambience?.stop();
        endSessionAudio().catch(() => {});
        level.value = 0;
      }
    },
    [level],
  );

  // Leaving the app mid-session pauses it; the person resumes when they come back.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') runner.current?.pause('background');
    });
    return () => sub.remove();
  }, []);

  const value = useMemo<VoiceSessionValue>(
    () => ({
      status,
      error,
      pausedBy,
      sessionType,
      completedSessionId,
      activeMs: () => runner.current?.activeMs ?? 0,
      level,
      labels,
      debug,
      devInput,
      start,
      pause: () => runner.current?.pause('button'),
      resume: () => {
        setError(undefined);
        runner.current?.resume();
      },
      end: () => runner.current?.end(),
      reset: () => {
        setStatus('idle');
        setCompleted(undefined);
        setError(undefined);
        setSessionType(undefined);
      },
    }),
    [status, error, pausedBy, sessionType, completedSessionId, level, labels, debug, devInput, start],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useVoiceSession(): VoiceSessionValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useVoiceSession outside VoiceSessionProvider');
  return v;
}
