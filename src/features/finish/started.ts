import type { Session, SessionType } from '@/domain/types';

/**
 * What the last practice was started as, kept in memory between the tap and the finish. A saved
 * session knows its type and program day but not that it was the body scan, and the completion
 * moment names it ("body scan · done"). Lost on a restart, which only means the finish falls back
 * to the session's type ("practice · done"): nothing is stored, so nothing new leaves the phone.
 */
type Started = { at: number; type: SessionType; day?: number; scan?: boolean };

let last: Started | undefined;

export function noteStart(plan: { type: SessionType; day?: number; scan?: string }) {
  last = { at: Date.now(), type: plan.type, day: plan.day, scan: plan.scan === 'body' };
}

/** The remembered start, if it is this session's: same type and day, begun within a few minutes of the tap. */
export function startedAs(session: Session): Started | undefined {
  if (!last) return undefined;
  const near = session.startedAt >= last.at - 60_000 && session.startedAt - last.at < 15 * 60_000;
  return near && last.type === session.sessionType && (last.day ?? 0) === (session.programDay ?? 0) ? last : undefined;
}
