# Round 2 copy (copywriter), ready to build

All lines checked against `FORBIDDEN_GUIDE_LANGUAGE` and the claims regex in
`tests/program.test.ts`: no question marks, no "relax", no "safe" or "harmless".

## 1. Body scan: a new bank, `SCAN_BODY`

- Used by the `scan-10` preset only. Do not replace `SCAN_FULL`, and do not pick the bank by
  theme:
  - `SCAN_FULL` plays in every 10-minute session, including program Days 14, 21 and 28.
  - Those days are also theme `open` and must still hear `GUIDED_THEMES.open` (there is a test
    for it).
- No `{place}`, `{usual}`, `{word}` or `{noun}` anywhere in the bank, and no unanchored "it" or
  "the sensation".
- Timing with the test voice model (70 ms per character, plus each line's pause): the scan runs
  about 8:56. The early close (600 s minus the 70 s reserve) moves straight to `CLOSE`, and the
  session ends at about 10:17.
- Wiring: add `SCAN_BODY` to the `GuideScript` type and to `lines.ts`, with a fallback when the
  remote script lacks it. Add it to the scan prefetch in `VoiceSessionProvider`.

```ts
SCAN_BODY: [
  [["Let's take a slow look through the body, from the feet up.", 4000], ['Nothing to find, and nothing to change. Just attention, moving.', 8000]],
  [['Start with your feet.', 4000], ['The soles. The heels. The toes.', 12000], ['Notice where they rest, and what holds them.', 14000]],
  [['Now let attention rise into the ankles.', 6000], ['The shins, the calves, the backs of the knees.', 16000]],
  [['Up into the thighs.', 5000], ['Their weight, resting on whatever is under you.', 14000], ['If attention wanders, that is part of it. Bring it back to where you were.', 12000]],
  [['Now the hips, and the pelvis.', 6000], ['The places where you are sitting, or lying. Where the body is held.', 18000]],
  [['Let attention come to the belly.', 6000], ['The breath moving here, however it moves.', 18000]],
  [['If a place is loud, let attention pass over it, like weather.', 8000], ['It can be there. Attention keeps moving.', 10000]],
  [['Now the lower back.', 6000], ['Either side of the spine. Wherever the back meets support.', 18000]],
  [['Let attention climb the spine, into the upper back.', 8000], ['The shoulder blades. The space between them.', 16000]],
  [['Now the chest.', 5000], ['The ribs, widening and settling with each breath.', 14000], ['The breastbone, at the center.', 12000]],
  [['Now let attention find your hands.', 6000], ['The palms. The backs of the hands. Each finger.', 14000], ['Up through the wrists, the forearms, the elbows, the upper arms.', 14000]],
  [['Into the shoulders.', 6000], ['Wherever they sit, they can stay just as they are.', 16000]],
  [['Now the neck.', 5000], ['The back of the neck, the sides, the throat.', 16000]],
  [['The jaw.', 5000], ['The hinge, just in front of the ears.', 12000], ['The cheeks. The eyes, resting behind the lids. The forehead.', 16000]],
  [['And the top of the head.', 6000], ['The scalp. The back of the head, where it rests.', 16000]],
  [['Now let attention widen, until it holds the whole body at once.', 12000], ['Feet to scalp. The body as a whole, breathing.', 18000], ['Nothing to do here but be with it.', 24000]],
],
```

## 2. Listen to the lesson

- **Intro:** `['Day {n}. {lesson title}.', 2500], ['You can close your eyes, and just listen.', 3500]`
- **Between cards:** nothing spoken. Leave about 2.5 s of silence, and about 4 s before a
  `notice` line.
- **Into the practice:** `["That's today's lesson.", 2500], ['Now, the practice.', 3500]`,
  then the usual `ARRIVE`, unchanged.
- **Counting and voice:**
  - Listening to the end counts as read (`markRead`).
  - The guide's one voice reads the lesson, and lesson audio goes in the same cache as practice
    audio.
- **When listen opens first** (researcher):
  - Listen and read are equal options on every lesson.
  - From 21:00 local, or when the welcome focus is Nights, listen comes first, on a dark
    screen, with "read instead" one tap away.

## 3. Day 7: "your first week"

- **Where:** a card on Today, the day after Day 7 is done. Never on the same screen as a
  Day 8 paywall.
- **Kicker:** your first week
- **Title:** a week of practice
- **Lines** (leave out a line whose count is 0 or that has nothing to show):
  - "{days} days of practice, {minutes} minutes with eyes closed." Count active minutes only,
    and never write "of 7".
  - "{lessons} lessons."
  - "How practice felt: {chips}." List the chips tapped, in chip order, lowercase, with no
    counts or ranking. If only hard today was tapped: "How practice felt: hard today. Hard
    ones count the same."
- **Closing:** "Keep noticing your own signs, and saving moments as they come. They're your evidence,
  gathered by you."
- **Optional prompt** (researcher): "On Day 4 you read some signs. Which, if any, have you
  noticed?"
  - Chips: the four signs, "none of these", "not sure", and "not now".
  - It has three states: never asked, skipped, or answered. It is asked once.
  - The answers feed nothing.
  - The reply to "none": "That's worth knowing too. Signs can show up later, or not at all. You
    can talk them over with your doctor."
- **End of the card:** a footnote, "day 8 opens tomorrow", and a "done →" button.

## 4. Reminders

**Scheduling**
- Schedule dated one-off reminders, not a repeating daily one, so the rules hold without
  opening the app.
  - Daily for the next 4 days, skipping today once it's practiced.
  - Then weekly.
- No reminder fires after today's practice is done.

**Daily**
- Title: `day {n} · {lesson title, lowercase}`. Day 28 is `day 28 · the last day`.
- Bodies, rotating:
  1. "{m} minutes, or 3 if that's what today has."
  2. "A short lesson, then eyes closed. {m} minutes, or 3 on a low day."
  3. "Eyes closed, just listen. {m} minutes, or 3 if that's what today has."
  4. "Listen to the lesson, then the practice. 3 minutes is there too."
  5. "Ready when you are. There's a 3-minute version if energy is low."
- On a 3-minute day: "3 minutes, eyes closed."

**After Day 28**
- "A practice is here whenever you'd like one."
- "The body scan, a flare practice, or 3 quiet minutes. Here when you want them."

**Weekly, after four quiet days**
1. "Whenever you'd like to come back, day {n} is right where it was."
2. "Nothing has reset. Day {n} is here whenever you are."
3. "Your practice is here. Nothing to catch up on."
4. "Day {n} is waiting, just as it was. 3 minutes is enough to begin."
5. "A few minutes, eyes closed, whenever you want them. Day {n} is ready."
6. "Come back any time. The next practice starts from where you are."

**Rules for all of them** (researcher)
- No health words on the lock screen.
- Never a count of days missed.
- Never "waiting" as an obligation.

## 5. A shorter day

- **Rule:** a program day is done after 3 or more active minutes of that day's practice, or when
  the practice ends. This replaces the 90-second rule. Paused time doesn't count, and the lesson
  stays optional.
- **The short version:** a scripted short version of the same theme, not a long practice cut off.
- **On Today:** "short on energy? 3 minutes completes the day."

## 6. Sleep (researcher)

- **Sound:** after the voice ends, the sound carries on as a listen on a 30-minute timer, then
  fades.
- **Screen:**
  - No keep-awake, so the phone can lock.
  - No end haptic, no After screen.
  - If the phone is woken: near-black, a very dim breathing form, "resting", and stop.
- **Next morning:** Today shows "last night · before sleep · 8 min".
- **Counting:** the session counts as practice even if the person fell asleep. Count the guided
  minutes only.
