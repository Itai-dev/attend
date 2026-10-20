/**
 * The daily reminder (docs/RESEARCH.md §5): one a day at a time the person chose, gentle,
 * and never about missed days. After four quiet days it steps down to once a week, so an
 * app someone has paused doesn't keep tapping them on the shoulder. What to schedule, and
 * every word of it, is decided in domain/reminderPlan.ts; this file only hands it to the OS.
 *
 * expo-notifications is a native module. It is required inside try/catch, like the speech
 * module: a build that predates it, or an environment without it, simply has no reminders
 * instead of crashing at launch.
 */

import { currentTz } from '../domain/checkin';
import { EMPTY_PROGRAM, type ProgramState } from '../domain/program';
import { planReminders } from '../domain/reminderPlan';

type NotificationsModule = typeof import('expo-notifications');

let cached: NotificationsModule | null | undefined;

function notifications(): NotificationsModule | null {
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('expo-notifications') as NotificationsModule;
  } catch {
    cached = null;
  }
  return cached;
}

export function remindersAvailable(): boolean {
  return notifications() !== null;
}

/** Ask once, when the person turns the reminder on. Resolves false if refused or unavailable. */
export async function requestReminderPermission(): Promise<boolean> {
  const n = notifications();
  if (!n) return false;
  try {
    const current = await n.getPermissionsAsync();
    if (current.granted) return true;
    const asked = await n.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: false, allowBadge: false } });
    return asked.granted;
  } catch {
    return false;
  }
}

export type ReminderSettings = { enabled: boolean; hour: number; minute: number };

/** One identifier per date: scheduling the same day twice replaces it instead of doubling it. */
const PREFIX = 'attend-reminder:';

/** The plan last handed to the OS, so a re-render that changes nothing doesn't churn the queue. */
let scheduled: string | undefined;
/** Calls run one after another: two overlapping cancel-then-schedule runs would double the queue. */
let queue: Promise<void> = Promise.resolve();

/**
 * Replace whatever is scheduled with dated one-offs (domain/reminderPlan.ts): a reminder on each
 * of the four days after the latest practice, skipping a day already practiced, then weekly, so
 * the step-down happens even if the app is never opened again. Called when the setting changes
 * and whenever Today sees a new practice; calling it again with the same inputs is a no-op.
 *
 * `program` gives the day number and whether today is done. Callers that don't have it yet
 * (an older call site) still get the cadence, with day 1's copy.
 */
export function scheduleReminders(settings: ReminderSettings | undefined, lastPractice: number | undefined, program: ProgramState = EMPTY_PROGRAM): Promise<void> {
  const run = queue.then(() => replace(settings, lastPractice, program));
  queue = run.catch(() => {});
  return run;
}

async function replace(settings: ReminderSettings | undefined, lastPractice: number | undefined, program: ProgramState): Promise<void> {
  const n = notifications();
  if (!n) return;
  try {
    const plan = settings?.enabled ? planReminders({ hour: settings.hour, minute: settings.minute, now: Date.now(), tz: currentTz(), program, lastPractice }) : [];
    const signature = JSON.stringify(plan);
    if (signature === scheduled) return;
    scheduled = undefined;
    // Everything the app schedules is a reminder. Cancelling all of it also clears the
    // repeating daily trigger that installs from before dated reminders still hold.
    await n.cancelAllScheduledNotificationsAsync();
    for (const r of plan) {
      const [y, m, d] = r.date.split('-').map(Number);
      // Built from local calendar parts, so a reminder set for 20:30 stays 20:30 across a DST change.
      const date = new Date(y, m - 1, d, r.hour, r.minute);
      if (date.getTime() <= Date.now()) continue;
      await n.scheduleNotificationAsync({
        identifier: `${PREFIX}${r.date}`,
        content: r.title ? { title: r.title, body: r.body } : { body: r.body },
        trigger: { type: n.SchedulableTriggerInputTypes.DATE, date },
      });
    }
    scheduled = signature;
  } catch {
    // A reminder that can't be scheduled is not worth an error on screen.
  }
}
