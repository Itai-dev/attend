# App Store listing — v1.0

Studio round 2, 18 Oct 2026. Paste-ready. Character counts were checked by script; any edit
has to be re-counted. Prices are the round 1 founding prices and **need Itai's OK**
(LAUNCH.md §1). Rules this copy keeps: describe the practice, never its effect; no "relief",
"treats", "proven", "calm your nervous system"; sounds are atmosphere; no book, author or rival
names in metadata (LAUNCH.md §5).

---

## Name (30) — 29 characters

```
Attend: Chronic Pain Practice
```

Fallback if taken: `Attend — Pain & Calm`.

## Subtitle (30) — 29 characters

```
Somatic tracking, eyes closed
```

## Category

- **Primary:** Health & Fitness. Not Medical: it is a wellness practice and education, not a
  treatment, and Medical brings more review scrutiny.
- **Secondary:** Lifestyle (or none). Not Medical.

## Promotional text (170) — 150 characters

Can be changed any time without a new build. Use it for the founding price and, later, the New
Year push.

```
A two-minute lesson and an eyes-closed somatic tracking practice, every day for 28 days. Week 1 is free. No account. Your record stays on your iPhone.
```

New Year swap (26 Dec → 10 Jan), 127 characters:

```
Start 2027 with 28 days: a short lesson and an eyes-closed practice each day. Week 1 is free. Founding prices until 10 January.
```

## Keywords (100) — 97 characters

No spaces after commas. Nothing already in the name or subtitle (attend, chronic, pain,
practice, somatic, tracking, eyes, closed): Apple combines words across the three fields, so
"back" + "pain" already matches "back pain". No trademarks, authors or rival apps.

```
prt,reprocessing,mindbody,neuroplastic,fibromyalgia,back,neck,migraine,flare,body,scan,sleep,rain
```

Words left out on purpose: "relief", "cure", "anxiety" (outcome or clinical claims), "tms"
(mostly searched for the brain-stimulation treatment), "sarno", "curable" (names). After the first
month, swap the weakest words using App Store Connect's search-term data.

## Description — 1,840 characters with the legal lines (limit 4,000)

```
Attend is a quiet daily practice for people living with chronic pain.

Each day: a two-minute lesson, then a few minutes with your eyes closed while a calm voice guides you through somatic tracking, noticing a sensation with curiosity instead of alarm. Nothing to answer, nothing to get right.

THE 28 DAYS
Four weeks, in the order Pain Reprocessing Therapy follows:
• Understand: how pain works, and why it can stay loud
• Notice: watching a sensation with curiosity
• Soften: fear, bracing, and the urge to fix
• Live: taking the practice into your day

EYES CLOSED, VOICE ONLY
Once a practice starts there's nothing to read or tap. Pause and end are always one tap away. One tap also starts a practice for a flare, a night you can't sleep, a body scan, or a worried moment.

SOUNDS
Rain, forest, stream, ocean, fireside and more, under a practice or on their own with a sleep timer.

YOUR OWN RECORD
A simple 0–10 check-in, kept apart from practice. Your practice and your pain record sit side by side. No scores, no grades.

PRIVATE
No account, no analytics. Sessions and check-ins are stored only on your iPhone. Guided practices never use the microphone.

FREE, AND ATTEND PLUS
Week 1, the flare practice, check-ins and every sound are free for good. Attend Plus continues Days 8–28 and opens every practice any time: $39.99 a year with 7 days free, $7.99 a month, or $99 once.

Attend is not a medical device and doesn't diagnose or treat any condition. Use it alongside the care you have, not instead of it. If a pain is new, different from your usual, getting worse quickly, or feels like an emergency, contact a medical professional.

Subscriptions renew automatically unless cancelled at least 24 hours before the period ends. Manage them in your Apple ID settings.
Terms: https://[domain]/terms
Privacy: https://[domain]/privacy
```

## What's New — v1.0

```
The first version of Attend: the 28-day program, four one-tap practices, seven sounds with a sleep timer, and a pain record that stays on your iPhone. Thank you to everyone who tested it.
```

## Screenshots — 6.9" (1320×2868), in this order

Captions are short lines above the device frame, sentence case, on the off-white ground (dark
ground for 1 and 5). Use sample data that a real person could have: **never a pain line that
falls**, no numbers on the pain chart that suggest an outcome, no body or pain in any
photograph.

| # | Screen | Caption |
| --- | --- | --- |
| 1 | **Session** (always dark): the breathing form, the status word, rain under it | Somatic tracking, guided. Just close your eyes. |
| 2 | **Today**: "day 3" on the photograph, the begin button, the four one-tap rows below | One lesson and one practice a day. One tap for a flare. |
| 3 | **Progress → the 28-day path**: weeks 1–4 named, a few days done | 28 days, in four weeks: understand, notice, soften, live. |
| 4 | **Lesson card**: Day 1 "Pain is real", first card | Two minutes to read. Every pain you feel is real. |
| 5 | **Sounds / Just listen**: a misty photograph, sleep timer set | Rain, forest, water. With a sleep timer. |
| 6 | **Progress**: practice days beside the pain record, with the card's "what this chart does not mean" line visible | Your practice and your own record, side by side. No account. |

Caption 4 quotes the lesson word for word on purpose: it answers "is this saying it's in my
head?" before anyone asks. Caption 6 deliberately says "no account", not "nothing leaves your
phone": with the voice server on, the guide's lines (which can name a body area) go to
ElevenLabs, and purchases go to RevenueCat.

## Age rating

Answer the questionnaire as it is, not as we'd like it:

- **Medical or treatment information:** yes, infrequent/mild — the lessons explain how pain
  works and the app advises seeing a professional. It is education, not treatment advice.
- **Health or wellness topics:** yes.
- Violence, sexual content, profanity, gambling, horror, alcohol/drugs: none.
- **User-generated content, chat, unrestricted web access:** none in the release build (the
  conversational mode and developer tools render only under `__DEV__`).
- **Messaging / contact with other users:** none.
- Expect a 13+ or 16+ result rather than 4+; that's fine — the audience is adults. Don't
  understate the medical-information answer to get 4+: a mismatch is a common rejection.

## App Review notes

```
Thank you for reviewing Attend.

No login or account. Everything is stored on the device.

To reach a guided session:
1. Open the app. The welcome is seven short screens; tap through (about a minute). It ends on "your first day is ready" — tap "begin day 1".
2. Read the three lesson cards (swipe or tap), then tap "begin the practice". The guided session starts: a calm voice, a breathing form, pause and end. It runs about 5 minutes; you can end it at any time with the end control.
Quicker route after the welcome: on Today, tap "in a flare" (3 minutes).

Microphone: guided sessions do not use the microphone, and nothing the user says is recorded or sent. The app asks for notification permission only if the user chooses a daily reminder in the welcome.

Purchases: Week 1, the flare practice, the pain record and all sounds are free. Attend Plus (Days 8–28 and three more practices) is offered from Settings → Attend Plus, and when a user taps "begin day 8". To see the paywall without completing seven days, use Settings → Attend Plus. A sandbox account works for the 7-day trial.

Attend is a wellness practice and education, not a medical device. It does not diagnose or treat. The welcome includes a safety note directing users to a medical professional for anything new, unexplained, worsening quickly, or urgent.

Contact: Itai Agami, [support email], [phone]
```

**Must be true before submitting** (found while writing this; the copy above depends on it):

- `app.json` still declares `NSMicrophoneUsageDescription` / speech-recognition strings that
  say "Attend listens while you speak during a session, so the guide can respond". That
  contradicts the review note and the store page. Either remove the speech plugin from the
  release build or reword the strings to the spoken welcome only, and confirm the release build
  never requests the microphone.
- `src/domain/welcome.ts` intro still says "close your eyes and talk. The guide listens". If any
  release path can show it, it must change; the tap welcome (`OnboardingScreen`) is correct.
- Terms, Privacy and Support URLs live on the landing page; a paywall screenshot for the
  subscription review.
