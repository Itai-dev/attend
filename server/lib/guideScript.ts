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
 *     app and can't be changed remotely. That includes the arrival's doctor and
 *     emergency lines and "You can open your eyes, or stop, at any time.": the
 *     app adds them to every arrival (src/engine/guide/lines.ts, ARRIVAL_SAFETY),
 *     so don't write them here.
 *   - Guided sessions never listen, so no line a guided session can reach may be a
 *     question, and none may call the sensation safe, harmless or "not a problem".
 *
 * voice.direction is read by ElevenLabs v4 before every line — delivery tags
 * like [softly] [slowly] [whispers] [long pause]. Changing it re-records every
 * line on next use.
 */

export type Line = [text: string, pauseMs: number];
/** The program's practice themes (src/domain/program.ts). Each guided session leans on one. */
export type GuidedTheme =
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
type ByType<T> = { notice: T; flare: T; sleep: T; fear: T };

export type GuideScript = {
  voice: { direction: string };
  ARRIVE: ByType<Line[][]>;
  SCAN_BRIEF: Line[][];
  SCAN_SHORT: Line[][];
  SCAN_FULL: Line[][];
  /** The body scan practice (the scan-10 preset) only: sixteen steps, feet to scalp, then the whole body. */
  SCAN_BODY: Line[][];
  SCAN_NOTICE: string[];
  SCAN_USUAL: string[];
  LOCATE_USUAL: string[];
  EXPLORE_USUAL_WORD: string[];
  GUIDE_OBSERVE: Line[][];
  GUIDED_SETTLE: Line[][];
  GUIDED_OBSERVE: Line[][];
  GUIDED_OPEN: Line[][];
  GUIDED_THEMES: Record<GuidedTheme, Line[][]>;
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
        // Scoped to the practice: "nothing you need to fix" said of a body reads as "nothing is wrong".
        ["There's nothing to fix in this practice.", 5500],
      ],
      [
        ['Take a moment to settle in.', 3500],
        ['Get comfortable, and let your eyes close.', 5000],
        // Scoped to the practice: "nothing you need to fix" said of a body reads as "nothing is wrong".
        ["There's nothing to fix in this practice.", 5500],
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
        // "You can stop at any time" and the doctor and emergency lines are added by the app.
        ["We'll go slowly.", 5500],
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
  // The body scan practice (the scan-10 preset), and nothing else: program days, including the
  // open-theme Days 14, 21 and 28, keep SCAN_FULL and their theme. Sixteen steps that name only
  // parts of the body, never {place} or a sensation, so it suits anyone, with or without a place.
  // About 9 minutes with the test voice; the session's time guard then closes it.
  SCAN_BODY: [
    [["Let's take a slow look through the body, from the feet up.", 4000], ['Nothing to find, and nothing to change. Just attention, moving.', 8000]],
    [['Start with your feet.', 4000], ['The soles. The heels. The toes.', 12000], ['Notice where they rest, and what holds them.', 14000]],
    [['Now let attention rise into the ankles.', 6000], ['The shins, the calves, the backs of the knees.', 16000]],
    [['Up into the thighs.', 5000], ['Their weight, resting on whatever is under you.', 14000], ['If attention wanders, that is part of it. Bring it back to where you were.', 12000]],
    [['Now the hips, and the pelvis.', 6000], ['The places where you are sitting, or lying. Where the body is held.', 18000]],
    [['Let attention come to the belly.', 6000], ['The breath moving here, however it moves.', 18000]],
    [
      ['If a place is loud, let attention pass over it, like weather.', 8000],
      ['It can be there. Attention keeps moving.', 10000],
      ['If attention makes anything louder, open your eyes and look around the room.', 8000],
    ],
    [['Now the lower back.', 6000], ['Either side of the spine. Wherever the back meets support.', 18000]],
    [['Let attention climb the spine, into the upper back.', 8000], ['The shoulder blades. The space between them.', 16000]],
    // No breastbone, no throat: for someone with health anxiety those are the places they check.
    [['Now the chest.', 5000], ['The ribs, widening and settling with each breath.', 14000], ['The ribs, resting.', 12000]],
    [['Now let attention find your hands.', 6000], ['The palms. The backs of the hands. Each finger.', 14000], ['Up through the wrists, the forearms, the elbows, the upper arms.', 14000]],
    [['Into the shoulders.', 6000], ['Wherever they sit, they can stay just as they are.', 16000]],
    [['Now the neck.', 5000], ['The back of the neck, the sides.', 16000]],
    [['The jaw.', 5000], ['The hinge, just in front of the ears.', 12000], ['The cheeks. The eyes, resting behind the lids. The forehead.', 16000]],
    [['And the top of the head.', 6000], ['The scalp. The back of the head, where it rests.', 16000]],
    [['Now let attention widen, until it holds the whole body at once.', 12000], ['Feet to scalp. The body as a whole, breathing.', 18000], ['Nothing to do here but be with it.', 24000]],
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
  // Guided sessions (the default since 12 Oct 2026): nothing is asked. After the scan,
  // attention rests on one place ({place}: from the latest check-in, or where earlier sessions
  // usually went) and the guide gives it something to do, with long silences, until it is
  // time to close. GUIDE_OBSERVE above is used here too. With no place, GUIDED_OPEN fills the
  // time after OPEN_AWARENESS. Lines here may not assume the person said anything.
  GUIDED_SETTLE: [
    [
      ['Now let your attention come to {place}.', 6000],
      ['Whatever is there, let it be there.', 10000],
    ],
    [
      ['Let your attention rest on {place}.', 6000],
      ["You don't need to name what you find. Just notice it.", 10000],
    ],
  ],
  GUIDED_OBSERVE: [
    [
      ['If there is a sensation there, notice its edges.', 8000],
      ['Where it starts, and where it fades.', 12000],
    ],
    [
      ['Notice its texture. Dull, or sharp, or something without a name.', 12000],
    ],
    [
      ['Notice whether it pulses, or stays steady.', 12000],
    ],
    [
      ['Notice whether it stays the same, moment to moment, or shifts a little.', 14000],
    ],
    [
      ['If your attention wanders, that is fine.', 5000],
      ['Gently bring it back to {place}.', 12000],
    ],
    [
      ['Let your breath be easy.', 6000],
      ['Let the sensation be there, with the breath moving around it.', 12000],
    ],
    [
      ['Nothing here needs an answer.', 6000],
      ['Just stay with it, a little longer.', 14000],
    ],
    [
      ['If a sensation gets too loud, let attention move to your hands, or the sounds in the room.', 8000],
      ['That is part of the practice too. Come back when you are ready.', 12000],
    ],
  ],
  GUIDED_OPEN: [
    [
      ['Feel the weight of your body, resting.', 10000],
      ['Let it be held.', 12000],
    ],
    [
      ['Notice the breath at the belly.', 8000],
      ['Rising, and falling.', 12000],
    ],
    [
      ['If any part of the body asks for attention, let it.', 8000],
      ['Then let attention widen again.', 12000],
    ],
    [
      ['Notice the air on your skin. Its temperature. Its stillness.', 12000],
    ],
    [
      ['If your attention wanders, that is fine.', 5000],
      ['Gently bring it back to the breath.', 12000],
    ],
  ],
  // The program's themes (src/domain/program.ts). After settling on {place}, a guided session
  // speaks its day's theme first, then the general banks above. No line may assume the person
  // said anything, and none may claim the sensation is safe or harmless.
  GUIDED_THEMES: {
    settle: [
      [['Let your attention rest, the way a hand rests on a table.', 8000], ['No effort. Just resting.', 12000]],
      [['Notice that you can be here with it, for this moment.', 12000]],
    ],
    locate: [
      [['Find the place where it is clearest.', 8000], ['Not to judge it. Just to know where it is.', 12000]],
      [['Notice whether it sits near the surface, or deeper in.', 6000], ['Just look.', 12000]],
      [['Notice how big the area is. The size of a coin, or a hand.', 12000]],
    ],
    breath: [
      [['Let the breath come and go on its own.', 8000], ['Imagine it moving around {place}, and out again.', 12000]],
      [['On the out-breath, let the shoulders drop a little.', 10000], ['And again.', 12000]],
      [['Notice the pause at the end of each breath out.', 12000]],
    ],
    edges: [
      [['If a sensation stands out, look for its edge.', 6000], ['Notice where it stops, and something easier begins.', 12000]],
      [['Trace the outline slowly, as if with a fingertip.', 14000]],
      [['Notice if the edge is sharp, or fades slowly.', 6000], ['Either is fine. Just notice.', 12000]],
      [['Rest your attention just outside the edge, in what feels neutral.', 12000]],
    ],
    moves: [
      [['If a sensation stands out, watch whether it stays in one place, or drifts.', 14000]],
      [['Notice if it pulses, or comes and goes.', 12000]],
      [['If it moves, let your attention follow, loosely.', 6000], ['If it stays still, watch the stillness.', 12000]],
    ],
    texture: [
      [['Notice its texture.', 5000], ['Tight, warm, buzzing, dull, or something without a name.', 12000]],
      [['If a word arrives, let it be a description, not a verdict.', 12000]],
      [['Notice whether the texture is the same all the way through.', 12000]],
    ],
    curious: [
      [['Look at it as if for the first time.', 6000], ['Just what is here, right now.', 12000]],
      [['See if a little curiosity can sit beside it.', 6000], ['Even a small wondering is enough.', 12000]],
      [['Watch it the way you might watch a cloud.', 14000]],
    ],
    brace: [
      [['Notice if anything is bracing. The shoulders, the jaw, the hands, the belly.', 10000], ['Let one of them soften a little.', 12000]],
      [['Bracing is a kind of protection.', 5000], ['See if it can rest, just for this breath.', 12000]],
      [['Let the place around the sensation be a little looser.', 14000]],
    ],
    fear: [
      // Not "notice where the fear sits": that sends a worried person searching the body.
      [['If there is fear here, notice it too.', 6000], ['Let the fear be here too, without looking for it.', 12000]],
      [['Let the fear and the sensation sit side by side.', 6000], ['You don’t need to push either away.', 12000]],
      [['Fear makes sense. Meet it the way you would meet a frightened friend.', 14000]],
    ],
    urge: [
      [['Notice any urge to move, rub, or check it.', 8000], ['See if you can let the urge be there, and not act on it, just for now.', 14000]],
      [['Urges rise, and pass, like waves.', 6000], ['Watch one pass.', 12000]],
      [['Nothing needs fixing in this practice.', 12000]],
    ],
    kind: [
      [['Imagine the sensation belongs to someone you care about.', 6000], ['Notice the tone you would use with them.', 12000]],
      [['Offer yourself the same tone.', 5000], ['This is hard. And you are here.', 12000]],
      [['Let a little warmth be there, beside it.', 14000]],
    ],
    pleasant: [
      [['Now find a place in the body that feels easy, or neutral.', 8000], ['The hands, the feet, the face.', 12000]],
      [['Notice anything pleasant, however small. Warmth, support, the breath.', 14000]],
      [['Let attention rest there for a while. That is part of the practice too.', 14000]],
    ],
    activity: [
      [['Bring to mind the small step you plan to take today.', 8000], ['Picture yourself starting it, slowly.', 12000]],
      [['Notice what the body does as you picture it.', 8000], ['Meet whatever arises with the same curiosity.', 12000]],
      [['When you take the step, you can come back to this: notice, breathe, carry on gently.', 12000]],
    ],
    flare: [
      [['Let the breath be slow.', 6000], ['Nothing to do here but breathe.', 10000]],
      [['Find the edges, even roughly.', 6000], ['Let your attention rest just outside them.', 10000]],
      [['Soften what you can. Let the rest be as it is.', 12000]],
      [['If this is too much, let attention move to your hands, or the sounds in the room.', 8000], ['You can shift, or move, whenever you need to.', 12000]],
    ],
    open: [
      [['Let attention widen, until it holds the whole body.', 12000]],
      [['Notice the places that feel ordinary, or easy.', 12000]],
    ],
  },
  OPEN_AWARENESS: [
    ["Let's simply be with the body as a whole.", 5000],
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
      // Not "without treating it as an emergency": that tells the person it isn't one.
      ['See if you can notice it for a moment, without rushing to do anything about it.', 9000],
    ],
    // Guided sessions reach every variant here, and they never ask. "Rather than a problem" also
    // told the person their sensation is not a problem, which only a doctor can say.
    [
      ['For this moment, let it simply be a sensation.', 10000],
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
      ["Now let whatever is there be as it is.", 5000],
      ["There's no need to check it again.", 4500],
      ['Notice the room around you.', 4500],
      ['Feel where your body meets the chair, or the bed, or the floor.', 5000],
      ["When you're ready, open your eyes.", 7000],
    ],
    flare: [
      ["Now let whatever is there be as it is.", 5000],
      ["There's no need to check it again.", 4500],
      ['Notice the sounds around you.', 4500],
      ['Feel where your body is supported.', 5000],
      ["When you're ready, open your eyes, and move gently.", 7000],
    ],
    sleep: [
      ["Now let whatever is there be as it is.", 6500],
      ["There's no need to check it again.", 6500],
      ['Let your body be heavy, and supported.', 8000],
      ["There's nothing else to do now. Just rest.", 12000],
    ],
    fear: [
      ["Now let whatever is there be as it is.", 5000],
      ["There's no need to check it again.", 4500],
      ['Notice the room around you.', 4500],
      ['Feel where your body meets the chair, or the bed, or the floor.', 5000],
      ["When you're ready, open your eyes.", 7000],
    ],
  },
};
