import * as SQLite from 'expo-sqlite';
import type { EngineDraft } from '../engine/SessionEngine';
import { normalizePain, type CheckIn } from '../domain/checkin';
import type { Session, SessionMoment } from '../domain/types';
import { DEFAULT_PREFS, loadPrefs, mergePrefs, type Prefs, type SessionRepository } from './types';

/**
 * SQLite on the device. The schema follows the domain types closely: maps and
 * changes are JSON columns because they are only ever read whole, never
 * queried into.
 */

const SCHEMA_VERSION = 4;

const MIGRATIONS: Record<number, string> = {
  1: `
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY NOT NULL,
      started_at INTEGER NOT NULL,
      ended_at INTEGER NOT NULL,
      session_type TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      one_liner TEXT NOT NULL,
      body_map_start TEXT NOT NULL,
      body_map_end TEXT NOT NULL,
      changes TEXT NOT NULL,
      outcome TEXT NOT NULL,
      signals TEXT NOT NULL,
      is_sample INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_started ON sessions (started_at);
    CREATE TABLE IF NOT EXISTS session_moments (
      id TEXT PRIMARY KEY NOT NULL,
      session_id TEXT NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
      ts INTEGER NOT NULL,
      phase TEXT NOT NULL,
      speaker TEXT NOT NULL,
      body_sensations TEXT NOT NULL,
      internal_transcript TEXT
    );
    CREATE INDEX IF NOT EXISTS moments_session ON session_moments (session_id);
    CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
  `,
  // 12 Oct 2026: guided sessions (mode, place) and Pattern's pain record. Both session columns
  // are nullable: an older row has no mode because it was a conversation, and no place
  // because a conversation found its own.
  2: `
    ALTER TABLE sessions ADD COLUMN mode TEXT;
    ALTER TABLE sessions ADD COLUMN place TEXT;
    CREATE TABLE IF NOT EXISTS check_ins (
      id TEXT PRIMARY KEY NOT NULL,
      at INTEGER NOT NULL,
      tz INTEGER NOT NULL,
      pain INTEGER NOT NULL,
      places TEXT,
      places_skipped INTEGER NOT NULL DEFAULT 0,
      is_sample INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS check_ins_at ON check_ins (at);
  `,
  // 13 Oct 2026: the program. Which day a session was, and how it felt (one tap, optional).
  3: `
    ALTER TABLE sessions ADD COLUMN program_day INTEGER;
    ALTER TABLE sessions ADD COLUMN feeling TEXT;
  `,
  // 18 Oct 2026: practised time, kept on its own so endedAt can become the wall-clock end later.
  // Nullable: older rows were saved with endedAt = start + practised time, which still reads right.
  4: `
    ALTER TABLE sessions ADD COLUMN active_ms INTEGER;
  `,
};

type SessionRow = {
  id: string;
  started_at: number;
  ended_at: number;
  session_type: string;
  title: string;
  summary: string;
  one_liner: string;
  body_map_start: string;
  body_map_end: string;
  changes: string;
  outcome: string;
  signals: string;
  is_sample: number;
  created_at: number;
  mode: string | null;
  place: string | null;
  program_day: number | null;
  feeling: string | null;
  active_ms: number | null;
};

type CheckInRow = {
  id: string;
  at: number;
  tz: number;
  pain: number;
  places: string | null;
  places_skipped: number;
  is_sample: number;
};

function toCheckIn(r: CheckInRow): CheckIn | null {
  const pain = normalizePain(r.pain);
  if (pain === null) return null;
  return {
    id: r.id,
    at: r.at,
    tz: r.tz,
    pain,
    // NULL is "never asked"; '[]' is "asked, nothing chosen". The two must not collapse.
    ...(r.places !== null ? { places: JSON.parse(r.places) } : {}),
    ...(r.places_skipped ? { placesSkipped: true as const } : {}),
    ...(r.is_sample ? { isSample: true } : {}),
  };
}

type MomentRow = {
  id: string;
  session_id: string;
  ts: number;
  phase: string;
  speaker: string;
  body_sensations: string;
  internal_transcript: string | null;
};

function toSession(r: SessionRow): Session {
  return {
    id: r.id,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    sessionType: r.session_type as Session['sessionType'],
    title: r.title,
    summary: r.summary,
    oneLiner: r.one_liner,
    bodyMapStart: JSON.parse(r.body_map_start),
    bodyMapEnd: JSON.parse(r.body_map_end),
    changes: JSON.parse(r.changes),
    outcome: r.outcome as Session['outcome'],
    signals: JSON.parse(r.signals),
    isSample: r.is_sample === 1,
    createdAt: r.created_at,
    ...(r.mode === 'guided' || r.mode === 'conversation' ? { mode: r.mode } : {}),
    ...(r.place ? { place: JSON.parse(r.place) } : {}),
    ...(r.program_day ? { programDay: r.program_day } : {}),
    ...(r.feeling ? { feeling: r.feeling as Session['feeling'] } : {}),
    ...(typeof r.active_ms === 'number' ? { activeMs: r.active_ms } : {}),
  };
}

class SQLiteRepository implements SessionRepository {
  private db?: SQLite.SQLiteDatabase;
  private ready?: Promise<void>;

  init(): Promise<void> {
    this.ready ??= (async () => {
      const db = await SQLite.openDatabaseAsync('attend.db');
      await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
      const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
      let version = row?.user_version ?? 0;
      while (version < SCHEMA_VERSION) {
        version++;
        await db.execAsync(MIGRATIONS[version]);
        await db.execAsync(`PRAGMA user_version = ${version}`);
      }
      this.db = db;
    })();
    return this.ready;
  }

  private async conn(): Promise<SQLite.SQLiteDatabase> {
    await this.init();
    return this.db!;
  }

  async listSessions(): Promise<Session[]> {
    const db = await this.conn();
    const rows = await db.getAllAsync<SessionRow>('SELECT * FROM sessions ORDER BY started_at DESC');
    return rows.map(toSession);
  }

  async getSession(id: string): Promise<Session | null> {
    const db = await this.conn();
    const row = await db.getFirstAsync<SessionRow>('SELECT * FROM sessions WHERE id = ?', id);
    return row ? toSession(row) : null;
  }

  async getMoments(sessionId: string): Promise<SessionMoment[]> {
    const db = await this.conn();
    const rows = await db.getAllAsync<MomentRow>('SELECT * FROM session_moments WHERE session_id = ? ORDER BY ts', sessionId);
    return rows.map((r) => ({
      id: r.id,
      sessionId: r.session_id,
      timestamp: r.ts,
      phase: r.phase,
      speaker: r.speaker as SessionMoment['speaker'],
      bodySensations: JSON.parse(r.body_sensations),
      internalTranscript: r.internal_transcript ?? undefined,
    }));
  }

  async saveSession(s: Session, moments: SessionMoment[]): Promise<void> {
    const db = await this.conn();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT OR REPLACE INTO sessions
          (id, started_at, ended_at, session_type, title, summary, one_liner, body_map_start, body_map_end, changes, outcome, signals, is_sample, created_at, mode, place, program_day, feeling, active_ms)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        s.id,
        s.startedAt,
        s.endedAt,
        s.sessionType,
        s.title,
        s.summary,
        s.oneLiner,
        JSON.stringify(s.bodyMapStart),
        JSON.stringify(s.bodyMapEnd),
        JSON.stringify(s.changes),
        s.outcome,
        JSON.stringify(s.signals),
        s.isSample ? 1 : 0,
        s.createdAt,
        s.mode ?? null,
        s.place ? JSON.stringify(s.place) : null,
        s.programDay ?? null,
        s.feeling ?? null,
        s.activeMs ?? null,
      );
      for (const m of moments) {
        await db.runAsync(
          `INSERT OR REPLACE INTO session_moments (id, session_id, ts, phase, speaker, body_sensations, internal_transcript)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
          m.id,
          s.id,
          m.timestamp,
          m.phase,
          m.speaker,
          JSON.stringify(m.bodySensations),
          m.internalTranscript ?? null,
        );
      }
    });
  }

  async deleteSession(id: string) {
    const db = await this.conn();
    await db.runAsync('DELETE FROM session_moments WHERE session_id = ?', id);
    await db.runAsync('DELETE FROM sessions WHERE id = ?', id);
  }

  async deleteAll() {
    const db = await this.conn();
    await db.execAsync("DELETE FROM session_moments; DELETE FROM sessions; DELETE FROM check_ins; DELETE FROM kv WHERE key = 'draft';");
  }

  async deleteSamples() {
    const db = await this.conn();
    await db.execAsync('DELETE FROM session_moments WHERE session_id IN (SELECT id FROM sessions WHERE is_sample = 1); DELETE FROM sessions WHERE is_sample = 1; DELETE FROM check_ins WHERE is_sample = 1;');
  }

  async setFeeling(sessionId: string, feeling: Session['feeling'] | null): Promise<void> {
    const db = await this.conn();
    await db.runAsync('UPDATE sessions SET feeling = ? WHERE id = ?', feeling ?? null, sessionId);
  }

  async listCheckIns(): Promise<CheckIn[]> {
    const db = await this.conn();
    const rows = await db.getAllAsync<CheckInRow>('SELECT * FROM check_ins ORDER BY at DESC');
    return rows.map(toCheckIn).filter((c): c is CheckIn => c !== null);
  }

  async saveCheckIn(c: CheckIn): Promise<void> {
    const db = await this.conn();
    await db.runAsync(
      'INSERT OR REPLACE INTO check_ins (id, at, tz, pain, places, places_skipped, is_sample) VALUES (?, ?, ?, ?, ?, ?, ?)',
      c.id,
      c.at,
      c.tz,
      c.pain,
      c.places ? JSON.stringify(c.places) : null,
      c.placesSkipped ? 1 : 0,
      c.isSample ? 1 : 0,
    );
  }

  async deleteCheckIn(id: string): Promise<void> {
    const db = await this.conn();
    await db.runAsync('DELETE FROM check_ins WHERE id = ?', id);
  }

  private async getKV<T>(key: string): Promise<T | null> {
    const db = await this.conn();
    const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM kv WHERE key = ?', key);
    return row ? (JSON.parse(row.value) as T) : null;
  }

  private async setKV(key: string, value: unknown) {
    const db = await this.conn();
    await db.runAsync('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', key, JSON.stringify(value));
  }

  async getPrefs(): Promise<Prefs> {
    const stored = await this.getKV<Partial<Prefs>>('prefs');
    return loadPrefs(stored);
  }

  async setPrefs(patch: Partial<Prefs>): Promise<Prefs> {
    const next = mergePrefs(await this.getPrefs(), patch);
    await this.setKV('prefs', next);
    return next;
  }

  async saveDraft(draft: EngineDraft) {
    await this.setKV('draft', draft);
  }

  async getDraft() {
    return this.getKV<EngineDraft>('draft');
  }

  async clearDraft() {
    const db = await this.conn();
    await db.runAsync("DELETE FROM kv WHERE key = 'draft'");
  }
}

export const repository: SessionRepository = new SQLiteRepository();
