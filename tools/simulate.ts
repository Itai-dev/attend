import { SessionEngine } from '../src/engine/SessionEngine';
import { LocalGuideBrain } from '../src/engine/guide/LocalGuideBrain';

const script: Record<string, string> = {
  notice: 'My left shoulder and neck feel really tight.',
  locate_side: 'On the left.',
  locate_narrow: 'Lower part.',
  locate_where: 'In my neck.',
  quality: 'More like pulling.',
  quality_deepen: 'Almost like someone is pulling upward.',
  shape: "It's a small spot, pretty focused.",
  edge: 'Yes, it has a clear edge.',
  temporal: "It's pretty constant.",
  movement: 'No. It kind of travels toward the back of my head.',
  change: "The edges feel a bit blurry now, less defined.",
  reflect: "I can just let it be there. It's okay.",
  familiar: "Yes, I've had this for years.",
};

async function main() {
  let t = 0;
  const engine = new SessionEngine({ sessionType: 'notice', now: () => t, seed: 7 });
  const brain = new LocalGuideBrain();
  let guard = 0;
  while (!engine.done && guard++ < 60) {
    const turn = await brain.next(engine.context());
    engine.recordGuideTurn(turn);
    for (const l of turn.lines) {
      console.log(`  [${engine.phase}] GUIDE: ${l.text}${l.pauseAfterMs ? `  (…${l.pauseAfterMs / 1000}s)` : ''}`);
      t += l.text.length * 65 + l.pauseAfterMs;
    }
    engine.afterGuideTurn(turn);
    if (engine.done) break;
    if (turn.expectsResponse) {
      const answer = script[turn.ask ?? ''] ?? '';
      t += 2500;
      if (answer) {
        console.log(`      USER (${turn.ask}): ${answer}`);
        t += answer.length * 60;
        engine.ingest({ kind: 'speech', text: answer });
      } else {
        console.log(`      USER (${turn.ask}): …silence`);
        t += 12000;
        engine.ingest({ kind: 'silence', waitedMs: 12000 });
      }
    }
  }
  const { session } = engine.finalize();
  console.log('\nDURATION', Math.round(t / 1000), 's');
  console.log('TITLE:', session.title);
  console.log('SUMMARY:', session.summary);
  console.log('ONE-LINER:', session.oneLiner);
  console.log('CHANGES:', session.changes.map((c) => c.description));
  console.log('START:', JSON.stringify(session.bodyMapStart.sensations.map(({ userLanguage, ...s }) => s)));
  console.log('END:', JSON.stringify(session.bodyMapEnd.sensations.map(({ userLanguage, ...s }) => s)));
  console.log('SIGNALS:', session.signals);
}
main();
