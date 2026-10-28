/**
 * The app's language: English or Hebrew (27 Oct 2026).
 *
 * Plain module state, free of React and Expo, so domain/ and engine/ can use it in Node
 * tests. It is set once at launch (src/i18n/device.ts, imported first by index.js) from the
 * language iOS gives the app: the phone's own, or the one picked for Attend alone under
 * Settings → Attend → Language. iOS restarts the app when that changes, and lays it out
 * right to left in Hebrew, so nothing here ever changes while the app is running.
 *
 * Hebrew copy follows docs/HEBREW.md: gender-neutral (plural address, infinitive buttons).
 */
export type Lang = 'en' | 'he';

let current: Lang = 'en';

export function lang(): Lang {
  return current;
}

export function setLang(l: Lang) {
  current = l;
}

export function isHe(): boolean {
  return current === 'he';
}

/** The text for the app's language. Called at render or call time, never at module load. */
export function tr<T>(en: T, he: T): T {
  return current === 'he' ? he : en;
}

/** Hebrew counts: "יום אחד", "2 ימים". `one` is the full singular phrase; `many` takes the number. */
export function heCount(n: number, one: string, many: string, two?: string): string {
  if (n === 1) return one;
  if (n === 2 && two) return two;
  return `${n} ${many}`;
}
