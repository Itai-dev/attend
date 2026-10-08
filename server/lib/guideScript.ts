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
 *     {usual} and {usualWord} are the place and word from their earlier
 *     sessions ("your lower back", "tight"); lines using them are only chosen
 *     when there is something remembered.
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
  SCAN_BRIEF: Line[][];
  SCAN_SHORT: Line[][];
  SCAN_FULL: Line[][];
  SCAN_NOTICE: string[];
  SCAN_USUAL: string[];
  LOCATE_USUAL: string[];
  EXPLORE_USUAL_WORD: string[];
  GUIDE_OBSERVE: Line[][];
  ANSWER: { how: Line[]; breath: Line[]; move: Line[]; time: Line[]; other: Line[] };
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
  EXPLORE_DEEPEN: string[];
  EXPLORE_SHAPE: string[];
  EXPLORE_EDGE: string[];
  EXPLORE_TEMPORAL: string[];
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
  },
  // The body scan, after arriving: attention travels from the feet to the head, one region per
  // step, with silence to feel each one. SCAN_BRIEF is one step (3-minute sessions), SCAN_SHORT
  // and SCAN_FULL are spoken in order, step by step (5 and 10 minutes). Nothing is asked here.
  SCAN_BRIEF: [
    [
      ["Let's take a slow look through the body.", 3500],
      ['Start with your feet, and let attention travel up, through the legs, the hips, the belly and the back.', 9000],
      ['Up through the chest and shoulders, the arms, the neck, and the face.', 9000],
    ],
  ],
  SCAN_SHORT: [
    [
      ["Let's take a slow look through the body, from the feet up.", 3500],
      ['Bring your attention to your feet. Then let it rise slowly through your legs.', 11000],
    ],
    [
      ['Now the hips, the belly, and the lower back.', 6000],
      ['Notice what is there, without changing anything.', 9000],
    ],
    [
      ['Let attention move up, through the chest and upper back, into the shoulders and arms.', 9000],
      ['Then the neck, the jaw, the face.', 9000],
    ],
  ],
  SCAN_FULL: [
    [
      ["Let's take a slow look through the body, from the feet up.", 4000],
      ['Bring your attention to your feet. The soles, the toes, where they rest.', 12000],
    ],
    [
      ['Now let it rise into your ankles and calves, your knees, your thighs.', 12000],
    ],
    [
      ['Into the hips and the pelvis.', 6000],
      ['Notice the weight of your body, held by whatever is under you.', 10000],
    ],
    [
      ['Now the belly, and the lower back.', 6000],
      ['Let the breath move here, however it wants to.', 11000],
    ],
    [
      ['Up through the chest and the upper back.', 6000],
      ['Notice the ribs widening, and settling, with each breath.', 10000],
    ],
    [
      ['Into the shoulders, down the arms, into your hands.', 11000],
    ],
    [
      ['Now the neck, the jaw, the face.', 7000],
      ['And the top of your head.', 9000],
    ],
  ],
  // After the scan. Asked only if nothing was remembered from earlier sessions.
  SCAN_NOTICE: [
    'Of everything you passed through, what is asking for your attention most?',
    'Coming back from the scan, what stood out most?',
  ],
  // After the scan, when earlier sessions point somewhere: start where they usually started.
  SCAN_USUAL: [
    "Now let your attention rest on {usual}, where you've noticed something before. What's there today?",
    'Now bring your attention to {usual}. What do you notice there today?',
  ],
  // A broad place ("my back") or a missing side, and earlier sessions knew more.
  LOCATE_USUAL: ['Is it in {usual}, like before, or somewhere else?', 'Is it {usual} again, or somewhere different today?'],
  // No word for it yet, and earlier sessions had one.
  EXPLORE_USUAL_WORD: ["Before, you called it {usualWord}. Is that the word today, or is it different?"],
  // Guidance between questions: something to do with attention while watching, then silence.
  // Spoken instead of asking again, so observation isn't one question on repeat.
  GUIDE_OBSERVE: [
    [
      ['Let your breath move around it.', 6000],
      ["Not to change it. Just so it isn't alone there.", 12000],
    ],
    [
      ['Let your attention widen, so it holds the sensation and the space around it.', 12000],
      ['The places nearby that feel neutral, or easy.', 10000],
    ],
    [
      ['Notice if any muscles around it are bracing.', 6000],
      ['If they can let go a little, let them. If not, that is fine.', 12000],
    ],
    [
      ['See if you can be curious about it, the way you might watch a cloud.', 12000],
      ['Its edges. Its texture. Whether it stays.', 10000],
    ],
    [
      ['Notice what is underneath it, or beside it.', 12000],
    ],
  ],
  // When the person asks something. Medical questions are answered by fixed text in the app.
  ANSWER: {
    how: [
      ["There's nothing to get right here.", 3000],
      ['Just notice what is there, and say it in your own words. Even "I don\'t know" is an answer.', 4000],
    ],
    breath: [["Breathe however your body wants to. There's no need to change it.", 4000]],
    move: [["Do whatever keeps you comfortable. You can move, or shift, whenever you need to.", 4000]],
    time: [["There's a little time left. I'll tell you before we finish.", 4000]],
    other: [["That's worth wondering about. For now, let's stay with what you notice.", 4000]],
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
  EXPLORE_QUALITY: [
    'Does it feel more like pressure, pulling, squeezing, or something else?',
    'If you had to describe it, is it more like tightness, burning, aching, or something else?',
  ],
  EXPLORE_DEEPEN: ["What does '{word}' feel like right now?", 'When you say {word}, what is it like?', "What's the texture of that {noun}?"],
  EXPLORE_SHAPE: ['Is it a small spot, or more spread out?', 'Does it feel focused in one place, or more diffuse?'],
  EXPLORE_EDGE: ['Does it have a clear edge?', 'Can you find where it ends?'],
  EXPLORE_TEMPORAL: [
    'Is it steady, or does it pulse, or come in waves?',
    'Does it stay constant, or change from moment to moment?',
  ],
  HOLD: [
    [
      ['Just stay with it for a while.', 14000],
      ['When you notice anything, say it.', 0],
    ],
    [
      ["Give it some time. You don't need to do anything with it.", 15000],
      ['Has anything shifted?', 0],
    ],
    [
      ['Keep resting your attention there.', 14000],
      ['How is it now?', 0],
    ],
  ],
  OBSERVE_MOVEMENT_STATIC: ['Does it stay completely still?', 'Does it stay in exactly the same place?'],
  OBSERVE_MOVEMENT: [
    'Does it stay in exactly the same place?',
    'And does it stay in one place, or do you notice any movement?',
  ],
  OBSERVE_CHANGE: [
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
