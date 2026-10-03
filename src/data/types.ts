import type { EngineDraft } from '../engine/SessionEngine';
import type { Session, SessionMoment } from '../domain/types';

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
  samplesSeeded: boolean;
  voiceOutput: VoiceOutputPref;
  voiceId?: string;
  /** Developer settings. Ignored outside development builds. */
  dev: {
    inputMode: InputModePref;
    brain: BrainPref;
    panel: boolean;
    keepTranscripts: boolean;
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
