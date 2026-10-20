import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { GUIDE_SCRIPT } from '../server/lib/guideScript';
import { loadPrefs } from '../src/data/types';
import { FORBIDDEN_GUIDE_LANGUAGE } from '../src/domain/safety';
import { PRESETS, presetTheme } from '../src/domain/presets';
import { PROGRAM, type PracticeTheme } from '../src/domain/program';
import type { SessionType } from '../src/domain/types';
import {
  afterPractice,
  backgroundFor,
  backgroundLabel,
  DEFAULT_BACKGROUND,
  migrateBackground,
  migrateListenId,
  migrateSoundPrefs,
  resolveBackground,
  soundForPractice,
  soundscape,
  listenLevel,
  listenVolumeAt,
  LISTEN_FADE_IN_MS,
  SOUNDSCAPES,
  UNDER_VOICE,
  VOICE_LUFS,
  volumeFor,
  timerLabel,
} from '../src/domain/soundscapes';

const MIN = 60_000;

const ROOT = join(__dirname, '..');

/** Code without its comments: a comment may say how to bring a file back; only code bundles it. */
function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? sourceFiles(join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [join(dir, e.name)] : [],
  );
}

test('every sound has its audio file (AAC: the app makes the loop, voice/crossfadeLoop.ts)', () => {
  for (const s of SOUNDSCAPES) {
    const file = `assets/audio/tones/${s.id}.m4a`;
    assert.ok(existsSync(join(ROOT, file)), `${s.id}: ${file}`);
  }
});

test('the nature recordings are paused: kept on disk with their credits, never bundled', () => {
  // 20 Oct 2026: "for now, replace the nature sounds with soft tones". Nothing requires them,
  // so they stay out of the app; the files and SOURCES.md stay so they can come back.
  for (const f of sourceFiles(join(ROOT, 'src'))) {
    const code = stripComments(readFileSync(f, 'utf8'));
    assert.doesNotMatch(code, /require\([^)]*audio\/soundscapes\//, f);
    assert.doesNotMatch(code, /require\([^)]*tone-432/, f);
  }
  for (const f of ['SOURCES.md', 'rain.m4a', 'forest.m4a', 'stream.m4a', 'waterfall.m4a', 'ocean.m4a', 'night.m4a', 'fire.m4a']) {
    assert.ok(existsSync(join(ROOT, 'assets/audio/soundscapes', f)), f);
  }
  assert.match(readFileSync(join(ROOT, 'assets/audio/soundscapes/SOURCES.md'), 'utf8'), /Paused \(20 Oct 2026\)/);
});

test('the sounds are six tones, deep to bright, each named by its number', () => {
  assert.deepEqual(
    SOUNDSCAPES.map((s) => s.id),
    ['hz174', 'hz285', 'hz396', 'hz432', 'hz528', 'hz639'],
  );
  for (const s of SOUNDSCAPES) {
    // The name is the pitch and its unit, as written: "432 Hz", never "432 hz".
    assert.equal(s.name, `${s.id.slice(2)} Hz`);
  }
  assert.equal(soundscape('hz174')!.line, 'The deepest: a low hum');
  assert.equal(soundscape('hz639')!.line, 'The brightest: clear and light');
  assert.equal(DEFAULT_BACKGROUND, 'hz432');
});

test('the sound under sessions: matched unless chosen, an explicit choice wins, and a tone turned off stays off', () => {
  // 20 Oct 2026: someone who never chose gets a sound matched to each practice.
  assert.equal(backgroundFor({}), 'matched');
  assert.equal(backgroundFor({ ambience: true }), 'matched');
  assert.equal(backgroundFor({ ambience: false }), 'none');
  assert.equal(backgroundFor({ ambience: false, background: 'hz528' }), 'hz528');
  assert.equal(backgroundFor({ background: 'none' }), 'none');
  assert.equal(backgroundFor({ background: 'matched' }), 'matched');
  // Something stored by a later build that this one doesn't know falls back, not to silence-by-accident.
  assert.equal(backgroundFor({ background: 'birdsong' as never }), 'matched');
});

const THEMES: PracticeTheme[] = ['settle', 'locate', 'breath', 'edges', 'moves', 'texture', 'curious', 'brace', 'fear', 'urge', 'kind', 'pleasant', 'activity', 'flare', 'open'];
const TYPES: SessionType[] = ['notice', 'flare', 'sleep', 'fear'];

test('every practice is matched to a real sound, and 639 Hz is only ever chosen', () => {
  const matched = [
    ...THEMES.map((theme) => soundForPractice({ theme })),
    ...TYPES.map((type) => soundForPractice({ type })),
    ...PROGRAM.map((d) => soundForPractice({ type: d.practice.sessionType, theme: d.practice.theme })),
    ...PRESETS.map((p) => soundForPractice({ type: p.type, theme: presetTheme(p) })),
  ];
  for (const id of matched) assert.ok(soundscape(id), id);
  assert.ok(!matched.includes('hz639'));
  // Nothing known about the practice: the middle tone.
  assert.equal(soundForPractice(), 'hz432');
  assert.equal(soundForPractice({ theme: 'unknown' as never }), 'hz432');
});

test('matched, by ear: deepest for sleep, low and warm for a flare and settling, brighter for what is pleasant', () => {
  assert.equal(soundForPractice({ type: 'sleep' }), 'hz174');
  assert.equal(soundForPractice({ type: 'sleep', theme: 'open' }), 'hz174'); // the type speaks first
  assert.equal(soundForPractice({ type: 'flare' }), 'hz285');
  assert.equal(soundForPractice({ type: 'flare', theme: 'flare' }), 'hz285');
  for (const theme of ['settle', 'brace', 'kind'] as const) assert.equal(soundForPractice({ type: 'notice', theme }), 'hz285', theme);
  assert.equal(soundForPractice({ type: 'fear', theme: 'fear' }), 'hz396');
  for (const theme of ['urge', 'edges', 'moves', 'texture'] as const) assert.equal(soundForPractice({ type: 'notice', theme }), 'hz396', theme);
  for (const theme of ['locate', 'curious', 'open', 'breath'] as const) assert.equal(soundForPractice({ type: 'notice', theme }), 'hz432', theme);
  for (const theme of ['pleasant', 'activity'] as const) assert.equal(soundForPractice({ type: 'notice', theme }), 'hz528', theme);
});

test('an explicit sound or no sound overrides matching; matched resolves per practice', () => {
  const flare = { type: 'flare', theme: 'flare' } as const;
  assert.equal(resolveBackground('matched', flare), 'hz285');
  assert.equal(resolveBackground('hz639', flare), 'hz639');
  assert.equal(resolveBackground('none', flare), 'none');
  assert.equal(resolveBackground(undefined, { type: 'sleep' }), 'hz174');
  // Legacy prefs: the tone turned off stays off, a chosen sound stays chosen, unset is matched.
  assert.equal(resolveBackground(backgroundFor({ ambience: false }), flare), 'none');
  assert.equal(resolveBackground(backgroundFor({ background: 'hz396' }), flare), 'hz396');
  assert.equal(resolveBackground(backgroundFor({}), { type: 'notice', theme: 'settle' }), 'hz285');
});

// Sounds stored by builds before the tones (20 Oct 2026): seven nature recordings and 'tone'.
const NATURE = ['rain', 'forest', 'stream', 'waterfall', 'ocean', 'night', 'fire'];

test('migration: the old tone is 432 Hz; a nature sound under practice goes back to matched', () => {
  assert.equal(migrateBackground('tone'), 'hz432');
  for (const id of NATURE) assert.equal(migrateBackground(id), 'matched', id);
  for (const b of ['none', 'matched', 'hz174', 'hz639', undefined] as const) assert.equal(migrateBackground(b), b);
  // Read straight from stored prefs, without migrateSoundPrefs, it still never breaks.
  assert.equal(backgroundFor({ background: 'tone' as never }), 'hz432');
  assert.equal(backgroundFor({ background: 'rain' as never }), 'matched');
  assert.equal(backgroundFor({ background: 'fire' as never, ambience: false }), 'matched');
  assert.equal(resolveBackground('ocean' as never, { type: 'sleep' }), 'hz174');
  assert.equal(resolveBackground('tone' as never, { type: 'sleep' }), 'hz432');
  assert.equal(backgroundLabel('tone' as never), '432 Hz');
  assert.equal(backgroundLabel('forest' as never, { type: 'flare' }), 'matched · 285 Hz');
  assert.deepEqual(afterPractice('sleep', 'completed', 'rain' as never), { rest: true, sound: 'hz174' });
});

test('migration: a remembered listen of a nature sound or the old tone plays 432 Hz', () => {
  assert.equal(migrateListenId('tone'), 'hz432');
  for (const id of NATURE) assert.equal(migrateListenId(id), 'hz432', id);
  assert.equal(migrateListenId(undefined), 'hz432');
  assert.equal(migrateListenId(42), 'hz432');
  assert.equal(migrateListenId('hz528'), 'hz528');
});

test('migration: stored prefs load with their sounds brought up to date, and everything else kept', () => {
  const old = loadPrefs({ onboarded: true, background: 'rain' as never, listen: { id: 'tone' as never, timer: 30 }, ambience: true });
  assert.equal(old.background, 'matched');
  assert.deepEqual(old.listen, { id: 'hz432', timer: 30 });
  assert.equal(old.onboarded, true);
  assert.equal(old.ambience, true);
  assert.equal(loadPrefs({ background: 'tone' as never }).background, 'hz432');
  assert.deepEqual(loadPrefs({ listen: { id: 'forest' as never, timer: 0 } }).listen, { id: 'hz432', timer: 0 });
  // Current values pass through untouched, as the same object.
  const current = loadPrefs({ background: 'hz639', listen: { id: 'hz174', timer: 10 } });
  assert.equal(current.background, 'hz639');
  assert.deepEqual(current.listen, { id: 'hz174', timer: 10 });
  assert.equal(migrateSoundPrefs(current), current);
  // Nothing stored: nothing invented.
  const fresh = loadPrefs(null);
  assert.equal(fresh.background, undefined);
  assert.equal(fresh.listen, undefined);
  assert.ok(!('background' in fresh));
});

test('the choice reads plainly where it is glanced at, the pitch with its unit', () => {
  assert.equal(backgroundLabel('matched', { type: 'notice', theme: 'settle' }), 'matched · 285 Hz');
  assert.equal(backgroundLabel('hz432'), '432 Hz');
  assert.equal(backgroundLabel('none'), 'no sound');
});

test('after a sleep practice, a matched sound carries on as its own listen', () => {
  assert.deepEqual(afterPractice('sleep', 'completed', 'matched'), { rest: true, sound: 'hz174' });
  assert.deepEqual(afterPractice('sleep', 'completed', 'hz528'), { rest: true, sound: 'hz528' });
});

test('a timed listen rises slowly, holds, and fades to nothing by the end', () => {
  assert.equal(listenVolumeAt(0, 20), 0);
  assert.ok(listenVolumeAt(LISTEN_FADE_IN_MS / 2, 20) < 1);
  assert.equal(listenVolumeAt(10 * MIN, 20), 1);
  const late = [19 * MIN + 20_000, 19 * MIN + 40_000, 19 * MIN + 55_000].map((t) => listenVolumeAt(t, 20));
  assert.ok(late[0] > late[1] && late[1] > late[2], 'falls steadily');
  assert.equal(listenVolumeAt(20 * MIN, 20), 0);
  // No timer: plays on.
  assert.equal(listenVolumeAt(300 * MIN, 0), 1);
});

test('a timer changed mid-listen counts from when it was set, without a second fade-in', () => {
  assert.equal(listenVolumeAt(15 * MIN, 10, 1 * MIN), 1);
  assert.equal(listenVolumeAt(25 * MIN, 10, 10 * MIN), 0);
});

test('the timer reads plainly', () => {
  assert.equal(timerLabel(20, 2 * MIN), '18 min left');
  assert.equal(timerLabel(20, 19.5 * MIN), 'fading out');
  assert.equal(timerLabel(0, 99 * MIN), 'until you stop');
});

test('levels stay within range, and the copy makes no claim about the body', () => {
  for (const s of SOUNDSCAPES) {
    for (const target of Object.values(UNDER_VOICE)) {
      const v = volumeFor(s, target);
      assert.ok(v > 0 && v < 1, `${s.id} at ${target}`); // never clipped at 1, so the balance holds
    }
    assert.ok(listenLevel(s) > 0 && listenLevel(s) <= 1);
    const copy = `${s.name}. ${s.line}`;
    assert.doesNotMatch(copy, SOUND_CLAIMS, s.id);
    for (const re of FORBIDDEN_GUIDE_LANGUAGE) assert.doesNotMatch(copy, re, s.id);
    // The line says how it sounds, never what it is for (docs/RESEARCH.md §7).
    assert.doesNotMatch(s.line, /\bfor\b|\bhelps?\b|\bhz\b|frequenc/i, s.id);
  }
});

/**
 * What no sound's copy may say: an effect on the body, or the "healing frequencies" mythology
 * that comes with these numbers (docs/RESEARCH.md §7; App Store guideline 1.4.1).
 */
const SOUND_CLAIMS =
  /heal|pain|relie|therap|cure|calms? the nerv|reduc|chakra|\bdna\b|balanc|vibration|solfeggio|miracle|frequenc|align|cleans|detox|repair|transform|resonan|energ|spiritual|sacred|ancient/i;

test('the screens that show sounds make no claim either', () => {
  // The copy those screens put in front of people, comments stripped: a comment may explain
  // why there is no claim, the screen may not make one.
  const files = ['src/features/sounds/SoundsScreen.tsx', 'src/features/listen/ListenScreen.tsx', 'src/features/shared/SoundChoices.tsx', 'src/features/shared/start.ts'];
  for (const f of files) {
    const code = stripComments(readFileSync(join(ROOT, f), 'utf8'));
    const strings = code.match(/(['"`])(?:(?!\1)[^\\\n]|\\.)*\1|>[^<>{}]+</g) ?? [];
    for (const str of strings) assert.doesNotMatch(str, /heal|chakra|\bdna\b|balanc|vibration|solfeggio|miracle|frequenc|calmer|less pain/i, `${f}: ${str}`);
  }
  // The subtitle on the Sounds tab says what is there, and nothing more.
  assert.match(readFileSync(join(ROOT, 'src/features/sounds/SoundsScreen.tsx'), 'utf8'), /No voice, just a tone\. Plays with the screen locked and fades out on its own\./);
});

test('under the voice: clearly beneath while the guide speaks, fuller in the silences, never level with it', () => {
  // 20 Oct 2026: "the sound effect is too loud compared to the narration".
  assert.ok(VOICE_LUFS - UNDER_VOICE.speaking >= 16, 'speaking');
  assert.ok(VOICE_LUFS - UNDER_VOICE.holding >= 10, 'silences');
  assert.ok(UNDER_VOICE.holding > UNDER_VOICE.speaking);
  for (const s of SOUNDSCAPES) {
    const heard = s.lufs + 20 * Math.log10(volumeFor(s, UNDER_VOICE.speaking));
    assert.ok(Math.abs(heard - UNDER_VOICE.speaking) < 0.1, `${s.id} lands where it should`);
  }
});

test('no guide line talks about the phone', () => {
  // 20 Oct 2026: "I don't want to talk about the phone."
  const all = JSON.stringify(GUIDE_SCRIPT);
  assert.doesNotMatch(all, /\bphone\b/i);
});
