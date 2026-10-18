import type { SessionType } from './types';

/**
 * The 28-day program: one short lesson and one guided practice a day.
 *
 * Its order follows Pain Reprocessing Therapy's (docs/RESEARCH.md §1): understand the alarm,
 * notice your own signs, track sensations with curiosity, soften fear and bracing, then
 * bring the practice into real activity. Lessons are short on purpose: education alone
 * barely moves pain (§2), so every lesson is paired with practice the same day.
 *
 * What the lessons never say (AGENTS.md): that the person's pain is safe, benign, or
 * "in the brain". An app can't know that. They explain the model, invite the person to
 * weigh their own signs, and point anything new or changing to a doctor.
 *
 * Pure data and pure functions: no React, so the whole program is checked in tests.
 */

export type PracticeTheme =
  | 'settle'
  | 'locate'
  | 'breath'
  | 'edges'
  | 'moves'
  | 'texture'
  | 'curious'
  | 'brace'
  | 'fear'
  | 'urge'
  | 'kind'
  | 'pleasant'
  | 'activity'
  | 'flare'
  | 'open';

export type LessonCard = {
  /** One to three short paragraphs. */
  text: string[];
  /** An invitation to notice something in the coming days. Never homework that can be failed. */
  notice?: string;
};

export type ProgramDay = {
  day: number;
  week: 1 | 2 | 3 | 4;
  lesson: { title: string; cards: LessonCard[] };
  practice: { title: string; theme: PracticeTheme; minutes: 3 | 5 | 7 | 10; sessionType: SessionType };
};

export const PROGRAM_TITLE = 'Meeting pain without alarm';
export const PROGRAM_DAYS = 28;

export const WEEKS: Record<1 | 2 | 3 | 4, { name: string; about: string }> = {
  1: { name: 'Understand', about: 'How pain works, and why it can stay loud' },
  2: { name: 'Notice', about: 'Watching a sensation with curiosity' },
  3: { name: 'Soften', about: 'Fear, bracing, and the urge to fix' },
  4: { name: 'Live', about: 'Back to what you want to do' },
};

// Not a gate before the first practice: it reads as a check that sits beside care (research round 1, 18 Oct 2026).
const DOCTOR = 'If a pain is new, or different from your usual, have it checked by a doctor. Keep any treatment you have; this practice sits beside it.';

type Def = [title: string, cards: LessonCard[], practice: string, theme: PracticeTheme, minutes: 3 | 5 | 7 | 10];

const DAYS: Def[] = [
  // ——— Week 1 · Understand ———
  [
    'Pain is real',
    [
      { text: ['Every pain you feel is real.', 'All pain, from a broken bone to a migraine, is made by the nervous system. That is how pain works, for everyone. It makes pain no less real.'] },
      { text: ['Pain is a protector. It is an alarm that says: something might be wrong, take care.'] },
      {
        text: ['For many people whose pain lasts, the alarm becomes more sensitive over time, and goes off more easily and more loudly.', DOCTOR],
        notice: 'Over the next days, notice when the alarm is louder, and when it is quieter.',
      },
    ],
    'Arriving',
    'settle',
    5,
  ],
  [
    'An alarm that learns',
    [
      { text: ['Nervous systems learn. Whatever happens often gets easier to do again — a skill, a habit, and pain too.'] },
      { text: ['After months or years, the pathways that make pain can become well worn, sometimes long after an injury has healed, sometimes with no injury at all.'] },
      { text: ['What was learned can be relearned. That is the idea this program is built on.'] },
    ],
    'Finding the place',
    'locate',
    5,
  ],
  [
    'The worry loop',
    [
      { text: ['Pain brings worry. What is this? Will it get worse? What if I make it worse?'] },
      { text: ['Worry tells the alarm there may be danger, and the alarm turns the volume up. More pain, more worry.'] },
      { text: ['Meeting a sensation with less alarm is one way to loosen the loop. That is what the practice trains.'] },
    ],
    'Breath around it',
    'breath',
    5,
  ],
  [
    'Signs from your own pain',
    [
      { text: ['Clinicians look for signs that pain is coming from a sensitive alarm rather than from ongoing damage.'] },
      { text: ['Some of those signs: it began in a stressful time. It moves, or spreads. It changes with mood or setting. It fades when you are absorbed in something.'] },
      {
        text: ['Only you — ideally with your doctor — can weigh your own signs. The app can’t.'],
        notice: 'Today, just notice which of these sound familiar. No conclusions needed.',
      },
    ],
    'Its texture',
    'texture',
    5,
  ],
  [
    'When it fades',
    [
      { text: ['Has your pain ever faded while you were laughing, absorbed in something, or far from your usual day?'] },
      { text: ['Moments like that are worth noticing. They show the volume can change.'] },
      { text: ['If one happens this week, save it as a moment. They add up.'], notice: 'Watch for a moment when the pain is quieter than you expected.' },
    ],
    'Arriving, again',
    'settle',
    5,
  ],
  [
    'Why stress turns the volume up',
    [
      { text: ['Your nervous system sets how loud a signal feels.'] },
      { text: ['When it senses threat — a deadline, a worry, a short night — it can turn the volume up.'] },
      { text: ['Calm attention is one way to let it turn back down. That is today’s practice.'] },
    ],
    'Breath around it',
    'breath',
    7,
  ],
  [
    'One week in',
    [
      { text: ['This week was about the alarm: what it is for, how it learns, and how fear feeds it.'] },
      { text: ['Next week the practice gets more detailed: the edges of a sensation, its texture, whether it moves.'] },
      { text: ['Showing up is the work. Whatever the pain did this week, you practiced.'] },
    ],
    'The body as a whole',
    'open',
    7,
  ],

  // ——— Week 2 · Notice ———
  [
    'What somatic tracking is',
    [
      { text: ['Somatic tracking means watching a sensation the way you might watch a cloud: with curiosity, without needing it to change.'] },
      { text: ['It is not ignoring the pain, and not fighting it. It is meeting it with a little less alarm.'] },
      { text: ['Each practice this week looks at one quality of a sensation.'] },
    ],
    'Finding the place',
    'locate',
    7,
  ],
  [
    'The edges of a sensation',
    [
      { text: ['A sensation has a shape. It starts somewhere, and fades somewhere.'] },
      { text: ['When the alarm is loud, a sensation can feel like it fills everything. Looking for its edges often shows it is smaller than it felt.'] },
      { text: ['Today the guide helps you look for the edges. Nothing to answer. Just listen.'] },
    ],
    'The edges of a sensation',
    'edges',
    7,
  ],
  [
    'When a sensation moves',
    [
      { text: ['Sensations are rarely as fixed as they seem. They pulse, drift, spread, and shrink.'] },
      { text: ['Noticing movement is not a test. A sensation that stays still is just as worth watching.'] },
    ],
    'When a sensation moves',
    'moves',
    7,
  ],
  [
    'Texture, not verdict',
    [
      { text: ['“Bad” is a verdict. “Tight”, “warm”, “buzzing”, “dull” are textures.'] },
      { text: ['Describing a texture instead of judging it gives the alarm a little less to work with.'] },
      { text: ['You don’t have to say the words out loud. Just let a word arrive, if one does.'] },
    ],
    'Its texture',
    'texture',
    7,
  ],
  [
    'Curiosity is the active part',
    [
      { text: ['The alarm listens to how you meet a sensation. Dread says danger. Curiosity says: let’s look.'] },
      { text: ['Curiosity can be small. Wondering where something ends is enough.'] },
    ],
    'With curiosity',
    'curious',
    7,
  ],
  [
    'Watching, not fixing',
    [
      { text: ['It is natural to want the sensation gone. That wish is part of the alarm too.'] },
      { text: ['Today, see if you can let the sensation do whatever it does, and simply watch.'] },
    ],
    'With curiosity',
    'curious',
    7,
  ],
  [
    'Two weeks in',
    [
      { text: ['Two weeks of showing up. The skill you are building is attention without alarm.'] },
      { text: ['Next week turns to what makes the alarm louder: fear, bracing, and the urge to fix.'] },
    ],
    'The body as a whole',
    'open',
    10,
  ],

  // ——— Week 3 · Soften ———
  [
    'Bracing',
    [
      { text: ['When we expect pain, muscles brace around it. Shoulders lift. The jaw sets. Breath holds.'] },
      { text: ['Bracing is protection, and it can also keep the alarm on.'] },
      { text: ['Today’s practice notices bracing, and lets it go a little where it can.'], notice: 'Catch yourself bracing once today. Just notice it.' },
    ],
    'Letting the bracing go',
    'brace',
    7,
  ],
  [
    'Fear is not a fault',
    [
      { text: ['If you are afraid of your pain, that makes sense. It has hurt you, maybe for a long time.'] },
      { text: ['Fear isn’t something to get rid of. It is something to notice, kindly, beside the sensation.'] },
    ],
    'Fear, gently',
    'fear',
    7,
  ],
  [
    'The urge to fix',
    [
      { text: ['Stretch it, rub it, check it, change position, look it up. The urge to fix is constant for many people in pain.'] },
      { text: ['Each check can tell the alarm: this is still an emergency.'] },
      { text: ['Today, notice the urge, and see if you can let it pass without acting on it, just for the practice.'] },
    ],
    'The urge, passing',
    'urge',
    7,
  ],
  [
    'Feelings live in the body too',
    [
      { text: ['Stress, grief, anger and worry are felt in the body. They share the same alarm system as pain.'] },
      { text: ['When feelings are hard, the volume can rise.'] },
      { text: ['If heavy feelings are with you, be gentle with yourself today. Support from someone you trust, or a professional, can help.'] },
    ],
    'Breath around it',
    'breath',
    7,
  ],
  [
    'The voice that pushes',
    [
      { text: ['“Push through.” “Don’t be weak.” “You should be better by now.”'] },
      { text: ['A harsh inner voice is another kind of threat, and the alarm hears it.'] },
      { text: ['Today’s practice tries a kinder tone, the one you’d use with a friend.'] },
    ],
    'A kinder tone',
    'kind',
    7,
  ],
  [
    'Pleasant sensations count too',
    [
      { text: ['Attention trained on pain can forget everything else the body feels.'] },
      { text: ['Warm hands, the weight of a blanket, an easy breath: these are real too, and they tell the alarm something different.'] },
    ],
    'What feels easy',
    'pleasant',
    7,
  ],
  [
    'Three weeks in',
    [
      { text: ['You have looked at fear, bracing, the urge to fix, and the voice that pushes.'] },
      { text: ['The last week takes the practice out of the quiet room and into your day.'] },
    ],
    'The body as a whole',
    'open',
    10,
  ],

  // ——— Week 4 · Live ———
  [
    'Back to what matters',
    [
      { text: ['When you started, you named what you want to get back to.'] },
      { text: ['This week, choose one small step toward it. Small means: a little more than easy, well short of a flare.'] },
      { text: ['Practice first, then take the step. Save it as a moment when you have.'] },
    ],
    'Before a step',
    'activity',
    5,
  ],
  [
    'Small steps, often',
    [
      { text: ['Fear of an activity shrinks most when you do a little of it, often, and notice what actually happens.'] },
      { text: ['If a step brings a sensation, it is an invitation to practice: notice it, without alarm, and carry on gently if you can.'] },
    ],
    'Before a step',
    'activity',
    5,
  ],
  [
    'When the alarm goes off',
    [
      { text: ['Sometimes the alarm rings mid-activity. That is part of the road.'] },
      { text: ['A short practice in the moment can help: stop, breathe, find the edges, carry on or rest.'] },
      { text: ['The 3-minute flare practice is always on Today.'] },
    ],
    'In the moment',
    'flare',
    3,
  ],
  [
    'Flares are part of the road',
    [
      { text: ['A flare does not mean you are back at the start. Most people’s path goes up and down.'] },
      { text: ['In a flare: practice, rest, be kind to yourself. If a flare is different from your usual, or comes with new symptoms, see a doctor.'] },
    ],
    'In the moment',
    'flare',
    5,
  ],
  [
    'Your own evidence',
    [
      { text: ['Look back at the moments you saved: steps you took, times the pain was quieter than expected.'] },
      { text: ['They are your evidence, gathered by you. Keep adding to them.'] },
    ],
    'What feels easy',
    'pleasant',
    7,
  ],
  [
    'Keeping it going',
    [
      { text: ['Skills stay when they are used. After the program, a few practices a week is plenty.'] },
      { text: ['The flare practice, the sleep practice and the full program stay here for whenever you want them.'] },
    ],
    'The body as a whole',
    'open',
    7,
  ],
  [
    'Day 28',
    [
      { text: ['Four weeks of showing up. That is the part that was yours to do, and you did it.'] },
      { text: ['Look at your pain record and your moments together, in your own time. Whatever they show, the practice is yours now.'] },
    ],
    'The body as a whole',
    'open',
    10,
  ],
];

function sessionTypeFor(theme: PracticeTheme): SessionType {
  if (theme === 'flare') return 'flare';
  if (theme === 'fear') return 'fear';
  return 'notice';
}

export const PROGRAM: ProgramDay[] = DAYS.map(([title, cards, practice, theme, minutes], i) => ({
  day: i + 1,
  week: (Math.floor(i / 7) + 1) as 1 | 2 | 3 | 4,
  lesson: { title, cards },
  practice: { title: practice, theme, minutes, sessionType: sessionTypeFor(theme) },
}));

export function programDay(day: number): ProgramDay {
  return PROGRAM[Math.max(1, Math.min(PROGRAM_DAYS, day)) - 1];
}

/**
 * Progress through the program. A day is done when its practice was done; the lesson is
 * encouraged, never a gate — the practice is the part that matters (RESEARCH.md §2).
 * Only one new day opens per calendar day, so the program can't be binged, and nothing
 * closes when a day is missed: the next day simply waits.
 */
export type ProgramState = {
  /** Program days whose practice is done, with the local day they were done on. */
  done: Record<number, string>;
  /** Program days whose lesson was read. */
  read: number[];
};

export const EMPTY_PROGRAM: ProgramState = { done: {}, read: [] };

/** The day to offer today: the first undone day, unless a new day was already completed today. */
export function currentDay(state: ProgramState, today: string): { day: number; doneToday: boolean; finished: boolean } {
  const doneDays = Object.keys(state.done).map(Number);
  const finished = doneDays.length >= PROGRAM_DAYS;
  const doneToday = Object.values(state.done).includes(today);
  let next = 1;
  while (state.done[next] && next <= PROGRAM_DAYS) next++;
  if (finished) return { day: PROGRAM_DAYS, doneToday, finished };
  // A day finished today stays today's day: the next one opens tomorrow.
  if (doneToday) {
    const todays = doneDays.filter((d) => state.done[d] === today).sort((a, b) => b - a)[0];
    return { day: todays, doneToday, finished };
  }
  return { day: next, doneToday, finished };
}

export function completeDay(state: ProgramState, day: number, today: string): ProgramState {
  if (state.done[day]) return state;
  return { ...state, done: { ...state.done, [day]: today } };
}

export function markRead(state: ProgramState, day: number): ProgramState {
  return state.read.includes(day) ? state : { ...state, read: [...state.read, day] };
}
