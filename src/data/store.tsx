import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { SessionEngine } from '../engine/SessionEngine';
import type { Session, SessionMoment } from '../domain/types';
import { repository } from './repository';
import { buildSampleSessions } from './seed';
import { DEFAULT_PREFS, type Prefs } from './types';

/**
 * The app's view of local storage: the session list and preferences, kept in
 * React state and refreshed after every write. There is no server to sync
 * with, so this is the whole data layer.
 */

type DataStore = {
  ready: boolean;
  sessions: Session[];
  prefs: Prefs;
  hasSamples: boolean;
  refresh(): Promise<void>;
  setPrefs(patch: Partial<Prefs>): Promise<void>;
  saveSession(session: Session, moments: SessionMoment[]): Promise<void>;
  deleteSession(id: string): Promise<void>;
  deleteAll(): Promise<void>;
  deleteSamples(): Promise<void>;
  addSamples(): Promise<void>;
};

const Ctx = createContext<DataStore | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [prefs, setPrefsState] = useState<Prefs>(DEFAULT_PREFS);

  const refresh = useCallback(async () => {
    setSessions(await repository.listSessions());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await repository.init();
      let p = await repository.getPrefs();
      if (!p.samplesSeeded) {
        for (const s of buildSampleSessions()) await repository.saveSession(s, []);
        p = await repository.setPrefs({ samplesSeeded: true });
      }
      // A session interrupted by the app being closed is kept as a shorter session, not lost.
      const draft = await repository.getDraft();
      if (draft && draft.map.current.sensations.length > 0) {
        const { session, moments } = SessionEngine.build({ ...draft, outcome: draft.outcome === 'completed' ? 'ended_early' : draft.outcome }, draft.updatedAt);
        await repository.saveSession(session, moments);
      }
      if (draft) await repository.clearDraft();
      const list = await repository.listSessions();
      if (cancelled) return;
      setPrefsState(p);
      setSessions(list);
      setReady(true);
    })().catch(() => setReady(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<DataStore>(
    () => ({
      ready,
      sessions,
      prefs,
      hasSamples: sessions.some((s) => s.isSample),
      refresh,
      async setPrefs(patch) {
        setPrefsState(await repository.setPrefs(patch));
      },
      async saveSession(session, moments) {
        await repository.saveSession(session, moments);
        await repository.clearDraft();
        await refresh();
      },
      async deleteSession(id) {
        await repository.deleteSession(id);
        await refresh();
      },
      async deleteAll() {
        await repository.deleteAll();
        await refresh();
      },
      async deleteSamples() {
        await repository.deleteSamples();
        await refresh();
      },
      async addSamples() {
        for (const s of buildSampleSessions()) await repository.saveSession(s, []);
        await refresh();
      },
    }),
    [ready, sessions, prefs, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData(): DataStore {
  const v = useContext(Ctx);
  if (!v) throw new Error('useData outside DataProvider');
  return v;
}
