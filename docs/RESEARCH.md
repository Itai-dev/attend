# The evidence behind the 28-day program

Researched 13 Oct 2026, before the program's lessons and practice scripts were written.
Each design decision below names the finding it rests on. Where the evidence is thin, it
says so — this is a product built on promising, not settled, science.

## 1. Pain Reprocessing Therapy (PRT): the method the program follows

**What the trial found.** Ashar et al. (JAMA Psychiatry, 2022) randomised 151 people with
chronic low back pain to PRT, an open-label placebo injection, or usual care. PRT was one
telehealth session with a physician and eight psychological sessions over four weeks.
After treatment, about two-thirds of the PRT group were pain-free or nearly so, against
about a fifth (placebo) and a tenth (usual care); gains largely held over a year.
([Science-Based Medicine](https://sciencebasedmedicine.org/pain-reprocessing-therapy/))

**The limits.** One trial, mostly white, well-educated, high-functioning participants, low
to moderate back pain, and weak comparison arms. Critics call it promising but in need of
replication. ([Science-Based Medicine](https://sciencebasedmedicine.org/pain-reprocessing-therapy/),
[SBM interview with Yoni Ashar](https://sbm.org/publications/outlook/issues/fall-2023/pain-reprocessing-therapy-as-an-emerging-non-pharmacologic-treatment-for-chronic-pain-an-interview-with-dr-yoni-ashar/full-article))

**Its parts, in the order the treatment manual sequences them**
([PRT supplementary materials](https://www.painreprocessingtherapy.com/wp-content/uploads/2021/03/PRT-Supplementary-Materials-for-Site.pdf)):
1. Education: pain as an alarm that can stay on without ongoing damage; the pain–fear cycle.
2. Evidence gathering: the person collects signs that their pain behaves like a
   sensitised alarm (began in stress, moves, varies with context, eases when absorbed).
3. Somatic tracking: mindful attention to the sensation (quality, place, extent, with
   curiosity) + safety reappraisal + lightness (positive affect).
4. Exposure: tracking during movements and activities that had been avoided.
5. As needed: emotions and stress, self-criticism and self-pressure, self-compassion and
   pleasant states.

**PRT suits primary (nociplastic) pain.** Pain with a clear ongoing medical cause is better
served by other approaches. (SBM interview.)

### What Attend takes, and what it can't

| PRT part | In Attend |
| --- | --- |
| Education | Daily 2-minute lessons, Weeks 1–2 heavy, then lighter. |
| Evidence gathering | Lesson prompts that ask the person to notice their own signs ("does it change when you're absorbed?"). The person draws the conclusion, never the app. |
| Somatic tracking: mindfulness | The guided sessions, as built. |
| Safety reappraisal | **Only conditional and self-led.** An app cannot know that someone's pain is safe. Lessons explain the model; the guide says "notice it without treating it as an emergency", never "you're safe" or "it's your brain". The welcome screens tell anyone with new, changing or severe symptoms to see a doctor first. This is weaker than a clinician's reappraisal, and it's the honest limit of an app. |
| Lightness | Guide lines that invite curiosity and ease; lessons with plain, warm language. |
| Exposure | Week 4: practice before or during an activity from the person's own goal, in small steps. |
| Emotions, self-compassion | Week 3 lessons and practices. |

## 2. Pain science education alone is weak; paired with practice it helps

An umbrella review of 16 systematic reviews found pain neuroscience education (PNE)
**alone** didn't significantly improve pain or disability; **added to active treatment**
it did better, with its most consistent effect on fear of movement. Evidence quality was
low throughout. ([Umbrella review, 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10704151/))

**Decision:** every lesson is paired with a practice the same day, and Week 4 pairs
practice with real activity. Lessons stay short — they set up the practice, they aren't the
treatment.

## 3. A self-guided app can move pain a little; more use, more benefit

Curable's app (pain education, meditation, CBT, expressive writing) was tested against
wait-list in 198 adults over six weeks: small-to-moderate improvement in pain severity
(d ≈ 0.43) and smaller in interference (d ≈ 0.27), still present at 12 weeks; **more use
correlated with more benefit.** ([Canadian Journal of Pain, 2024](https://doaj.org/article/9fe9b63dc21f4adc9fd86309a4f41248))

**Decisions:**
- Expect app-sized effects, not the clinic trial's. Copy never promises "pain-free".
- Engagement is part of the dose, so designing for it is justified — but what's rewarded
  must be the practice itself (see 5).
- Curable is the nearest competitor. Attend's difference: guided eyes-closed sessions
  that rest on the person's own place, and a pain record that refuses verdicts.

## 4. Exposure to avoided activity reduces fear

A small trial (44 people) found graded in-vivo exposure reduced fear of movement,
fear-avoidance beliefs and catastrophising more than graded activity, held at one month;
disability changed only as a trend. ([Epistemonikos record, Pain 2008](https://www.epistemonikos.org/en/documents/b4fbf8eaf61b54ba4a362db93da19a4364150f8e))

**Decision:** Week 4 ("Live") asks for one small step toward the goal chosen in
onboarding, with a short practice before it. "Moments" record what the person did, in
their words. No targets, no amounts — Pattern's pacing work stays out of scope.

## 5. Streaks and engagement: useful, with known failure modes

- **Streaks help once a habit has started.** In ~60,000 students, highlighting streaks
  raised weekly engagement among active users more than personalised reminders; reminders
  were better at getting inactive users started. No discouragement effect after a lapse
  was found there. ([Northwestern IPR working paper, 2026](https://www.ipr.northwestern.edu/documents/working-papers/2026/wp-26-05.pdf))
- **The known harms:** people protect the streak instead of doing the activity; counting
  can drain intrinsic motivation; breaks can lead to quitting; guilt messages ("you made
  Duo sad") are retention through shame.
  ([The Decision Lab](https://thedecisionlab.com/insights/consumer-insights/streak-creep-the-perils-of-too-much-gamification))
- **Missing a day doesn't undo a habit.** Habits took 66 days on average to become
  automatic (range 18–254), and a single missed day didn't affect it.
  ([Lally et al., via Spring.org.uk](https://www.spring.org.uk/2023/01/form-a-habit.php))

**Decisions:**
- Count **practice days per week**, not consecutive days. Two rest days a week are
  built in; nothing resets.
- A return after a break is "welcome back", never "streak lost". No guilt copy anywhere.
- Reminders: one a day, at a time the person chose, and they stop asking after three
  quiet days (then one gentle note a week).
- Rewards (milestones, the week strip, the program path) are all about **showing up**.
  None is about the pain score going down — that would turn practice into a test the
  pain can fail.
- Milestones tie to the person's own goal (Week 4 moments), so the motivation is theirs.

## 6. What this changes in the rules

`AGENTS.md` "Nothing rewards looking at your pain" becomes **"Reward practice, never
pain"**: streak-style counts, milestones and a program path are allowed when they count
practice and forgive breaks; anything that grades the pain is still out.

## 7. Frequencies: the names people know, and what is actually known (20 Oct 2026)

For now the sounds are soft tones at six pitches instead of nature recordings
(174, 285, 396, 432, 528 and 639 Hz). These numbers come with a large online mythology of
"healing frequencies". People know the tones by those numbers, so the app names them that way.
It does not repeat the claims.

- **The solfeggio set.** 396, 417, 528, 639, 741 and 852 Hz were put forward by Joseph Puleo
  and popularized by Leonard Horowitz. 174, 285 and 963 Hz were added later. The story that they
  come from Gregorian chant is not confirmed by musicologists. Science Feedback found no
  evidence for the health claims made for them.
  ([Science Feedback](https://science.feedback.org/review/no-evidence-support-claim-solfeggio-frequencies-remove-toxins-from-body/))
- **432 Hz.** Only small trials exist. A 2019 pilot was done in nurses. A 2025 randomized
  cross-over trial in 43 people with cancer found that heart rate fell with music tuned to both
  432 and 443 Hz. It fell slightly more at 432 Hz, but the difference was not robust.
  ([PMC11755923](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11755923/))
- **528 Hz.** In one study with nine participants, cortisol fell while they listened
  ([Akimoto et al. 2018](https://www.scirp.org/html/2-8204397_87146.htm)). The claims that it
  repairs DNA are unsupported. Even Calm calls the question unsettled.
  ([Calm](https://blog.calm.com/blog/528-hz))
- **40 Hz.** 40 Hz "gamma" stimulation is Alzheimer's research. It uses audiovisual flicker,
  a light and a sound together. It is not a wellness tone, and Attend has none.

**Decisions:**
- Each tone is named by its number ("432 Hz"). That is a name, not a promise.
- The line under each tone describes only how it sounds, for example "Low and warm" or
  "A little brighter".
- No copy says a tone heals, balances, opens a chakra, repairs DNA, raises a vibration, or is a
  frequency "for" anything. The word "solfeggio" never appears in the app. `tests/soundscapes.test.ts`
  guards the sound copy. This is also an App Store risk: guideline 1.4.1 rejects health
  claims that are not backed by evidence.
- Matching a tone to a practice (`soundForPractice`) is done by ear: deeper for rest, the middle
  of the range for looking around. It is never based on an effect. AGENTS.md "Sounds are
  atmosphere, not treatment" applies unchanged.
