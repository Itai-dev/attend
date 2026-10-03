import { sleep, type ListenOptions, type ListenResult, type SpeechInput } from '../types';

/**
 * A pretend person, for development and demos without a microphone.
 *
 * It answers the guide's last line the way a real participant might, from a
 * small set of personas, with a human-ish delay and the occasional silence.
 * It exists so the whole loop — voice, engine, map, recap, Journey — can be
 * felt in Expo Go or a simulator. It is never selected in a release build.
 */

type Persona = {
  name: string;
  answers: Array<{ when: RegExp; say: string[] }>;
};

const PERSONAS: Persona[] = [
  {
    name: 'neck, moving',
    answers: [
      { when: /know well|something new|familiar/i, say: ["It's familiar. I've had it for years."] },
      { when: /attention|notice in your body|what do you notice in|loudest|on your mind|as you rest|as you lie/i, say: ['My neck feels really tight on the left side.', 'My left shoulder and neck feel really tight.'] },
      { when: /one side|which side|left, the right/i, say: ['The left side.'] },
      { when: /where in|clearest|most clearly|where do you feel/i, say: ['Right at the bottom of my neck, on the left.'] },
      { when: /pressure, pulling|tightness, burning/i, say: ['More like pulling.'] },
      { when: /feel like right now|what is it like|texture/i, say: ['Almost like someone is pulling it upward.'] },
      { when: /small spot|focused in one place/i, say: ["It's a small spot. Very focused."] },
      { when: /clear edge|where it ends|edges as clear/i, say: ['Yes, it has a clear edge.', "The edges feel softer now. It's harder to tell where it ends."] },
      { when: /steady|pulse|constant/i, say: ["It's pretty constant."] },
      { when: /same place|any movement|completely still/i, say: ['No. It kind of moves upward toward the back of my head.'] },
      { when: /different from a moment ago|notice now|here now/i, say: ["It's less defined now. More like a warm area.", "It's a bit softer.", 'About the same.'] },
      { when: /meet it this way|be with it like this/i, say: ["I can let it be there. It's okay."] },
      { when: /paused/i, say: ['Continue.'] },
    ],
  },
  {
    name: 'lower back, stable',
    answers: [
      { when: /know well|something new|familiar/i, say: ['I know it well.'] },
      { when: /attention|notice in your body|what do you notice in|loudest|on your mind|as you rest|as you lie/i, say: ['My lower back.'] },
      { when: /one side|which side|left, the right/i, say: ['More in the middle.'] },
      { when: /pressure, pulling|tightness, burning/i, say: ['Heavy. Like an ache.'] },
      { when: /feel like right now|what is it like|texture/i, say: ['Dull and heavy, like a weight sitting there.'] },
      { when: /small spot|focused in one place/i, say: ["It's spread out across the whole area."] },
      { when: /clear edge|where it ends|edges as clear/i, say: ['Not really. It fades out.'] },
      { when: /steady|pulse|constant/i, say: ['Steady.'] },
      { when: /same place|any movement|completely still/i, say: ['It stays in the same place.'] },
      { when: /different from a moment ago|notice now|here now/i, say: ['About the same.', 'Nothing has changed.'] },
      { when: /meet it this way|be with it like this/i, say: ['I keep wanting it to stop. But I can watch it.'] },
      { when: /paused/i, say: ['Continue.'] },
    ],
  },
];

export class SimulatedParticipantInput implements SpeechInput {
  readonly id = 'simulated';
  readonly label = 'Simulated participant';
  private persona: Persona;
  private used = new Map<RegExp, number>();
  private levelListeners = new Set<(l: number) => void>();

  constructor(personaIndex?: number) {
    this.persona = PERSONAS[personaIndex ?? Math.floor(Math.random() * PERSONAS.length)];
  }

  async isAvailable() {
    return true;
  }

  async requestPermission() {
    return true;
  }

  onLevel(cb: (l: number) => void) {
    this.levelListeners.add(cb);
    return () => this.levelListeners.delete(cb);
  }

  async listen(opts: ListenOptions, signal: AbortSignal): Promise<ListenResult> {
    const prompt = opts.prompt ?? '';
    const match = this.persona.answers.find((a) => a.when.test(prompt));
    await sleep(1200 + Math.random() * 1800, signal);
    if (signal.aborted) return { kind: 'aborted' };
    if (!match) {
      await sleep(Math.min(opts.maxWaitMs, 6000), signal);
      return signal.aborted ? { kind: 'aborted' } : { kind: 'silence', waitedMs: opts.maxWaitMs };
    }
    const n = this.used.get(match.when) ?? 0;
    this.used.set(match.when, n + 1);
    const text = match.say[Math.min(n, match.say.length - 1)];
    // Animate the level as if someone were talking.
    const talkMs = 600 + text.length * 45;
    const started = Date.now();
    while (Date.now() - started < talkMs && !signal.aborted) {
      const l = 0.35 + Math.random() * 0.5;
      this.levelListeners.forEach((cb) => cb(l));
      await sleep(110, signal);
    }
    this.levelListeners.forEach((cb) => cb(0));
    if (signal.aborted) return { kind: 'aborted' };
    return { kind: 'speech', text, durationMs: talkMs };
  }

  dispose() {
    this.levelListeners.clear();
  }
}
