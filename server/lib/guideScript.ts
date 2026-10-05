/**
 * THE GUIDE'S SCRIPT — everything the guide says, in one place you can edit.
 *
 * How it works
 *   The app's engine decides *when* to speak and *what kind* of line comes next
 *   (settle in, ask where it is, react to "it moved", close…). This file decides
 *   the *words*. Each kind of moment has a few variants; the guide picks one it
 *   hasn't used yet in the session, so sessions don't sound recorded.
 *
 * How to edit
 *   - Edit this file on GitHub (pencil icon) and commit to master. Vercel
 *     redeploys in about a minute and the next session on every phone uses it;
 *     no app rebuild. The copy bundled in the app is the offline fallback.
 *   - A line with a pause is ['What the guide says.', 5000]: the number is how
 *     long the guide then stays quiet, in milliseconds (5000 = 5 seconds).
 *   - A plain 'string' is a question or short acknowledgement; the engine sets
 *     its timing.
 *   - {noun}, {word}, {place}, {dest} are filled with the person's own words
 *     ("tightness", "tight", "the left side of your neck", where it moved to).
 *   - Keep the guide's voice: short, calm, sparse. No "thank you for sharing",
 *     no praise, no apologies for pain, never "you're safe" or "nothing is
 *     wrong". The app rejects any line that crosses those lines and keeps the
 *     built-in version instead.
 *   - Safety and crisis lines are deliberately not here: they stay fixed in the
 *     app and can't be changed remotely.
 *
 * voice.direction is read by ElevenLabs v4 before every line — delivery tags
 * like [softly] [slowly] [whispers] [long pause]. Changing it re-records every
 * line on next use.
 */

export type Line = [text: string, pauseMs: number];
type ByType<T> = { notice: T; flare: T; sleep: T; fear: T };

export type GuideScript = {
  voice: { direction: string };
  ARRIVE: ByType<Line[][]>;
  NOTICE_ASK: ByType<string[]>;
  NOTICE_RETRY: Line[];
  NOTICE_SILENCE: Line[][];
  OPEN_AWARENESS: Line[];
  LOCATE_ACK: string[];
  LOCATE_WHERE: string[];
  LOCATE_NARROW: string[];
  LOCATE_SIDE_SIDED: string[];
  LOCATE_SIDE_PAIRED: string[];
  ACK_WORD: string[];
  ACK_PLAIN: string[];
  ACK_UNCERTAIN: string[];
  ACK_SILENCE: string[];
  EXPLORE_QUALITY: string[];
  QUALITY_HINT: Line[][];
  DEEPEN_BY_FAMILY: { [family: string]: string[] };
  EXPLORE_DEEPEN: string[];
  EXPLORE_SHAPE: string[];
  EXPLORE_EDGE: string[];
  EXPLORE_TEMPORAL: string[];
  EXPLORE_TEMPERATURE: string[];
  LIGHTNESS: Line[][];
  HOLD: Line[][];
  OBSERVE_MOVEMENT_STATIC: string[];
  OBSERVE_MOVEMENT: string[];
  OBSERVE_CHANGE: Line[][];
  OBSERVE_EDGE_AGAIN: string[];
  REACT_MOVED: Line[][];
  REACT_SPREAD: Line[][];
  REACT_CONTRACT: Line[][];
  REACT_SOFTENED: Line[][];
  REACT_INTENSIFIED: Line[][];
  REACT_STABLE: Line[][];
  REACT_BOUNDARY: Line[][];
  REACT_QUALITY: Line[][];
  REAPPRAISE_CORE: Line[][];
  REAPPRAISE_URGE: Line[];
  REAPPRAISE_FAMILIAR: Line[];
  REAPPRAISE_REFLECT: string[];
  CLOSE_PREPARE: ByType<Line[][]>;
  CLOSE: ByType<Line[]>;
};

export const GUIDE_SCRIPT: GuideScript = {
  voice: { direction: '[softly] [slowly]' },

  ARRIVE: {
    notice: [
      [
        ['Take a moment to settle in.', 3500],
        ['Let the phone rest, and let your eyes close.', 4500],
        ["There's nothing you need to fix right now.", 4000],
        ["We're not trying to change anything. Just to watch, with curiosity.", 5000],
      ],
      [
        ['Take a moment to settle in.', 3500],
        ['Get comfortable, and let your eyes close.', 5000],
        ["There's nothing you need to fix right now.", 4000],
        ["For the next few minutes, we'll simply be curious about what's there.", 5000],
      ],
    ],
    flare: [
      [
        ["Let's take this slowly.", 3500],
        ['Let the phone rest, and let your eyes close.', 4500],
        ["You don't have to make anything go away right now.", 5000],
        ['Let your breath be however it is.', 4500],
        ["We'll just watch it for a while, without needing it to change.", 5000],
      ],
    ],
    sleep: [
      [
        ["Get comfortable, wherever you're lying.", 5000],
        ['Let your eyes close.', 5000],
        ["There's nothing to do now except notice.", 6500],
      ],
    ],
    fear: [
      [
        ['Take a moment to settle in.', 3500],
        ['Let your eyes close.', 4000],
        ["We'll go slowly. You can stop at any time, just by saying so.", 4500],
        ["We're not here to solve it. Just to look at it, with curiosity.", 5000],
      ],
    ],
  },
  NOTICE_ASK: {
    notice: [
      'Notice what is asking for your attention in your body right now.',
      'Just notice what part of your body is asking for your attention.',
      'What do you notice in your body right now?',
    ],
    flare: ['Notice where it feels loudest right now.', 'Where is it asking for your attention most right now?'],
    sleep: ['As you rest, notice what in your body is asking for attention.', 'What do you notice in your body as you lie here?'],
    fear: [
      "Notice the sensation that's been worrying you. Where do you feel it right now?",
      'Let your attention find the sensation that has been on your mind. Where is it?',
    ],
  },
  NOTICE_RETRY: [
    ["That's fine. Notice wherever your attention goes first, even if it's small.", 0],
    ["There's no right answer. Even something subtle is enough.", 0],
  ],
  NOTICE_SILENCE: [
    [
      ['Take your time.', 6000],
      ["Whenever you're ready, say what you notice.", 0],
    ],
    [
      ["There's no hurry.", 6000],
      ["When something stands out, just say it out loud.", 0],
    ],
  ],
  OPEN_AWARENESS: [
    ["Then let's simply be with the body as a whole.", 5000],
    ['Feel where it is supported.', 9000],
    ['Notice the breath moving, without changing it.', 12000],
    ['Let your attention be wide, and soft.', 12000],
  ],
  LOCATE_ACK: [
    'Stay with the area where you notice it most clearly.',
    'Let your attention rest there.',
    'Stay with that for a moment.',
    'Stay there for a moment.',
  ],
  LOCATE_WHERE: ['Where do you feel that most clearly?', 'Where in your body is that {noun}?'],
  LOCATE_NARROW: ['Where in {place} do you feel it most clearly?', 'Can you find the place in {place} where it is clearest?'],
  LOCATE_SIDE_SIDED: ['Is it more on one side, or more central?', 'Is it on one side, or in the middle?'],
  LOCATE_SIDE_PAIRED: ['Which side do you feel it on?', 'Is it on the left, the right, or both?'],
  ACK_WORD: ['Notice that {noun}.', 'Stay with that {noun}.', 'Notice that.', 'Stay there for a moment.'],
  ACK_PLAIN: ['Notice that.', 'Stay there for a moment.', 'Give that a few seconds.', 'Interesting.'],
  ACK_UNCERTAIN: ["That's fine. It doesn't need a name.", "That's alright. Just stay near it."],
  ACK_SILENCE: ['Take your time.', 'Stay with it.', "There's no hurry."],
  // Word menus. Somatic tracking is easier with words to choose from: a few concrete
  // options, then "something else". Every word offered here is one the app understands
  // when it's said back (src/domain/lexicon.ts), so the body map can follow.
  EXPLORE_QUALITY: [
    'Does it feel more like pressure, tightness, or pulling? Or something else?',
    'Is it more of an ache, a burning, or a buzzing? Or something else?',
    'If you had to describe it: is it dull, sharp, heavy, or tingling?',
  ],

  // When the first answer has no describing word ("it just hurts", "I don't know").
  QUALITY_HINT: [
    [
      ["There's no right word.", 2500],
      ['Some people notice tight, heavy, warm, or buzzing.', 3000],
      ['Does any of those come close?', 0],
    ],
    [
      ['Take your time. Just the nearest word is enough.', 3000],
      ['Is it more squeezing, aching, burning, or tingling?', 0],
    ],
  ],

  // A closer look, using the family of word the person chose: neighbouring words
  // that help them tell the difference.
  DEEPEN_BY_FAMILY: {
    contract: ['Is that {noun} more like a squeeze, a knot, or a stiffness?', 'Does it feel clenched, or more cramping?'],
    pull: ['Does it pull, stretch, or twist?', 'Is the pulling in one direction, or more like a stretch?'],
    press: ['Is the pressure more heavy, or more like a squeeze?', 'Is it more like pressing, or more like tightness?'],
    warm: ['Is it more warm, hot, or burning? Or more raw?', 'Is it a gentle warmth, or more like burning?'],
    cold: ['Is it cool, or icy? Is there any numbness with it?'],
    grain: ['Is it more buzzing, tingling, or like pins and needles?', 'Is it a fine tingling, or more electric?'],
    point: ['Is it sharp in one point, or more shooting, along a line?'],
    pulse: ['Is it throbbing, or more of a steady ache?'],
    heavy: ['Is it more heavy, aching, dull, or sore?', 'Is it a deep ache, or more sore, near the surface?'],
    mute: ['Is it numb, or more dull? Is there any tingling around it?'],
  },
  EXPLORE_DEEPEN: ["What does '{word}' feel like right now?", 'When you say {word}, what is it like?', "What's the texture of that {noun}?"],
  EXPLORE_SHAPE: ['Is it a small spot, or more spread out?', 'Does it feel focused in one place, or more diffuse?'],
  EXPLORE_EDGE: ['Does it have a clear edge?', 'Can you find where it ends?'],
  // Temperature is one of the plainest qualities to notice, and rarely a frightening one.
  EXPLORE_TEMPERATURE: ['Does it feel warm, cool, or neither?', 'Is there any temperature to it? Warm, cool, or neutral?'],

  // Said once as watching begins. Somatic tracking works best with lightness — curiosity,
  // even interest — rather than vigilance. Outcome-independent: nothing has to happen.
  LIGHTNESS: [
    [
      ["See if you can watch it with a little lightness, the way you'd watch something interesting.", 7000],
      ["Whatever it does next is fine. It doesn't need to change.", 6000],
    ],
    [
      ["There's nothing to get right here.", 4000],
      ['Just be curious about what it does next, as if you were noticing it for the first time.', 8000],
    ],
    [
      ['Let your attention be easy, and interested.', 5000],
      ["You're not waiting for it to go away. Only watching what it does.", 7000],
    ],
  ],

  EXPLORE_TEMPORAL: [
    'Is it steady, or does it pulse, or come in waves?',
    'Does it stay constant, or change from moment to moment?',
  ],
  HOLD: [
    [
      ['Stay with it, the way you might watch clouds pass.', 14000],
      ['What is it doing now?', 0],
    ],
    [
      ['Just stay with it for a while.', 14000],
      ["What's here now?", 0],
    ],
    [
      ["Give it some time. You don't need to do anything with it.", 15000],
      ['What do you notice now?', 0],
    ],
  ],
  OBSERVE_MOVEMENT_STATIC: ['Does it stay completely still?', 'Does it stay in exactly the same place?'],
  OBSERVE_MOVEMENT: [
    'Does it stay in exactly the same place?',
    'And does it stay in one place, or do you notice any movement?',
  ],
  OBSERVE_CHANGE: [
    [
      ['Keep watching it closely.', 6000],
      ['It might grow, or shrink, or move, or stay just the same. Any of these is fine.', 9000],
      ['What do you notice now?', 0],
    ],
    [
      ['Notice whether anything shifts when you simply observe it.', 10000],
      ['Is there any part of it that feels different from a moment ago?', 0],
    ],
    [
      ["Keep watching it, the way you'd watch weather.", 10000],
      ['What do you notice now?', 0],
    ],
  ],
  OBSERVE_EDGE_AGAIN: ['Does it still have a clear edge?', 'Are the edges as clear as before?'],
  REACT_MOVED: [
    [
      ['See if you can follow that movement with curiosity.', 8000],
      ["You don't need to stop it.", 3500],
      ['Just notice that the sensation can move.', 5000],
    ],
    [
      ['Notice that movement for a moment.', 6000],
      ["You don't need to change it.", 5000],
    ],
  ],
  REACT_SPREAD: [[['Notice it spreading.', 5000], ["You don't need to hold it in place.", 5000]]],
  REACT_CONTRACT: [[['Notice it gathering.', 5000], ['Let it be whatever size it is.', 5000]]],
  REACT_SOFTENED: [
    [
      ['Notice that.', 4000],
      ["You don't need to hold on to it, or make it continue.", 5000],
    ],
  ],
  REACT_INTENSIFIED: [
    [
      ["That's okay. See if you can stay curious about it, without needing it to change.", 5000],
      ['If you need to move or shift position, that is fine too.', 4500],
    ],
  ],
  REACT_STABLE: [
    [
      ["That's fine. It can stay just as it is.", 5000],
      ['Notice that you can be with it, as it is.', 6000],
    ],
  ],
  REACT_BOUNDARY: [[['Notice the edges softening.', 6000], ['Let them be as clear, or as blurry, as they are.', 5000]]],
  REACT_QUALITY: [[['Notice that {noun}.', 5000], ['Let it be whatever it is now.', 4500]]],
  REAPPRAISE_CORE: [
    [
      ['Notice it simply as sensation. Pressure, warmth, tightness. Coming and going.', 8000],
      ['See if you can let the area around it soften, without needing the sensation itself to change.', 10000],
    ],
    [
      ["You don't need to solve the sensation right now.", 5000],
      ['See if you can notice it without immediately treating it as an emergency.', 9000],
    ],
    [
      ['Can you allow it to be a sensation for a moment, rather than a problem that needs to be fixed?', 10000],
    ],
    [
      ['Notice the difference between feeling something, and needing to react to it.', 10000],
    ],
  ],
  REAPPRAISE_URGE: [
    ['Notice the part of you that wants it gone.', 5000],
    ["You don't have to act on that right now.", 6000],
  ],
  REAPPRAISE_FAMILIAR: [["This is a sensation you've met many times before.", 5000]],
  REAPPRAISE_REFLECT: ['What do you notice when you meet it this way?', 'What is it like to be with it like this?'],
  // Said first, so the end never arrives unannounced. The person gets a moment to finish
  // what they were noticing before attention turns back to the room.
  CLOSE_PREPARE: {
    notice: [
      [
        ["We're coming toward the end of this practice.", 5000],
        ['Take a few more moments with whatever is here.', 9000],
      ],
      [
        ["In a little while, we'll begin to come back.", 5000],
        ['For now, just stay with what you notice.', 9000],
      ],
    ],
    flare: [
      [
        ["We're coming toward the end of this practice.", 5500],
        ["There's no rush. Take a few more breaths with it.", 10000],
      ],
    ],
    sleep: [
      [
        ['Soon, I will go quiet, and let you rest.', 7000],
        ['For a few more moments, just let things be as they are.', 11000],
      ],
    ],
    fear: [
      [
        ["We're coming toward the end of this practice.", 5000],
        ['Take a few more moments with it, at your own pace.', 9000],
      ],
    ],
  },

  CLOSE: {
    notice: [
      ["Now let the sensation do whatever it's going to do.", 5000],
      ["There's no need to check it again.", 4500],
      ['Notice the room around you.', 4500],
      ['Feel where your body meets the chair, or the bed, or the floor.', 5000],
      ["When you're ready, open your eyes.", 7000],
    ],
    flare: [
      ["Now let the sensation do whatever it's going to do.", 5000],
      ["There's no need to check it again.", 4500],
      ['Notice the sounds around you.', 4500],
      ['Feel where your body is supported.', 5000],
      ["When you're ready, open your eyes, and move gently.", 7000],
    ],
    sleep: [
      ["Now let the sensation do whatever it's going to do.", 6500],
      ["There's no need to check it again.", 6500],
      ['Let your body be heavy, and supported.', 8000],
      ["There's nothing else to do now. Just rest.", 12000],
    ],
    fear: [
      ["Now let the sensation do whatever it's going to do.", 5000],
      ["There's no need to check it again.", 4500],
      ['Notice the room around you.', 4500],
      ['Feel where your body meets the chair, or the bed, or the floor.', 5000],
      ["When you're ready, open your eyes.", 7000],
    ],
  },
};
