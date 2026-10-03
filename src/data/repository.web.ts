import type { EngineDraft } from '../engine/SessionEngine';
import type { Session, SessionMoment } from '../domain/types';
import { DEFAULT_PREFS, mergePrefs, type Prefs, type SessionRepository } from './types';

/**
 * Web build only (used for design review and screenshots): the same
 * interface over localStorage. expo-sqlite on web needs cross-origin
 * isolation headers, which a static preview cannot promise.
 */

const KEY = 'attend:v1';

type Store = {
  sessions: Session[];
  moments: Record<string, SessionMoment[]>;
  prefs: Prefs;
  draft: EngineDraft | null;
};

function load(): Store {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Store;
      return { ...s, prefs: mergePrefs(DEFAULT_PREFS, s.prefs ?? {}) };
    }
  } catch {}
  return { sessions: [], moments: {}, prefs: DEFAULT_PREFS, draft: null };
}

class WebRepository implements SessionRepository {
  private s: Store = load();

  private save() {
    try {
      globalThis.localStorage?.setItem(KEY, JSON.stringify(this.s));
    } catch {}
  }

  async init() {}

  async listSessions() {
    return [...this.s.sessions].sort((a, b) => b.startedAt - a.startedAt);
  }

  async getSession(id: string) {
    return this.s.sessions.find((x) => x.id === id) ?? null;
  }

  async getMoments(sessionId: string) {
    return this.s.moments[sessionId] ?? [];
  }

  async saveSession(session: Session, moments: SessionMoment[]) {
    this.s.sessions = [...this.s.sessions.filter((x) => x.id !== session.id), session];
    this.s.moments[session.id] = moments;
    this.save();
  }

  async deleteSession(id: string) {
    this.s.sessions = this.s.sessions.filter((x) => x.id !== id);
    delete this.s.moments[id];
    this.save();
  }

  async deleteAll() {
    this.s.sessions = [];
    this.s.moments = {};
    this.s.draft = null;
    this.save();
  }

  async deleteSamples() {
    const keep = this.s.sessions.filter((x) => !x.isSample);
    for (const x of this.s.sessions) if (x.isSample) delete this.s.moments[x.id];
    this.s.sessions = keep;
    this.save();
  }

  async getPrefs() {
    return this.s.prefs;
  }

  async setPrefs(patch: Partial<Prefs>) {
    this.s.prefs = mergePrefs(this.s.prefs, patch);
    this.save();
    return this.s.prefs;
  }

  async saveDraft(draft: EngineDraft) {
    this.s.draft = draft;
    this.save();
  }

  async getDraft() {
    return this.s.draft;
  }

  async clearDraft() {
    this.s.draft = null;
    this.save();
  }
}

export const repository: SessionRepository = new WebRepository();
