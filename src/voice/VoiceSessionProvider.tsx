import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { apiHeaders, config, GUIDE_VOICES, hasRemote } from '../config';
import { repository } from '../data/repository';
import { useData } from '../data/store';
import { DESCRIPTORS } from '../domain/lexicon';
import { currentTz, dayKey, latestPlace } from '../domain/checkin';
import { completePractice, EMPTY_PROGRAM, type PracticeTheme } from '../domain/program';
import type { SpokenLine } from '../domain/lessonVoice';
import { buildMemory } from '../domain/memory';
import { afterPractice, backgroundFor, SLEEP_TAIL_MINUTES, type BackgroundPref } from '../domain/soundscapes';
import { REGIONS } from '../domain/regions';
import type { Place, SessionMode, SessionType } from '../domain/types';
import { applyOpening, applyScript, ARRIVE, SCAN_BODY, SCAN_BRIEF, SCAN_FULL, SCAN_SHORT, VOICE_DIRECTION } from '../engine/guide/lines';
import { LocalGuideBrain } from '../engine/guide/LocalGuideBrain';
import { RemoteGuideBrain } from '../engine/guide/RemoteGuideBrain';
import type { SessionLength } from '../engine/phases';
import { SessionEngine, type ScanBank } from '../engine/SessionEngine';
import { SessionRunner, type PauseReason, type RunnerStatus } from '../engine/SessionRunner';
import { WelcomeRunner, type WelcomeResult } from '../engine/WelcomeRunner';
import type { GuideBrain } from '../engine/types';
import { Ambience } from './ambience';
import { endSessionAudio } from './audioSession';
import { KeepAlive } from './keepAlive';
import { saveAgents, savedAgents, saveScript, savedScript } from './savedGuide';
import { startListening, stopListening } from './listen';
import { DevTextInput } from './input/DevTextInput';
import { NoInput } from './input/NoInput';
import { OnDeviceSpeechInput } from './input/OnDeviceSpeechInput';
import { SimulatedParticipantInput } from './input/SimulatedParticipantInput';
import { ElevenLabsSpeechOutput } from './output/ElevenLabsSpeechOutput';
import { sleep, type SpeechInput, type SpeechOutput, type VoiceError } from './types';

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
 * awake, a guided session keeps going with the phone locked (a conversation
 * pauses when the app is backgrounded), progress is saved as a draft after
 * every answer, and the finished session is written to local storage.
 */

export type SessionStatus = RunnerStatus | 'idle' | 'unavailable';

export type DebugEntry = { at: number; who: 'guide' | 'user' | 'silence' | 'system'; text: string };

type VoiceSessionValue = {
  status: SessionStatus;
  error?: VoiceError;
  pausedBy?: PauseReason;
  sessionType?: SessionType;
  /** 'guided' or 'conversation', once a session has started: only a conversation ever listens. */
  sessionMode?: SessionMode;
  completedSessionId?: string;
  /**
   * A sleep practice ended on its own: the voice is quiet, the sound (if any) carries on as a
   * 30-minute listen, and the session screen stays dark instead of moving to After.
   */
  resting: boolean;
  /** Session time excluding pauses, read on demand by the timer. */
  activeMs(): number;
  level: SharedValue<number>;
  labels: { input: string; output: string; brain: string };
  debug: DebugEntry[];
  devInput?: DevTextInput;
  /** `voiceId` is the preset's voice; without one, the person's own choice, then the session type's agent. */
  start(type: SessionType, minutes?: SessionLength, voiceId?: string, opts?: StartOptions): Promise<void>;
  /** Prepare a session of this type in the background (script, agent, opening audio). */
  warm(type: SessionType, voiceId?: string): void;
  /**
   * The spoken welcome. Resolves with what was understood; `ended` means fall back to tapping
   * through (asked to, or listening isn't available here).
   */
  startWelcome(): Promise<WelcomeResult>;
  /**
   * Fixed lines in the guide's voice, with their silences: a lesson read aloud. Same voice and
   * cache as the practice that follows (`type` and `voiceId` are that practice's). Resolves
   * 'done' at the end, 'stopped' if stopSpeaking() cut in, 'failed' if the voice couldn't be
   * had. Never while a session runs. Nothing here goes to a model.
   */
  speakLines(lines: SpokenLine[], opts?: SpeakLinesOptions): Promise<SpeakLinesResult>;
  stopSpeaking(): void;
  pause(): void;
  resume(): void;
  end(): void;
  reset(): void;
};

export type SpeakLinesOptions = {
  type?: SessionType;
  voiceId?: string;
  /** Speaking, or holding a line's silence: for the screen's breathing form. */
  onState?: (s: 'speaking' | 'holding') => void;
};
export type SpeakLinesResult = 'done' | 'stopped' | 'failed';

/** The session's sound and the listen's cross over this slowly, so the room never drops out. */
const SLEEP_HANDOVER_FADE_MS = 4000;

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

/** What the app takes from the session type's ElevenLabs agent (server/api/agent.ts). */
type AgentSettings = { voiceId?: string; speed?: number; stability?: number; similarity?: number; prompt?: string; firstMessage?: string };
const lastAgent: Partial<Record<SessionType, AgentSettings>> = {};

let restored = false;
/**
 * Before anything is fetched: the script and agents the server last sent (savedGuide.ts), so a
 * cold start offline asks the cache for the same words in the same voice it saved them under.
 * Once, and before any fetch, so a saved copy never overwrites a fresher one.
 */
function restoreGuide() {
  if (restored) return;
  restored = true;
  const script = savedScript();
  if (script) applyScript(script);
  for (const [type, agent] of Object.entries(savedAgents<AgentSettings>())) {
    if (!lastAgent[type as SessionType]) lastAgent[type as SessionType] = agent;
  }
}

/**
 * The guide's voice and tone are edited in ElevenLabs, one agent per session type.
 * Fetched with the script at the start of a session; offline, the last one fetched (or the defaults) is used.
 */
async function fetchAgent(type: SessionType): Promise<AgentSettings | undefined> {
  restoreGuide();
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 2500);
    const res = await fetch(`${config.apiUrl.replace(/\/$/, '')}/agent?type=${type}`, { headers: apiHeaders(), signal: ctl.signal });
    clearTimeout(t);
    if (res.ok) {
      lastAgent[type] = (await res.json()) as AgentSettings;
      saveAgents(lastAgent);
    }
  } catch {
    // Keep the last settings.
  }
  return lastAgent[type];
}

const FRESH_MS = 10 * 60_000;
const warmedAt: Partial<Record<SessionType, number>> = {};

/**
 * Get a session ready before it is started: the script, the agent and the audio of the
 * opening lines. Called from Home, so Begin goes straight into the first word instead of
 * a silence while these download.
 */
async function warmSession(type: SessionType, voiceId?: string): Promise<AgentSettings | undefined> {
  restoreGuide();
  if (!hasRemote) return undefined;
  if (Date.now() - (warmedAt[type] ?? 0) > FRESH_MS) {
    await Promise.all([refreshScript(), fetchAgent(type)]);
    warmedAt[type] = Date.now();
  }
  const agent = lastAgent[type];
  applyOpening(type, agent?.firstMessage);
  const opening = [...new Set(ARRIVE[type].flatMap((v) => v.map(([text]) => text)))];
  const out = chooseOutput(voiceId, agent);
  if (out instanceof ElevenLabsSpeechOutput) {
    await out.warm(opening).catch(() => {});
    // The scan follows straight after and is the same words every time: fetched once, then cached.
    const scan = [...SCAN_BRIEF.flat(), ...SCAN_SHORT.flat(), ...SCAN_FULL.flat(), ...SCAN_BODY.flat()].map(([text]) => text);
    void out.warm([...new Set(scan)]).catch(() => {});
  }
  return agent;
}

/** Only voices the app offers; an id saved by an older build counts as no choice. */
function knownVoice(id?: string): string | undefined {
  return GUIDE_VOICES.find((v) => v.id === id)?.id;
}

function chooseOutput(voiceId?: string, agent?: AgentSettings): SpeechOutput {
  // ElevenLabs is the guide's only voice. If it can't be reached the session pauses; it never switches to the phone's voice.
  // The voice is fixed for the output's life, so a session never moves to another cache folder mid-practice;
  // offline, `agent` is the saved one, so the folder is the one the last session filled.
  return new ElevenLabsSpeechOutput({
    apiUrl: config.apiUrl,
    headers: apiHeaders(),
    // A voice chosen in Settings wins; otherwise the session type's agent decides.
    voiceId: voiceId ?? agent?.voiceId ?? config.voiceId,
    settings: agent,
    direction: () => VOICE_DIRECTION,
  });
}

/**
 * The guide's words are edited in server/lib/guideScript.ts and served by the voice server.
 * Fetched at the start of each session; offline or slow, the last script (or the bundled one) is used.
 */
async function refreshScript(): Promise<void> {
  restoreGuide();
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 2500);
    const res = await fetch(`${config.apiUrl.replace(/\/$/, '')}/script`, { headers: apiHeaders(), signal: ctl.signal });
    clearTimeout(t);
    if (!res.ok) return;
    const script: unknown = await res.json();
    const rejected = applyScript(script);
    // Kept whole; applyScript checks it again at the next launch.
    saveScript(script);
    if (__DEV__ && rejected.length) console.warn(`Guide script: kept the bundled words for ${rejected.join(', ')}`);
  } catch {
    // Keep whatever script is already in use.
  }
}

function chooseBrain(pref: string, agent?: AgentSettings): GuideBrain {
  const remote = () => new RemoteGuideBrain({ url: config.apiUrl, headers: apiHeaders(), model: config.guideModel, style: () => agent?.prompt });
  if (__DEV__ && pref === 'local') return new LocalGuideBrain();
  if (__DEV__ && pref === 'claude' && hasRemote) return remote();
  return hasRemote ? remote() : new LocalGuideBrain();
}

/** What a program day (or the Before screen) adds to a session. */
export type StartOptions = {
  theme?: PracticeTheme;
  place?: Place | null;
  programDay?: number;
  /** The sound under this session, chosen on Before. Otherwise the one in Settings. */
  background?: BackgroundPref;
  /** The body scan preset's own scan (SCAN_BODY). */
  scan?: ScanBank;
};

function ambienceFor(pref: BackgroundPref): Ambience | undefined {
  return pref === 'none' ? undefined : new Ambience(pref);
}

export function VoiceSessionProvider({ children }: { children: ReactNode }) {
  const data = useData();
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [error, setError] = useState<VoiceError | undefined>();
  const [pausedBy, setPausedBy] = useState<PauseReason | undefined>();
  const [sessionType, setSessionType] = useState<SessionType | undefined>();
  const [sessionMode, setSessionMode] = useState<SessionMode | undefined>();
  const [completedSessionId, setCompleted] = useState<string | undefined>();
  const [resting, setResting] = useState(false);
  const [labels, setLabels] = useState({ input: '', output: '', brain: '' });
  const [debug, setDebug] = useState<DebugEntry[]>([]);
  const [devInput, setDevInput] = useState<DevTextInput | undefined>();
  const level = useSharedValue(0);
  // A session or the spoken welcome: both pause, resume and end the same way.
  const runner = useRef<SessionRunner | WelcomeRunner | null>(null);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;
  /** A session is being set up (before runner.current exists): the lesson's audio must not be released under it. */
  const starting = useRef(false);
  /** The lesson being read aloud, if one is. */
  const speaking = useRef<AbortController | null>(null);

  const start = useCallback(
    async (type: SessionType, minutes?: SessionLength, voiceId?: string, opts: StartOptions = {}) => {
      if (runner.current) return;
      speaking.current?.abort();
      starting.current = true;
      const prefs = dataRef.current.prefs;
      setError(undefined);
      setCompleted(undefined);
      setResting(false);
      setDebug([]);
      setSessionType(type);
      setStatus('preparing');
      restoreGuide();
      // Usually already warmed from Home. If not, wait briefly, then start with what is known:
      // a slower network should cost a slightly less fresh script, not a silence.
      const chosenVoice = knownVoice(voiceId) ?? knownVoice(prefs.voiceId);
      const agent = await Promise.race([
        warmSession(type, chosenVoice),
        new Promise<AgentSettings | undefined>((r) => setTimeout(() => r(lastAgent[type]), 1500)),
      ]);

      // Guided is the session (12 Oct 2026): it never listens, so it asks for no microphone and
      // needs no model to adapt to answers. The conversation stays reachable for comparison.
      const mode: SessionMode = __DEV__ && prefs.dev.conversation ? 'conversation' : 'guided';
      setSessionMode(mode);
      const input = mode === 'guided' ? new NoInput() : await chooseInput(prefs.dev.inputMode);
      const output = chooseOutput(chosenVoice, agent);
      const brain = mode === 'guided' ? new LocalGuideBrain() : chooseBrain(prefs.dev.brain, agent);
      setLabels({ input: input.label, output: output.label, brain: brain.id });
      setDevInput(input instanceof DevTextInput ? input : undefined);

      if (!(await input.isAvailable())) {
        starting.current = false;
        setStatus('unavailable');
        setError({ code: 'unavailable', message: 'Speech recognition is not available on this device.' });
        return;
      }
      if (!(await input.requestPermission())) {
        starting.current = false;
        setStatus('unavailable');
        setError({ code: 'permission', message: 'Attend needs the microphone and speech recognition to hear you.' });
        return;
      }

      // Earlier sessions shape this one (where to start, which words): read fresh from the device each time.
      const memory = buildMemory(dataRef.current.sessions);
      // Where a guided session rests: the latest check-in that named one place, else where
      // earlier sessions usually went, else the body as a whole.
      const usual = memory.usual;
      // A place chosen on the Before screen wins; null there means "the whole body".
      const place: Place | undefined =
        opts.place === null
          ? undefined
          : (opts.place ??
            latestPlace(dataRef.current.checkIns) ??
            prefs.place ??
            (usual && usual.region !== 'whole_body' ? { region: usual.region, side: usual.side } : undefined));
      const engine = new SessionEngine({
        sessionType: type,
        minutes,
        memory,
        mode,
        place,
        theme: opts.theme,
        programDay: opts.programDay,
        scan: opts.scan,
        keepTranscript: __DEV__ && prefs.dev.keepTranscripts,
      });
      // Before sleep, the practice ends in rest: the phone may lock (no keep-awake), nothing
      // buzzes, and the sound carries on after the voice (the hand-over after run()).
      const sleepy = type === 'sleep';
      // A sound playing on its own (Just listen) gives way to the session's.
      stopListening(600, true);
      const ambience = ambienceFor(opts.background ?? backgroundFor(prefs));
      const keepAlive = mode === 'guided' ? new KeepAlive() : undefined;
      const r = new SessionRunner({
        engine,
        brain,
        voice: { input, output },
        contextualStrings: CONTEXTUAL_STRINGS,
        onState: (s) => {
          setStatus(s.status);
          setPausedBy(s.pausedBy);
          // The voice failed, not the person: the room stays as it was (at the silences' level)
          // instead of fading to nothing, while the screen says what happened.
          // Sleep: the voice going quiet at the end is not the room going quiet; the sound stays at
          // the silences' level until it is handed to Just listen below.
          ambience?.follow((s.status === 'paused' && s.pausedBy === 'error') || (sleepy && s.status === 'complete') ? 'holding' : s.status);
          if (s.status === 'speaking' || s.status === 'holding' || s.status === 'listening') keepAlive?.start();
          else if (s.status === 'paused') keepAlive?.pause();
          if (s.error) setError(s.error);
        },
        onLevel: (l) => {
          ambience?.hear(l);
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
      starting.current = false;
      if (!sleepy) activateKeepAwakeAsync('attend-session').catch(() => {});
      /** The sound went on as a listen: it owns the audio session now, and releasing it would silence it. */
      let handedOver = false;

      try {
        const { session, moments } = await r.run();
        // A sleep practice that ran to its end (not one the person ended: they are awake, and
        // After is where they asked to go). Only guided minutes are recorded: the session is
        // already final, the sound's tail is not part of it.
        const after = afterPractice(type, session.outcome, opts.background ?? backgroundFor(prefs));
        if (after.rest) {
          setResting(true);
          if (after.sound) {
            await startListening(after.sound, SLEEP_TAIL_MINUTES).catch(() => {});
            handedOver = true;
          }
        }
        // Whether the session is kept at all (a few seconds opened by mistake is not); the day's
        // own rule is dayCompleted.
        const meaningful =
          session.outcome !== 'ended_early' || session.bodyMapEnd.sensations.length > 0 || session.endedAt - session.startedAt > 90_000;
        if (draftTimer.current) clearTimeout(draftTimer.current);
        if (meaningful) {
          await dataRef.current.saveSession(session, moments);
          // A program day is done when its practice ran its course or had three active minutes
          // (dayCompleted), on the local day the practice began (completePractice).
          if (opts.programDay) {
            const program = dataRef.current.prefs.program ?? EMPTY_PROGRAM;
            const next = completePractice(program, opts.programDay, session, (at) => dayKey(at, currentTz(new Date(at))));
            if (next !== program) await dataRef.current.setPrefs({ program: next });
          }
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
        starting.current = false;
        if (!sleepy) deactivateKeepAwake('attend-session');
        input.dispose();
        output.dispose();
        // The listen is already playing (it keeps the app alive with the phone locked), so the
        // silent keep-alive can go; the session's sound fades out under the listen's fade-in.
        keepAlive?.stop();
        ambience?.stop(handedOver ? SLEEP_HANDOVER_FADE_MS : undefined);
        // After the tone's fade-out: releasing the audio session stops every player at once.
        // Skipped if another session has started by then, or the listen has the audio (it lets
        // go itself when its timer ends).
        if (!handedOver)
          setTimeout(() => {
            if (!runner.current && !starting.current && !speaking.current) endSessionAudio().catch(() => {});
          }, ambience ? 1400 : 0);
        level.value = 0;
      }
    },
    [level],
  );

  const startWelcome = useCallback(async (): Promise<WelcomeResult> => {
    if (runner.current) return { answers: {}, ended: true };
    const prefs = dataRef.current.prefs;
    setError(undefined);
    setDebug([]);
    setStatus('preparing');
    const input = await chooseInput(prefs.dev.inputMode);
    setDevInput(input instanceof DevTextInput ? input : undefined);
    if (!hasRemote || !(await input.isAvailable())) {
      setStatus('idle');
      return { answers: {}, ended: true, error: { code: 'unavailable', message: 'Listening isn’t available here.' } };
    }
    if (!(await input.requestPermission())) {
      setStatus('idle');
      return { answers: {}, ended: true, error: { code: 'permission', message: 'Microphone or speech recognition not allowed.' } };
    }
    const welcomeVoice = GUIDE_VOICES[0];
    stopListening(600, true);
    const ambience = ambienceFor(backgroundFor(prefs));
    const r = new WelcomeRunner({
      input,
      outputFor: (voiceId) => chooseOutput(voiceId),
      welcomeVoice,
      voices: GUIDE_VOICES,
      onState: (s) => {
        setStatus(s.status);
        setPausedBy(s.pausedBy);
        ambience?.follow(s.status);
      },
      onLevel: (l) => {
        ambience?.hear(l);
        level.value = withTiming(l, { duration: 160 });
      },
      onDebug: __DEV__ ? (e) => setDebug((prev) => [...prev.slice(-80), { ...e, at: Date.now() }]) : undefined,
    });
    runner.current = r;
    activateKeepAwakeAsync('attend-session').catch(() => {});
    try {
      return await r.run();
    } finally {
      runner.current = null;
      deactivateKeepAwake('attend-session');
      input.dispose();
      ambience?.stop();
      setTimeout(() => {
        if (!runner.current) endSessionAudio().catch(() => {});
      }, ambience ? 1400 : 0);
      level.value = 0;
      setStatus('idle');
    }
  }, [level]);

  useEffect(() => {
    restoreGuide();
  }, []);

  // A guided session goes on when the phone locks or the app is left: it needs nothing from the
  // screen, and pausing there stopped the practice of anyone who locked the phone to lie down
  // (background audio is on: app.json UIBackgroundModes, keepAlive.ts). A conversation, or the
  // spoken welcome, listens, and iOS gives a backgrounded app no microphone: those pause.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'background') return;
      const r = runner.current;
      if (r instanceof SessionRunner && r.engine.mode === 'guided') return;
      r?.pause('background');
    });
    return () => sub.remove();
  }, []);

  const warm = useCallback((type: SessionType, voiceId?: string) => {
    void warmSession(type, knownVoice(voiceId) ?? knownVoice(dataRef.current.prefs.voiceId)).catch(() => {});
  }, []);

  const speakLines = useCallback(async (lines: SpokenLine[], o: SpeakLinesOptions = {}): Promise<SpeakLinesResult> => {
    if (runner.current || starting.current || speaking.current) return 'failed';
    const ctl = new AbortController();
    speaking.current = ctl;
    const type = o.type ?? 'notice';
    // The practice's voice, chosen the same way start() chooses it, so the lesson and the
    // practice after it are one voice and fill one cache folder.
    const voice = knownVoice(o.voiceId) ?? knownVoice(dataRef.current.prefs.voiceId);
    // Also warms the practice's opening and scan, which follow straight after.
    const agent = await Promise.race([
      warmSession(type, voice),
      new Promise<AgentSettings | undefined>((r) => setTimeout(() => r(lastAgent[type]), 1500)),
    ]).catch(() => lastAgent[type]);
    const output = chooseOutput(voice, agent);
    const keepAlive = new KeepAlive();
    try {
      if (ctl.signal.aborted) return 'stopped';
      if (!(await output.isAvailable())) return 'failed';
      stopListening(600, true);
      await Promise.race([output.begin?.(), sleep(2500)]).catch(() => {});
      // Every line of the lesson at once, so the silences are the lesson's, not the network's.
      if (output instanceof ElevenLabsSpeechOutput) void output.warm(lines.map(([t]) => t)).catch(() => {});
      activateKeepAwakeAsync('attend-lesson').catch(() => {});
      // A lesson heard with the phone locked: silences longer than a breath would let iOS suspend the app.
      keepAlive.start();
      for (const [text, pauseMs] of lines) {
        if (ctl.signal.aborted) return 'stopped';
        o.onState?.('speaking');
        await output.speak(text, ctl.signal);
        if (ctl.signal.aborted) return 'stopped';
        o.onState?.('holding');
        await sleep(pauseMs, ctl.signal);
      }
      return ctl.signal.aborted ? 'stopped' : 'done';
    } catch {
      return ctl.signal.aborted ? 'stopped' : 'failed';
    } finally {
      speaking.current = null;
      output.dispose();
      keepAlive.stop();
      deactivateKeepAwake('attend-lesson');
      // A finished lesson flows into the practice, which takes the audio session over; only if
      // nothing follows is it released, so other apps' sound can come back.
      setTimeout(() => {
        if (!runner.current && !starting.current && !speaking.current) endSessionAudio().catch(() => {});
      }, 3000);
    }
  }, []);

  const stopSpeaking = useCallback(() => speaking.current?.abort(), []);

  const value = useMemo<VoiceSessionValue>(
    () => ({
      status,
      error,
      pausedBy,
      sessionType,
      sessionMode,
      completedSessionId,
      resting,
      activeMs: () => runner.current?.activeMs ?? 0,
      level,
      labels,
      debug,
      devInput,
      start,
      warm,
      startWelcome,
      speakLines,
      stopSpeaking,
      pause: () => runner.current?.pause('button'),
      resume: () => {
        setError(undefined);
        runner.current?.resume();
      },
      end: () => runner.current?.end(),
      reset: () => {
        setStatus('idle');
        setCompleted(undefined);
        setResting(false);
        setError(undefined);
        setSessionType(undefined);
        setSessionMode(undefined);
      },
    }),
    [status, error, pausedBy, sessionType, sessionMode, completedSessionId, resting, level, labels, debug, devInput, start, warm, startWelcome, speakLines, stopSpeaking],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useVoiceSession(): VoiceSessionValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useVoiceSession outside VoiceSessionProvider');
  return v;
}
