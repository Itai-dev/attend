/**
 * Every guided session the app can start, written out as it is heard: each line, then the
 * silence after it. For reading the sessions end to end (5 Nov 2026), in English and Hebrew.
 *
 *   npx tsx tools/session-transcripts.ts <out-dir>
 *
 * Writes one file per language. The sessions are the 28 program days and the ready-made
 * sessions in Explore, each resting on a place (the lower back) the way a check-in sets it,
 * plus each preset once with no place, as for someone who hasn't checked in.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SessionEngine } from '../src/engine/SessionEngine';
import { LocalGuideBrain } from '../src/engine/guide/LocalGuideBrain';
import { resetScript } from '../src/engine/guide/lines';
import type { SessionLength } from '../src/engine/phases';
import { PROGRAM, type PracticeTheme } from '../src/domain/program';
import { PRESETS } from '../src/domain/presets';
import type { Place, SessionType } from '../src/domain/types';
import { setLang, tr } from '../src/i18n';

type Run = { label: string; type: SessionType; minutes: SessionLength; theme?: PracticeTheme; place?: Place };

async function transcript(r: Run): Promise<string> {
  let t = 1_000_000;
  const engine = new SessionEngine({ sessionType: r.type, minutes: r.minutes, now: () => t, seed: 3, mode: 'guided', place: r.place, theme: r.theme });
  const brain = new LocalGuideBrain();
  const out: string[] = [];
  let turns = 0;
  while (!engine.done && turns++ < 120) {
    const turn = await brain.next(engine.context());
    engine.recordGuideTurn(turn);
    out.push(`  [${engine.context().phase}]`);
    for (const l of turn.lines) {
      out.push(`    ${l.text}   (${Math.round(l.pauseAfterMs / 1000)}s)`);
      // Roughly the time the voice takes, then the silence: the engine closes on this clock.
      t += l.text.length * 70 + l.pauseAfterMs;
    }
    engine.afterGuideTurn(turn);
    if (turn.expectsResponse) out.push('    !! the guide expects an answer in a guided session');
  }
  const mins = ((t - 1_000_000) / 60_000).toFixed(1);
  return `## ${r.label} — ${r.type}, ${r.minutes} min${r.theme ? `, theme ${r.theme}` : ''}${r.place ? `, rests on ${r.place.region}` : ', no place'} → ${mins} min heard\n${out.join('\n')}\n`;
}

function runs(): Run[] {
  const back: Place = { region: 'lower_back' };
  const program: Run[] = PROGRAM.map((d) => ({
    label: `Day ${d.day}: ${d.practice.title}`,
    type: d.practice.sessionType,
    minutes: d.practice.minutes as SessionLength,
    theme: d.practice.theme,
    place: d.practice.theme === 'open' ? undefined : back,
  }));
  // Explore picks a theme from the type, as BeforeScreen does.
  const themeOf = (type: SessionType): PracticeTheme => (type === 'flare' ? 'flare' : type === 'fear' ? 'fear' : type === 'sleep' ? 'open' : 'curious');
  const presets: Run[] = PRESETS.flatMap((p) => [
    { label: `Explore: ${p.title}`, type: p.type, minutes: p.minutes as SessionLength, theme: themeOf(p.type), place: themeOf(p.type) === 'open' ? undefined : back },
    ...(themeOf(p.type) === 'open' ? [] : [{ label: `Explore: ${p.title} (no check-in yet)`, type: p.type, minutes: p.minutes as SessionLength, theme: themeOf(p.type) }]),
  ]);
  return [...program, ...presets];
}

async function main() {
  const dir = process.argv[2] ?? '.';
  mkdirSync(dir, { recursive: true });
  for (const lang of ['en', 'he'] as const) {
    setLang(lang);
    resetScript();
    const parts: string[] = [];
    for (const r of runs()) parts.push(await transcript({ ...r, label: tr(r.label, r.label) }));
    writeFileSync(join(dir, `sessions-${lang}.md`), `# Guided sessions (${lang})\n\n${parts.join('\n')}`);
    console.log(lang, parts.length, 'sessions');
  }
  setLang('en');
  resetScript();
}

void main();
