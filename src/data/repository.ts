import * as SQLite from 'expo-sqlite';
import type { EngineDraft } from '../engine/SessionEngine';
import type { Session, SessionMoment } from '../domain/types';
import { DEFAULT_PREFS, mergePrefs, type Prefs, type SessionRepository } from './types';

/**
 * SQLite on the device. The schema follows the domain types closely: maps and
 * changes are JSON columns because they are only ever read whole, never
 * queried into.
 */

const SCHEMA_VERSION = 1;

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
};

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
          (id, started_at, ended_at, session_type, title, summary, one_liner, body_map_start, body_map_end, changes, outcome, signals, is_sample, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    await db.execAsync("DELETE FROM session_moments; DELETE FROM sessions; DELETE FROM kv WHERE key = 'draft';");
  }

  async deleteSamples() {
    const db = await this.conn();
    await db.execAsync('DELETE FROM session_moments WHERE session_id IN (SELECT id FROM sessions WHERE is_sample = 1); DELETE FROM sessions WHERE is_sample = 1;');
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
    return mergePrefs(DEFAULT_PREFS, stored ?? {});
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
