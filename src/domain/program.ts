import { tr } from '../i18n';
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
 *
 * Hebrew (27 Oct 2026, docs/HEBREW.md) is a parallel table read at call time through
 * getters: the language is set at launch, but Node tests switch it after this module has
 * loaded, so nothing user-facing may be baked into a module-level value.
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

/** The program's name, in the app's language. A function, not a constant: see the note above. */
export function programTitle(): string {
  // "בהלה" (fright), not "אזעקה": in Hebrew the feeling and the alarm system are two words.
  return tr('Meeting pain without alarm', 'לפגוש את הכאב בלי בהלה');
}
export const PROGRAM_DAYS = 28;

type Week = 1 | 2 | 3 | 4;
type WeekCopy = { name: string; about: string };

const WEEKS_EN: Record<Week, WeekCopy> = {
  1: { name: 'Understand', about: 'How pain works, and why it can stay loud' },
  2: { name: 'Notice', about: 'Watching a sensation with curiosity' },
  3: { name: 'Soften', about: 'Fear, bracing, and the urge to fix' },
  4: { name: 'Live', about: 'Back to what you want to do' },
};

const WEEKS_HE: Record<Week, WeekCopy> = {
  1: { name: 'להבין', about: 'איך כאב עובד, ולמה הוא יכול להישאר חזק' },
  2: { name: 'לשים לב', about: 'להתבונן בתחושה בסקרנות' },
  3: { name: 'לרכך', about: 'פחד, דריכות, והדחף לתקן' },
  4: { name: 'לחיות', about: 'בחזרה למה שרוצים לעשות' },
};

function weekCopy(w: Week): Readonly<WeekCopy> {
  return {
    get name() {
      return tr(WEEKS_EN[w].name, WEEKS_HE[w].name);
    },
    get about() {
      return tr(WEEKS_EN[w].about, WEEKS_HE[w].about);
    },
  };
}

/** `WEEKS[w].name` reads in the app's language at the moment it is read. */
export const WEEKS: Record<Week, Readonly<WeekCopy>> = { 1: weekCopy(1), 2: weekCopy(2), 3: weekCopy(3), 4: weekCopy(4) };

const DOCTOR = 'If your pain is new, changing, or worries you, have it checked by a doctor before practising with it.';
const DOCTOR_HE = 'אם הכאב חדש, משתנה או מדאיג אתכם, כדאי לבדוק אותו אצל רופא לפני שמתרגלים איתו.';

type Def = [title: string, cards: LessonCard[], practice: string, theme: PracticeTheme, minutes: 3 | 5 | 7 | 10];

const DAYS: Def[] = [
  // ——— Week 1 · Understand ———
  [
    'Pain is real',
    [
      { text: ['Every pain you feel is real. All pain is made by the nervous system — that is how pain works for everyone.'] },
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
    'An alarm that learned',
    [
      { text: ['Nervous systems learn. Whatever happens often gets easier to do again — a skill, a habit, and pain too.'] },
      { text: ['After months or years, the pathways that make pain can become well worn, sometimes long after an injury has healed.'] },
      { text: ['What was learned can be relearned. That is the idea this program is built on.'] },
    ],
    'Finding the place',
    'locate',
    5,
  ],
  [
    'The pain–fear loop',
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
      { text: ['Showing up is the work. Whatever the pain did this week, you practised.'] },
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
      { text: ['Practise first, then take the step. Save it as a moment when you have.'] },
    ],
    'Before a step',
    'activity',
    5,
  ],
  [
    'Small steps, often',
    [
      { text: ['Fear of an activity shrinks most when you do a little of it, often, and notice what actually happens.'] },
      { text: ['If a step brings a sensation, it is an invitation to practise: notice it, without alarm, and carry on gently if you can.'] },
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
      { text: ['In a flare: practise, rest, be kind to yourself. If a flare is different from your usual, or comes with new symptoms, see a doctor.'] },
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

/**
 * The Hebrew program (27 Oct 2026): the same 28 days, rewritten rather than translated
 * (docs/HEBREW.md). Same cards in the same order, same restraint: plural or neutral
 * address, never a guessed gender. "בהלה" is the feeling of alarm; "אזעקה" is the alarm
 * the lessons explain. "דריכות" is bracing: the body tensing in expectation of pain.
 */
type DefHe = [title: string, cards: LessonCard[]];

const DAYS_HE: DefHe[] = [
  // ——— שבוע 1 · להבין ———
  [
    'הכאב אמיתי',
    [
      { text: ['כל כאב שאתם מרגישים הוא אמיתי. מערכת העצבים היא שמייצרת כל כאב – ככה כאב עובד אצל כולם.'] },
      { text: ['כאב הוא מנגנון הגנה. הוא אזעקה שאומרת: אולי משהו לא בסדר, כדאי להיזהר.'] },
      {
        text: ['אצל הרבה אנשים שהכאב שלהם נמשך, האזעקה נעשית רגישה יותר עם הזמן. היא נדלקת מהר יותר, וחזק יותר.', DOCTOR_HE],
        notice: 'בימים הקרובים, שימו לב מתי האזעקה חזקה יותר, ומתי היא שקטה יותר.',
      },
    ],
  ],
  [
    'אזעקה שלמדה',
    [
      { text: ['מערכת העצבים לומדת. מה שחוזר הרבה, קל לה יותר לעשות שוב – מיומנות, הרגל, וגם כאב.'] },
      { text: ['אחרי חודשים או שנים, הדרכים שבהן נוצר כאב יכולות להפוך לשביל כבוש, לפעמים הרבה אחרי שהפציעה עצמה החלימה.'] },
      { text: ['מה שנלמד אפשר ללמוד מחדש. על הרעיון הזה בנויה התוכנית.'] },
    ],
  ],
  [
    'מעגל הכאב והפחד',
    [
      { text: ['כאב מביא דאגה. מה זה? זה יחמיר? ומה אם אני אחמיר את זה?'] },
      { text: ['הדאגה אומרת לאזעקה שאולי יש סכנה, והאזעקה מגבירה את העוצמה. יותר כאב, יותר דאגה.'] },
      { text: ['לפגוש תחושה עם קצת פחות בהלה – זו דרך אחת לרופף את המעגל. את זה התרגול מאמן.'] },
    ],
  ],
  [
    'סימנים מהכאב שלכם',
    [
      { text: ['אנשי מקצוע מחפשים סימנים לכך שהכאב מגיע מאזעקה רגישה, ולא מנזק שעדיין נמשך.'] },
      { text: ['כמה מהסימנים האלה: הכאב התחיל בתקופה לחוצה. הוא זז, או מתפשט. הוא משתנה עם מצב הרוח או הסביבה. הוא נחלש כשאתם שקועים במשהו.'] },
      {
        text: ['רק אתם – ועדיף יחד עם הרופא שלכם – יכולים לשקול את הסימנים של הכאב שלכם. האפליקציה לא יכולה.'],
        notice: 'היום, רק שימו לב אילו מהם מוכרים לכם. לא צריך להגיע למסקנות.',
      },
    ],
  ],
  [
    'כשהכאב שוכך',
    [
      { text: ['קרה פעם שהכאב נחלש בזמן שצחקתם, כששקעתם במשהו, או כשהייתם רחוק מהשגרה?'] },
      { text: ['כדאי לשים לב לרגעים כאלה. הם מראים שהעוצמה יכולה להשתנות.'] },
      { text: ['אם קורה רגע כזה השבוע, אפשר לשמור אותו. הרגעים מצטברים.'], notice: 'חפשו רגע שבו הכאב שקט יותר ממה שציפיתם.' },
    ],
  ],
  [
    'למה לחץ מגביר את העוצמה',
    [
      { text: ['מערכת העצבים קובעת עד כמה חזק מרגישים כל אות שמגיע מהגוף.'] },
      { text: ['כשהיא מזהה איום – דדליין, דאגה, לילה בלי מספיק שינה – היא עלולה להגביר את העוצמה.'] },
      { text: ['תשומת לב רגועה היא דרך אחת לעזור לה להנמיך את העוצמה בחזרה. זה התרגול של היום.'] },
    ],
  ],
  [
    'אחרי שבוע',
    [
      { text: ['השבוע עסק באזעקה: בשביל מה היא קיימת, איך היא לומדת, ואיך הפחד מזין אותה.'] },
      { text: ['בשבוע הבא התרגול נעשה מפורט יותר: הקצוות של תחושה, המרקם שלה, והאם היא זזה.'] },
      { text: ['להגיע – זו העבודה. לא משנה מה הכאב עשה השבוע, תרגלתם.'] },
    ],
  ],

  // ——— שבוע 2 · לשים לב ———
  [
    'מה זה מעקב סומטי',
    [
      { text: ['מעקב סומטי הוא להתבונן בתחושה כמו שמתבוננים בענן: בסקרנות, בלי צורך שהיא תשתנה.'] },
      { text: ['זה לא להתעלם מהכאב, וגם לא להילחם בו. זה לפגוש אותו עם קצת פחות בהלה.'] },
      { text: ['כל תרגול השבוע מתמקד בתכונה אחת של התחושה.'] },
    ],
  ],
  [
    'הקצוות של התחושה',
    [
      { text: ['לתחושה יש צורה. היא מתחילה איפשהו, ומתפוגגת איפשהו.'] },
      { text: ['כשהאזעקה חזקה, נדמה שהתחושה ממלאת הכול. כשמחפשים את הקצוות שלה, הרבה פעמים מתברר שהיא קטנה יותר ממה שחשבתם.'] },
      { text: ['היום הקול המנחה יעזור לחפש את הקצוות. לא צריך לענות על כלום. רק להקשיב.'] },
    ],
  ],
  [
    'כשתחושה זזה',
    [
      { text: ['תחושות קבועות הרבה פחות ממה שנדמה. הן פועמות, נודדות, מתפשטות ומצטמצמות.'] },
      { text: ['לשים לב לתנועה זה לא מבחן. גם תחושה שנשארת במקום שווה התבוננות, באותה מידה.'] },
    ],
  ],
  [
    'מרקם, לא פסק דין',
    [
      { text: ['"רע" זה פסק דין. "תפוס", "חם", "מזמזם", "עמום" – אלה מרקמים.'] },
      { text: ['כשמתארים מרקם במקום לשפוט אותו, יש לאזעקה קצת פחות חומר לעבוד איתו.'] },
      { text: ['לא צריך להגיד את המילים בקול. אפשר פשוט לתת למילה לעלות, אם היא עולה.'] },
    ],
  ],
  [
    'הסקרנות היא החלק הפעיל',
    [
      { text: ['האזעקה קשובה לדרך שבה פוגשים תחושה. חרדה אומרת: סכנה. סקרנות אומרת: בואו נראה.'] },
      { text: ['סקרנות יכולה להיות קטנה. מספיק לתהות איפה משהו נגמר.'] },
    ],
  ],
  [
    'להתבונן, לא לתקן',
    [
      { text: ['טבעי לרצות שהתחושה תיעלם. גם הרצון הזה הוא חלק מהאזעקה.'] },
      { text: ['היום, נסו לתת לתחושה לעשות מה שהיא עושה, ופשוט להתבונן.'] },
    ],
  ],
  [
    'אחרי שבועיים',
    [
      { text: ['שבועיים של תרגול. המיומנות שאתם בונים היא תשומת לב בלי בהלה.'] },
      { text: ['השבוע הבא עובר למה שמגביר את האזעקה: פחד, דריכות, והדחף לתקן.'] },
    ],
  ],

  // ——— שבוע 3 · לרכך ———
  [
    'דריכות',
    [
      { text: ['כשמצפים לכאב, השרירים נדרכים סביבו. הכתפיים מתרוממות. הלסת ננעלת. הנשימה נעצרת.'] },
      { text: ['דריכות היא הגנה, אבל היא גם יכולה להשאיר את האזעקה דולקת.'] },
      { text: ['התרגול של היום שם לב לדריכות, ומשחרר אותה קצת, איפה שאפשר.'], notice: 'פעם אחת היום, נסו לתפוס רגע של דריכות. רק לשים לב אליו.' },
    ],
  ],
  [
    'פחד זה לא פגם',
    [
      { text: ['אם אתם מפחדים מהכאב, זה הגיוני. הוא הכאיב לכם, אולי כבר הרבה זמן.'] },
      { text: ['לא צריך להיפטר מהפחד. אפשר לשים לב אליו, ברכות, לצד התחושה.'] },
    ],
  ],
  [
    'הדחף לתקן',
    [
      { text: ['למתוח, לעסות, לבדוק, להחליף תנוחה, לחפש באינטרנט. אצל הרבה אנשים עם כאב, הדחף לתקן לא מרפה.'] },
      { text: ['כל בדיקה כזאת יכולה לאותת לאזעקה: זה עדיין מצב חירום.'] },
      { text: ['היום, שימו לב לדחף, ונסו לתת לו לחלוף בלי לפעול לפיו – רק בשביל התרגול.'] },
    ],
  ],
  [
    'גם רגשות יושבים בגוף',
    [
      { text: ['לחץ, צער, כעס ודאגה מורגשים בגוף. הם עוברים דרך אותה מערכת אזעקה כמו הכאב.'] },
      { text: ['כשהרגשות קשים, העוצמה יכולה לעלות.'] },
      { text: ['אם רגשות כבדים מלווים אתכם, היום כדאי לנהוג בעצמכם ברכות. תמיכה ממישהו שאתם סומכים עליו, או מאיש מקצוע, יכולה לעזור.'] },
    ],
  ],
  [
    'הקול שלוחץ',
    [
      { text: ['"צריך פשוט להתגבר." "אסור להישבר." "זה כבר היה צריך לעבור."'] },
      { text: ['קול פנימי קשוח הוא עוד סוג של איום, והאזעקה שומעת אותו.'] },
      { text: ['התרגול של היום מנסה טון רך יותר, כזה שבו הייתם מדברים עם מישהו קרוב.'] },
    ],
  ],
  [
    'גם תחושות נעימות נחשבות',
    [
      { text: ['תשומת לב שרגילה להתמקד בכאב עלולה לשכוח את כל מה שהגוף מרגיש חוץ ממנו.'] },
      { text: ['ידיים חמות, המשקל של שמיכה, נשימה קלה: גם אלה תחושות אמיתיות, והן אומרות לאזעקה משהו אחר.'] },
    ],
  ],
  [
    'אחרי שלושה שבועות',
    [
      { text: ['התבוננתם בפחד, בדריכות, בדחף לתקן ובקול שלוחץ.'] },
      { text: ['השבוע האחרון מוציא את התרגול מהחדר השקט אל תוך היום שלכם.'] },
    ],
  ],

  // ——— שבוע 4 · לחיות ———
  [
    'לחזור למה שחשוב',
    [
      { text: ['בהתחלה ציינתם למה אתם רוצים לחזור.'] },
      { text: ['השבוע, בחרו צעד קטן אחד בכיוון הזה. קטן זה: קצת יותר ממה שקל, והרבה לפני התלקחות.'] },
      { text: ['קודם לתרגל, ואז לעשות את הצעד. אחרי הצעד, אפשר לשמור אותו ברגעים שלכם.'] },
    ],
  ],
  [
    'צעד קטן, הרבה פעמים',
    [
      { text: ['פחד מפעילות קטן הכי הרבה כשעושים ממנה קצת, הרבה פעמים, ושמים לב מה באמת קורה.'] },
      { text: ['אם צעד מעורר תחושה, זו הזמנה לתרגל: לשים לב אליה, בלי בהלה, ולהמשיך בעדינות אם אפשר.'] },
    ],
  ],
  [
    'כשהאזעקה נדלקת',
    [
      { text: ['לפעמים האזעקה נדלקת באמצע פעילות. זה חלק מהדרך.'] },
      { text: ['תרגול קצר ברגע עצמו יכול לעזור: לעצור, לנשום, למצוא את הקצוות, ואז להמשיך או לנוח.'] },
      { text: ['תרגול ההתלקחות של 3 דקות נמצא תמיד בלשונית היום.'] },
    ],
  ],
  [
    'התלקחויות הן חלק מהדרך',
    [
      { text: ['התלקחות לא אומרת שחזרתם להתחלה. אצל רוב האנשים הדרך עולה ויורדת.'] },
      { text: ['בהתלקחות: לתרגל, לנוח, לנהוג בעצמכם ברכות. אם ההתלקחות שונה ממה שאתם מכירים, או מגיעה עם תסמינים חדשים, כדאי לפנות לרופא.'] },
    ],
  ],
  [
    'הראיות שלכם',
    [
      { text: ['הסתכלו אחורה על הרגעים ששמרתם: צעדים שעשיתם, פעמים שבהן הכאב היה שקט ממה שציפיתם.'] },
      { text: ['אלה הראיות שלכם, שאספתם בעצמכם. אפשר להמשיך להוסיף להן.'] },
    ],
  ],
  [
    'להמשיך הלאה',
    [
      { text: ['מיומנויות נשמרות כשמשתמשים בהן. אחרי התוכנית, כמה תרגולים בשבוע זה די והותר.'] },
      { text: ['תרגול ההתלקחות, תרגול השינה והתוכנית כולה נשארים כאן, לכל פעם שתרצו.'] },
    ],
  ],
  [
    'יום 28',
    [
      { text: ['ארבעה שבועות של תרגול. זה החלק שהיה בידיים שלכם, ועשיתם אותו.'] },
      { text: ['כשתרצו, אפשר להסתכל על יומן הכאב ועל הרגעים שלכם יחד. לא משנה מה הם מראים, התרגול כבר שלכם.'] },
    ],
  ],
];

/** Practice titles, keyed by the English title so a practice reused on several days reads the same. */
const PRACTICE_HE: Record<string, string> = {
  Arriving: 'להגיע',
  'Arriving, again': 'להגיע, שוב',
  'Finding the place': 'למצוא את המקום',
  'Breath around it': 'נשימה סביב התחושה',
  'Its texture': 'המרקם של התחושה',
  'The body as a whole': 'הגוף כולו',
  'The edges of a sensation': 'הקצוות של התחושה',
  'When a sensation moves': 'כשתחושה זזה',
  'With curiosity': 'בסקרנות',
  'Letting the bracing go': 'לשחרר את הדריכות',
  'Fear, gently': 'פחד, בעדינות',
  'The urge, passing': 'לתת לדחף לחלוף',
  'A kinder tone': 'טון רך יותר',
  'What feels easy': 'מה שנעים',
  'Before a step': 'לפני צעד',
  'In the moment': 'ברגע עצמו',
};

function sessionTypeFor(theme: PracticeTheme): SessionType {
  if (theme === 'flare') return 'flare';
  if (theme === 'fear') return 'fear';
  return 'notice';
}

export const PROGRAM: ProgramDay[] = DAYS.map(([title, cards, practice, theme, minutes], i) => {
  const en = { title, cards };
  const [heTitle, heCards] = DAYS_HE[i];
  const he = { title: heTitle, cards: heCards };
  return {
    day: i + 1,
    week: (Math.floor(i / 7) + 1) as 1 | 2 | 3 | 4,
    get lesson() {
      return tr(en, he);
    },
    practice: {
      get title() {
        return tr(practice, PRACTICE_HE[practice] ?? practice);
      },
      theme,
      minutes,
      sessionType: sessionTypeFor(theme),
    },
  };
});

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
