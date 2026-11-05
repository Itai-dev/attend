import { isHe } from '../../i18n';

/**
 * Dates and times for the screens, in the app's language. Hebrew names come from our own
 * tables, not Intl: Hermes ships without full Hebrew locale data on older builds, and a date
 * that silently fell back to English would sit oddly in a right-to-left sentence.
 */

type Part = 'morning' | 'afternoon' | 'evening' | 'night';

function part(ts: number): Part {
  const h = new Date(ts).getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 22) return 'evening';
  return 'night';
}

const PART_EN: Record<Part, string> = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', night: 'Night' };
const PART_HE: Record<Part, string> = { morning: 'בוקר', afternoon: 'אחר הצהריים', evening: 'ערב', night: 'לילה' };

export function partOfDay(ts: number): string {
  return (isHe() ? PART_HE : PART_EN)[part(ts)];
}

const DAY = 86_400_000;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** Short Hebrew months, as iOS writes them: "13 באוק׳". */
const HE_MONTHS = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳'];
/** Full Hebrew months, for "since 13 באוקטובר". */
const HE_MONTHS_LONG = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
const HE_WEEKDAYS = ['יום א׳', 'יום ב׳', 'יום ג׳', 'יום ד׳', 'יום ה׳', 'יום ו׳', 'שבת'];

export function dayLabel(ts: number, now = Date.now()): string {
  const d = new Date(ts);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - new Date(d).setHours(0, 0, 0, 0)) / DAY);
  if (isHe()) {
    if (diff === 0) return 'היום';
    if (diff === 1) return 'אתמול';
    return `${HE_WEEKDAYS[d.getDay()]}, ${d.getDate()} ב${HE_MONTHS[d.getMonth()]}`;
  }
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function sessionDate(ts: number): string {
  return `${dayLabel(ts)} · ${partOfDay(ts)}`;
}

export function shortDate(ts: number): string {
  const d = new Date(ts);
  if (isHe()) return `${d.getDate()} ב${HE_MONTHS[d.getMonth()]}`;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** A day and the full month: "13 באוקטובר". English keeps the platform's own long date. */
export function longDate(ts: number): string {
  const d = new Date(ts);
  if (isHe()) return `${d.getDate()} ב${HE_MONTHS_LONG[d.getMonth()]}`;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
}

export function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const GREETING_HE: Record<Part, string> = {
  morning: 'בוקר טוב.',
  afternoon: 'צהריים טובים.',
  evening: 'ערב טוב.',
  // "לילה טוב" is a goodbye in Hebrew; at night the app still greets.
  night: 'ערב טוב.',
};

export function greeting(now = Date.now()): string {
  const p = part(now);
  if (isHe()) return GREETING_HE[p];
  return p === 'night' ? 'Good evening.' : `Good ${p}.`;
}
