import type { SessionType } from '../../domain/types';

/**
 * The guide's voice, written down.
 *
 * Calm, sparse, confident, human. Short sentences. No thanking, no "I hear
 * you", no praise, no apology for the person's pain, no therapy phrases.
 * Silence is part of every line: the number after each one is how long the
 * guide stays quiet before going on.
 *
 * Variants exist so a second session does not sound like a recording of the
 * first. The brain picks one it has not used yet in this session.
 *
 * `{noun}` is the person's own word in noun form ("tightness"), `{word}` is
 * the word as they said it ("tight"), `{place}` is where it is ("the left
 * side of your neck"), `{dest}` is where it moved to.
 */

export type Line = [text: string, pauseMs: number];

export const ARRIVE: Record<SessionType, Line[][]> = {
  notice: [
    [
      ['Take a moment to settle in.', 3500],
      ['Let the phone rest, and let your eyes close.', 4500],
      ["There's nothing you need to fix right now.", 5500],
    ],
    [
      ['Take a moment to settle in.', 3500],
      ['Get comfortable, and let your eyes close.', 5000],
      ["There's nothing you need to fix right now.", 5500],
    ],
  ],
  flare: [
    [
      ["Let's take this slowly.", 3500],
      ['Let the phone rest, and let your eyes close.', 4500],
      ["You don't have to make anything go away right now.", 5000],
      ['Let your breath be however it is.', 5000],
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
      ["We'll go slowly. You can stop at any time, just by saying so.", 5500],
    ],
  ],
};

export const NOTICE_ASK: Record<SessionType, string[]> = {
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
};

export const NOTICE_RETRY: Line[] = [
  ["That's fine. Notice wherever your attention goes first, even if it's small.", 0],
  ["There's no right answer. Even something subtle is enough.", 0],
];

export const NOTICE_SILENCE: Line[][] = [
  [
    ['Take your time.', 6000],
    ["Whenever you're ready, say what you notice.", 0],
  ],
  [
    ["There's no hurry.", 6000],
    ["When something stands out, just say it out loud.", 0],
  ],
];

export const OPEN_AWARENESS: Line[] = [
  ["Then let's simply be with the body as a whole.", 5000],
  ['Feel where it is supported.', 9000],
  ['Notice the breath moving, without changing it.', 12000],
  ['Let your attention be wide, and soft.', 12000],
];

export const LOCATE_ACK: string[] = [
  'Stay with the area where you notice it most clearly.',
  'Let your attention rest there.',
  'Stay with that for a moment.',
  'Stay there for a moment.',
];

export const LOCATE_WHERE: string[] = ['Where do you feel that most clearly?', 'Where in your body is that {noun}?'];
export const LOCATE_NARROW: string[] = ['Where in {place} do you feel it most clearly?', 'Can you find the place in {place} where it is clearest?'];
export const LOCATE_SIDE_SIDED: string[] = ['Is it more on one side, or more central?', 'Is it on one side, or in the middle?'];
export const LOCATE_SIDE_PAIRED: string[] = ['Which side do you feel it on?', 'Is it on the left, the right, or both?'];

export const ACK_WORD: string[] = ['Notice that {noun}.', 'Stay with that {noun}.', 'Notice that.', 'Stay there for a moment.'];
export const ACK_PLAIN: string[] = ['Notice that.', 'Stay there for a moment.', 'Give that a few seconds.', 'Interesting.'];
export const ACK_UNCERTAIN: string[] = ["That's fine. It doesn't need a name.", "That's alright. Just stay near it."];
export const ACK_SILENCE: string[] = ['Take your time.', 'Stay with it.', "There's no hurry."];

export const EXPLORE_QUALITY: string[] = [
  'Does it feel more like pressure, pulling, squeezing, or something else?',
  'If you had to describe it, is it more like tightness, burning, aching, or something else?',
];
export const EXPLORE_DEEPEN: string[] = ["What does '{word}' feel like right now?", 'When you say {word}, what is it like?', "What's the texture of that {noun}?"];
export const EXPLORE_SHAPE: string[] = ['Is it a small spot, or more spread out?', 'Does it feel focused in one place, or more diffuse?'];
export const EXPLORE_EDGE: string[] = ['Does it have a clear edge?', 'Can you find where it ends?'];
export const EXPLORE_TEMPORAL: string[] = [
  'Is it steady, or does it pulse, or come in waves?',
  'Does it stay constant, or change from moment to moment?',
];

export const HOLD: Line[][] = [
  [
    ['Just stay with it for a while.', 14000],
    ["What's here now?", 0],
  ],
  [
    ["Give it some time. You don't need to do anything with it.", 15000],
    ['What do you notice now?', 0],
  ],
];

export const OBSERVE_MOVEMENT_STATIC: string[] = ['Does it stay completely still?', 'Does it stay in exactly the same place?'];
export const OBSERVE_MOVEMENT: string[] = [
  'Does it stay in exactly the same place?',
  'And does it stay in one place, or do you notice any movement?',
];
export const OBSERVE_CHANGE: Line[][] = [
  [
    ['Notice whether anything shifts when you simply observe it.', 10000],
    ['Is there any part of it that feels different from a moment ago?', 0],
  ],
  [
    ["Keep watching it, the way you'd watch weather.", 10000],
    ['What do you notice now?', 0],
  ],
];
export const OBSERVE_EDGE_AGAIN: string[] = ['Does it still have a clear edge?', 'Are the edges as clear as before?'];

export const REACT_MOVED: Line[][] = [
  [
    ['See if you can follow that movement with curiosity.', 8000],
    ["You don't need to stop it.", 3500],
    ['Just notice that the sensation can move.', 5000],
  ],
  [
    ['Notice that movement for a moment.', 6000],
    ["You don't need to change it.", 5000],
  ],
];
export const REACT_SPREAD: Line[][] = [[['Notice it spreading.', 5000], ["You don't need to hold it in place.", 5000]]];
export const REACT_CONTRACT: Line[][] = [[['Notice it gathering.', 5000], ['Let it be whatever size it is.', 5000]]];
export const REACT_SOFTENED: Line[][] = [
  [
    ['Notice that.', 4000],
    ["You don't need to hold on to it, or make it continue.", 5000],
  ],
];
export const REACT_INTENSIFIED: Line[][] = [
  [
    ["That's okay. See if you can stay curious about it, without needing it to change.", 5000],
    ['If you need to move or shift position, that is fine too.', 4500],
  ],
];
export const REACT_STABLE: Line[][] = [
  [
    ["That's fine. It can stay just as it is.", 5000],
    ['Notice that you can be with it, as it is.', 6000],
  ],
];
export const REACT_BOUNDARY: Line[][] = [[['Notice the edges softening.', 6000], ['Let them be as clear, or as blurry, as they are.', 5000]]];
export const REACT_QUALITY: Line[][] = [[['Notice that {noun}.', 5000], ['Let it be whatever it is now.', 4500]]];

export const REAPPRAISE_CORE: Line[][] = [
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
];
export const REAPPRAISE_URGE: Line[] = [
  ['Notice the part of you that wants it gone.', 5000],
  ["You don't have to act on that right now.", 6000],
];
export const REAPPRAISE_FAMILIAR: Line[] = [["This is a sensation you've met many times before.", 5000]];
export const REAPPRAISE_REFLECT: string[] = ['What do you notice when you meet it this way?', 'What is it like to be with it like this?'];

export const CLOSE: Record<SessionType, Line[]> = {
  notice: [
    ["Now let the sensation do whatever it's going to do.", 5000],
    ["There's no need to check it again.", 4500],
    ['Notice the room around you.', 4500],
    ['Feel where your body meets the chair, or the bed, or the floor.', 5000],
    ["When you're ready, open your eyes.", 0],
  ],
  flare: [
    ["Now let the sensation do whatever it's going to do.", 5000],
    ["There's no need to check it again.", 4500],
    ['Notice the sounds around you.', 4500],
    ['Feel where your body is supported.', 5000],
    ["When you're ready, open your eyes, and move gently.", 0],
  ],
  sleep: [
    ["Now let the sensation do whatever it's going to do.", 6500],
    ["There's no need to check it again.", 6500],
    ['Let your body be heavy, and supported.', 8000],
    ["There's nothing else to do now. Just rest.", 0],
  ],
  fear: [
    ["Now let the sensation do whatever it's going to do.", 5000],
    ["There's no need to check it again.", 4500],
    ['Notice the room around you.', 4500],
    ['Feel where your body meets the chair, or the bed, or the floor.', 5000],
    ["When you're ready, open your eyes.", 0],
  ],
};

export const SAFETY_ASK: string[] = [
  'Before we go on: is this a sensation you know well, or is it something new?',
];
export const SAFETY_CLOSE: Line[] = [
  ["Let's pause the practice here.", 3000],
  ['This practice is meant for sensations you already know well.', 3500],
  ['Something new or changing deserves a proper look from a doctor, or another medical professional.', 4000],
  ['If it feels severe or urgent, please contact emergency services now.', 3500],
  ['You can open your eyes.', 0],
];
export const CRISIS_CLOSE: Line[] = [
  ["I'm going to stop the practice here.", 2500],
  ['What you just said matters more than this session.', 3000],
  ["If you might act on these thoughts, please contact your local emergency number, or a crisis line, now.", 3500],
  ['If you can, reach out to someone you trust, and let them know how you are.', 3500],
  ['You can open your eyes.', 0],
];
export const EARLY_CLOSE: Line[] = [
  ["Okay. Let's stop here.", 3000],
  ['Notice the room around you.', 4000],
  ["When you're ready, open your eyes.", 0],
];
export const RESUME: Line = ["Let's continue.", 2500];
