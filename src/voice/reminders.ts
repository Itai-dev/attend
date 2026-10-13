/**
 * The daily reminder (docs/RESEARCH.md §5): one a day at a time the person chose, gentle,
 * and never about missed days. After four quiet days it steps down to once a week, so an
 * app someone has paused doesn't keep tapping them on the shoulder.
 *
 * expo-notifications is a native module. It is required inside try/catch, like the speech
 * module: a build that predates it, or an environment without it, simply has no reminders
 * instead of crashing at launch.
 */

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

/** Plain, warm, never a count. Rotated so the reminder doesn't become wallpaper. */
const DAILY = [
  'A few quiet minutes are ready when you are.',
  'Today’s practice is waiting. Eyes closed, just listen.',
  'Time for a little attention without alarm.',
  'Your next day of the program is here.',
];
const WEEKLY = 'Whenever you’d like to come back, your practice is here.';

export type ReminderSettings = { enabled: boolean; hour: number; minute: number };

/**
 * Replace whatever is scheduled. Called when the setting changes and after every session,
 * so "quiet" is always measured from the latest practice.
 */
export async function scheduleReminders(settings: ReminderSettings | undefined, lastPractice: number | undefined): Promise<void> {
  const n = notifications();
  if (!n) return;
  try {
    await n.cancelAllScheduledNotificationsAsync();
    if (!settings?.enabled) return;
    const quiet = lastPractice !== undefined && Date.now() - lastPractice > 4 * 86_400_000;
    if (quiet) {
      await n.scheduleNotificationAsync({
        content: { title: 'Attend', body: WEEKLY },
        trigger: { type: n.SchedulableTriggerInputTypes.WEEKLY, weekday: ((new Date().getDay() + 2) % 7) + 1, hour: settings.hour, minute: settings.minute },
      });
      return;
    }
    await n.scheduleNotificationAsync({
      content: { title: 'Attend', body: DAILY[new Date().getDate() % DAILY.length] },
      trigger: { type: n.SchedulableTriggerInputTypes.DAILY, hour: settings.hour, minute: settings.minute },
    });
  } catch {
    // A reminder that can't be scheduled is not worth an error on screen.
  }
}
