# Landing page — waitlist

One page, Vercel, Daisy's look (off-white and ink, one misty photograph, lowercase headings,
square controls with an arrow). Goal: 300 sign-ups by launch (LAUNCH.md §5). Same claim rules
as the store page. The page carries the Terms, Privacy and Support pages App Store Connect needs.

---

## Top

**Headline**

> a quiet daily practice for chronic pain.

**Subhead**

> 28 days. A two-minute lesson, then a few minutes of guided somatic tracking with your eyes
> closed. For iPhone, this December.

**Email field + button**

- Placeholder: `your email`
- Button: `join the waitlist →`
- Under it, small: `One email when the beta opens, one at launch, a few in between. Unsubscribe any time.`

**Below the fold, the free practice**

> **try it now: a 5-minute somatic tracking practice.** Find somewhere comfortable, press
> play, close your eyes.
>
> [audio player]
>
> The full 28 days is in Attend.

---

## Section 1 — eyes closed, voice only

> Once a practice starts, there's nothing to read and nothing to tap. A calm voice guides you,
> and leaves room for silence. Pause and end are always one tap away.
>
> For the hard moments too: one tap starts a practice for a flare, a night you can't sleep, or
> a worried moment.

*Screenshot: the session.*

## Section 2 — a path, not a library

> Four weeks, in the order Pain Reprocessing Therapy follows: **understand** how pain works and
> why it can stay loud, **notice** a sensation with curiosity, **soften** fear and bracing,
> **live** with the practice in your day.
>
> One lesson and one practice a day. You always know the next step, and the path keeps your
> place.

*Screenshot: the 28-day path.*

## Section 3 — yours, and honest

> No account. No analytics. Your sessions and check-ins are stored on your iPhone.
>
> A simple 0–10 check-in, kept apart from practice. Progress shows your practice days and your
> pain record side by side — never a score, never a grade.
>
> And rain, forest and water to listen to in the evenings, with a sleep timer.

*Screenshot: Progress.*

---

## FAQ

**Is this saying my pain is in my head?**
No. Your pain is real. All pain, from a broken bone to a migraine, is made by the nervous
system; that's how pain works for everyone, and it makes pain no less real. When pain lasts,
the body's alarm can become more sensitive, sometimes long after an injury has healed,
sometimes with no injury at all. Attend teaches a way to meet sensations with less alarm. It
doesn't decide what is causing your pain. Only you, ideally with your doctor, can weigh that.

**What is somatic tracking?**
A practice from Pain Reprocessing Therapy: resting your attention on a sensation with
curiosity and calm, noticing its edges, its texture, whether it moves, without trying to fix
it. Attend guides it by voice, so your eyes can stay closed.

**Does it replace my treatment?**
No. Attend is a practice to use alongside the care you have. Keep any treatment you're on. If
a pain is new, different from your usual, getting worse quickly, or feels like an emergency,
contact a medical professional.

**My pain is bad every day. Is this for me?**
Attend is for pain that's familiar to you, whether it's mild or severe, constant or in
flares. Practices are three to ten minutes, and there's one made for a flare. Close attention
to the body doesn't suit everyone: if a practice brings up old memories, panic, or a far-away
feeling, open your eyes, look around the room, and stop. Stopping is part of the practice.

**What does it cost?**
Week 1, the flare practice, your check-ins and every sound are free for good. Attend Plus
continues the program from Day 8: $39.99 a year with 7 days free, $7.99 a month, or $99 once.
Founding prices hold until 10 January 2027, and founding members keep theirs.

**What happens to my data?**
There's no account. Sessions and check-ins stay on your iPhone, and there are no analytics.
Guided practices never use the microphone. The guide's lines are voiced by our voice service
(ElevenLabs); the only thing about you in them is the body area a practice rests on, such as
"your lower back", with no name attached. If you join this list, we keep your email to write to
you, and nothing else. Details: [privacy policy].

---

## Final CTA

> **the 28 days start in December.**
> Join the waitlist for a beta spot and the founding price.
>
> `your email` `join the waitlist →`

## Footer

> Attend is a wellness practice and education. It is not a medical device and doesn't diagnose
> or treat any condition, and it isn't a substitute for professional care. Attend is
> independent and not affiliated with the Pain Reprocessing Therapy Center or any clinic.
>
> Terms · Privacy · Support · For clinicians · © 2026 Itai Agami

---

## Notes for building it

- Waitlist storage: Supabase table or the email tool's own list. Whichever, the privacy policy
  names it (it is a third party holding emails). No analytics script, no tracking pixel — Vercel
  Web Analytics is off, to match the app's promise.
- The price line in the FAQ and the CTA's "founding price" wait on Itai's OK; until then use
  "Week 1 is free. Founding prices at launch."
- "For iPhone, this December" depends on the beta go/no-go; change to "this winter" if unsure.
- The FAQ "is this for me" answer quotes the welcome and Settings line added in studio round 2
  (`OnboardingScreen`, `SettingsScreen`); if that line changes, change this too.
