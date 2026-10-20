/**
 * The session's quiet clock (20 Oct 2026: "a timer in the session"): how much practice is left,
 * as a thin ring that fills around the form and a small "6:12" under the status word.
 *
 * Counted from the engine's own clock, which leaves pauses out, against the engine's planned
 * length. Nothing here is about pain or how the practice went; it answers "how long is left".
 *
 * At the end of the plan the number goes rather than reading "0:00": the close can run a little
 * past the plan, and a clock at zero with the guide still speaking reads as something gone wrong
 * (round 5). The ring is full by then, which says the same thing without a number.
 */

/** Practice time left, never below zero. 0 when there is no plan. */
export function remainingMs(targetMs: number, activeMs: number): number {
  if (!(targetMs > 0)) return 0;
  return Math.max(0, targetMs - Math.max(0, activeMs));
}

/** How much of the plan has been practised, 0..1: the ring. */
export function clockProgress(targetMs: number, activeMs: number): number {
  if (!(targetMs > 0)) return 0;
  const p = Math.max(0, activeMs) / targetMs;
  return p >= 1 ? 1 : p;
}

/** "6:12", "0:45", "10:00". Rounded up to the second, so a five-minute practice opens on "5:00". */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

/** What the clock shows, or undefined (no plan yet, or the plan has run out: the close is under way). */
export function clockText(targetMs: number, activeMs: number): string | undefined {
  if (!(targetMs > 0)) return undefined;
  const left = remainingMs(targetMs, activeMs);
  return left > 0 ? formatClock(left) : undefined;
}

/** What VoiceOver reads for the clock: "6 minutes 12 seconds left", "45 seconds left", "1 minute left". */
export function clockSpoken(targetMs: number, activeMs: number): string | undefined {
  if (!(targetMs > 0)) return undefined;
  const left = remainingMs(targetMs, activeMs);
  if (left <= 0) return undefined;
  const total = Math.ceil(left / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  const min = m ? `${m} minute${m === 1 ? '' : 's'}` : '';
  const sec = s ? `${s} second${s === 1 ? '' : 's'}` : '';
  return `${[min, sec].filter(Boolean).join(' ')} left`;
}
