import type { EngineDraft } from '../engine/SessionEngine';
import type { CheckIn } from '../domain/checkin';
import type { Moment } from '../domain/engagement';
import type { ProgramState } from '../domain/program';
import type { Place, SessionFeeling } from '../domain/types';
import type { Session, SessionMoment, SessionType } from '../domain/types';

/**
 * Local-first storage. No account, no server: sessions live on this device
 * and nowhere else. Raw audio is never stored. Transcripts are not stored
 * either, unless a developer turns that on for debugging.
 */
export interface SessionRepository {
  init(): Promise<void>;
  listSessions(): Promise<Session[]>;
  getSession(id: string): Promise<Session | null>;
  getMoments(sessionId: string): Promise<SessionMoment[]>;
  saveSession(session: Session, moments: SessionMoment[]): Promise<void>;
  deleteSession(id: string): Promise<void>;
  deleteAll(): Promise<void>;
  deleteSamples(): Promise<void>;

  /** The pain record (from Pattern). Newest first. */
  listCheckIns(): Promise<CheckIn[]>;
  saveCheckIn(c: CheckIn): Promise<void>;
  deleteCheckIn(id: string): Promise<void>;

  /** How a session felt, tapped after it. Never a pain value. */
  setFeeling(sessionId: string, feeling: SessionFeeling | null): Promise<void>;

  getPrefs(): Promise<Prefs>;
  setPrefs(patch: Partial<Prefs>): Promise<Prefs>;

  /** An in-progress session, so a killed app does not lose what was noticed. */
  saveDraft(draft: EngineDraft): Promise<void>;
  getDraft(): Promise<EngineDraft | null>;
  clearDraft(): Promise<void>;
}

export type VoiceOutputPref = 'natural' | 'system';
export type InputModePref = 'auto' | 'on-device' | 'simulated' | 'dev-text';
export type BrainPref = 'auto' | 'local' | 'claude';

export type Prefs = {
  onboarded: boolean;
  /** What the person likes to be called: the third tab carries it. Asked in the welcome; optional. */
  name?: string;
  samplesSeeded: boolean;
  voiceOutput: VoiceOutputPref;
  /**
   * Older builds saved whichever voice a program day started with, chosen or not. No longer
   * read: each session type has its own voice (SESSION_VOICES), and `voices` holds the person's
   * own picks.
   */
  voiceId?: string;
  /** A voice the person picked on the Before screen, per session type. */
  voices?: Partial<Record<SessionType, string>>;
  /** What the person said brings them here, in the welcome. Shapes the session Today offers. */
  focus?: SessionType;
  /** Last length picked on Home, offered again next time. */
  sessionMinutes?: 3 | 5 | 7 | 10;
  /** The 28-day program: which days are done, which lessons read. */
  program?: ProgramState;
  /** What the person wants to get back to, from onboarding, in their words or a chip's. */
  goal?: string;
  /** Where it hurts most, from onboarding: where sessions rest until a check-in names a place. */
  place?: Place;
  /** How long the pain has been there, from onboarding. Context only; nothing is derived from it. */
  painFor?: 'months' | '1-3y' | '3-10y' | '10y+';
  /** The daily reminder, at a time the person chose. */
  reminder?: { enabled: boolean; hour: number; minute: number };
  /** Steps toward the goal, saved by the person. Newest first. Small, so kept with the prefs. */
  moments?: Moment[];
  /** The soft tone under the session. On unless turned off in Settings. */
  ambience?: boolean;
  /** Developer settings. Ignored outside development builds. */
  dev: {
    inputMode: InputModePref;
    brain: BrainPref;
    panel: boolean;
    keepTranscripts: boolean;
    /** Run the old conversational session (the guide asks and listens) instead of guided. */
    conversation?: boolean;
  };
};

export const DEFAULT_PREFS: Prefs = {
  onboarded: false,
  samplesSeeded: false,
  voiceOutput: 'natural',
  dev: { inputMode: 'auto', brain: 'auto', panel: false, keepTranscripts: false },
};

export function mergePrefs(base: Prefs, patch: Partial<Prefs>): Prefs {
  return { ...base, ...patch, dev: { ...base.dev, ...(patch.dev ?? {}) } };
}
