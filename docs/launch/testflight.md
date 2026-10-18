# From this branch to an external TestFlight beta

Studio round 4, 18 Oct 2026. Itai's step-by-step, on Windows (PowerShell), from
`look-and-sound` to 30–50 founding testers. EAS account `itai26`, `ascAppId` 6818860819,
bundle `com.itaiagami.attend`. Replace anything in `<angle brackets>`.

---

## 1. Before building

### 1.1 The app token (deters strangers from running up the voice bill)

The server checks `ATTEND_APP_TOKEN` (`server/api/tts.ts`, `agent.ts`, `guide.ts`). The app
sends `EXPO_PUBLIC_ATTEND_APP_TOKEN` as the `x-attend-token` header (`src/config.ts`). The two
values must be identical. The token isn't a secret, since it ships inside the app. It only
keeps casual callers out.

```powershell
# a random token
[guid]::NewGuid().ToString("N")

# EAS: builds read it at build time (the production profile uses environment "production")
npx eas-cli@latest env:create --name EXPO_PUBLIC_ATTEND_APP_TOKEN --value <token> --environment production --environment preview --environment development --visibility sensitive
npx eas-cli@latest env:list --environment production
```

If `env:create` complains, add it at expo.dev → attend → Environment variables instead.
Add the same line to `.env.local` (it's gitignored) so `npx expo start` keeps working:
`EXPO_PUBLIC_ATTEND_APP_TOKEN=<token>`.

**Vercel, after EAS.** vercel.com → the `attend-server` project → Settings → Environment
Variables → add `ATTEND_APP_TOKEN` = `<token>`, for Production and Preview → Save. Then go to
Deployments → the latest → **Redeploy**, because a new variable only applies to new deployments.

> The moment Vercel has the token, **every build made without it goes silent**. That includes
> tonight's build and an old "Attend Dev" install. Expire tonight's build in TestFlight (iOS
> builds → the build → Expire) so no one installs it.

Check it (`curl.exe`, not PowerShell's `curl` alias):

```powershell
curl.exe https://attend-server-ochre.vercel.app/api/health
# {"ok":true,"voice":true,"guide":true}
curl.exe -s -o NUL -w "%{http_code}`n" "https://attend-server-ochre.vercel.app/api/tts?text=hello"
# 401
curl.exe -s -o NUL -w "%{http_code}`n" -H "x-attend-token: <token>" "https://attend-server-ochre.vercel.app/api/tts?text=hello"
# 200
```

### 1.2 ElevenLabs credits

Every guided line is voiced through ElevenLabs. The edge cache serves a repeated line in the
same voice for free, so lines that vary per person (the body area) cost the most. At
elevenlabs.io → Subscription, check the characters left and the reset date. After the internal
test (§3), look at Usage to see what one session cost. Then budget for about **50 testers × 21
sessions** in the worst case, with no cache. If that doesn't fit, upgrade for the beta month
or turn on usage-based billing. An empty quota is a silent session for everyone, which is the
one thing the beta must not have.

### 1.3 Host the privacy policy

Apple requires a privacy policy URL for an external beta. A `*.vercel.app` page is enough.

```powershell
mkdir $HOME\attend-privacy; cd $HOME\attend-privacy
copy <repo>\docs\launch\privacy-policy.md policy.md
notepad policy.md   # delete everything down to and including the first "---"; fill in [support email]
npx marked@latest -i policy.md -o body.html
$head = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Attend privacy policy</title><body style="font:17px/1.55 Georgia,serif;max-width:38em;margin:2em auto;padding:0 16px">'
Set-Content index.html -Encoding UTF8 -Value ($head + (Get-Content body.html -Raw -Encoding UTF8))
npx vercel@latest deploy --prod   # name the project attend-privacy
```

Open the URL on the iPhone and check that the curly quotes render.

**Support email:** use a dedicated address, not a personal one. It goes on the policy, in
TestFlight and in review notes.

### 1.4 The two lines in the app (make these after the pull in §2)

`src/domain/access.ts`, line 264:

```ts
export const PRIVACY_URL = 'https://attend-privacy.vercel.app';
```

And add directly under it (**the constant doesn't exist yet**: nothing in `src/` defines a
support email):

```ts
export const SUPPORT_EMAIL = '<support email>';
```

At the moment only the paywall's footer, which is switched off, links `PRIVACY_URL`.
Settings has no privacy, terms or contact rows yet (round 3, decision 4). The beta can go
without them, because TestFlight takes the URL from App Store Connect, but **App Store
submission can't** (Guideline 5.1.1).

---

## 2. Build and upload

From the repo folder, in PowerShell:

```powershell
git status                      # must be clean; stash or commit anything local first
git fetch
git checkout look-and-sound
git pull
npm install
# make the §1.4 edit, then:
npm run verify                  # tsc and every test; stop if it fails
git commit -am "Privacy URL and support email for the beta"
git push
npx eas-cli@latest build -p ios --profile production --auto-submit
```

- The **build number increments on its own** (`appVersionSource: remote`, `autoIncrement`).
  Every build shows as **0.1.0 (N)**. Keep `version` at 0.1.0 for the whole beta: a new
  version means a new Beta App Review, and later it strands over-the-air updates (AGENTS.md).
- The build takes about 15–30 min on EAS. Auto-submit then uploads it, Apple processes it for
  another 5–30 min, and an email says when it's ready. Export compliance is already answered
  (`usesNonExemptEncryption: false`).
- Before you build, check that `git log -1` includes the round-3 welcome emergency line
  (`OnboardingScreen.tsx`: "New chest pain, a sudden severe headache…"). If it's missing, the
  studio hasn't pushed it yet. Wait for it.

---

## 3. Internal test first: your own iPhone

App Store Connect → Apps → Attend → **TestFlight → Internal Testing → +** → group "me" → add
yourself → turn on automatic distribution → add build 0.1.0 (N). On the iPhone, open the
**TestFlight** app with the same Apple ID and install **Attend**. It sits beside "Attend Dev"
and starts fresh, which is what you want.

Give it ten minutes on the device, plus one night and one morning. The full list is
`docs/ON-DEVICE.md`. Its §1 (listening) and the "locking pauses" line predate guided-only
sessions, so the eight checks below win where the two differ.

1. **Voice plays.** Welcome → "begin day 1" → read or listen → "begin the practice". The first
   line comes within about 1 s, and the voice runs to the end with no gap. The first session
   speaks the doctor line, and every practice says "You can open your eyes, or stop, at any
   time."
2. **The lock screen keeps playing.** Lock the phone mid-practice, once with a sound under it
   and once on voice only. The guide carries on through the silences.
3. **Offline, cached.** After one online practice, force-quit, turn on airplane mode, and
   relaunch. "Practice again" plays from the cache. A *new* practice in airplane mode pauses,
   shows the reason on screen and keeps the sound going, and Resume fails in about 6 s.
4. **Can't sleep ends dark.** Today → "can't sleep", and let it run out. The screen stays
   near-black on "resting", the sound carries on about 30 min and then fades, and no After
   screen appears.
5. **Ending takes two taps.** Wait for the controls to fade (about 8 s). One tap on end shows
   the confirm and a second tap ends the practice. While paused, a single tap ends it.
6. **Reminders say only "day N".** Pick a time in the welcome and allow notifications. The
   next reminder's title is "day 2" or similar, with no lesson title and no health words on the
   lock screen. No reminder comes on a day you've already practiced.
7. **No microphone prompt, ever.** Go through the welcome, every practice and a listened
   lesson. Afterwards, iOS Settings → Privacy & Security → Microphone must not list Attend.
8. **No sample sessions.** Progress and Settings show only what you did, and Settings has no
   "Sample sessions" section.

Also read the welcome's safety screen. The emergency line must come first, at reading size.
"Feeling worried" names the local emergency number. Then check ElevenLabs Usage for §1.2.
**Any failure here stops the beta**: fix it, rebuild, and run the checks again.

---

## 4. App Store Connect → TestFlight

### Test Information (TestFlight → Test Information)

| Field | Value |
| --- | --- |
| Beta App Description | below |
| Feedback Email | `<support email>` |
| Marketing URL | the landing page once it's live (`landing-page.md`); otherwise leave it empty |
| Privacy Policy URL | `https://attend-privacy.vercel.app` |

**Beta App Description**

```
Attend is a quiet daily practice for chronic pain you already know. Over 28 days, each day brings a short lesson, read or listened to, then a few minutes of guided somatic tracking with your eyes closed. There are rain, forest and water sounds, under a practice or on their own, and a simple pain record kept apart from the practice. There's no account, and your record stays on your iPhone.

Attend is a wellness practice and education. It doesn't diagnose or treat. If a pain is new, different from your usual, or severe, see a medical professional first.
```

### Beta App Review Information

- **Contact:** Itai Agami, `<phone>`, `<support email>`.
- **Sign-in required:** leave it unchecked. There's no account.
- **Review notes:**

```
No login or account. Everything is stored on the device. Nothing is sold in this build.

To reach a guided session:
1. Open the app. The welcome is seven short screens: tap "begin", then "continue" (about a minute; every choice can be left empty). It ends on "your first day is ready". Tap "begin day 1".
2. Choose "read" or "listen", go through the short lesson, then tap "begin the practice". The session is voice only: a breathing form, pause and end. It runs about 5 minutes. To end early, tap end, then tap again to confirm.
Quicker route after the welcome: on Today, tap "in a flare" (3 minutes).

Audio: the guide's lines are voiced by our server through ElevenLabs, so the first play of a practice needs a connection. Background audio keeps a practice going when the screen locks.

Microphone: guided sessions never use the microphone, and this build never asks for it. The app asks for notification permission only if the person chooses a daily reminder in the welcome.

Safety: Attend is a wellness practice and education, not a medical device. It does not diagnose or treat. The welcome's safety screen tells anyone with new chest pain, a sudden severe headache, trouble breathing or new weakness to call their local emergency number, and sends anything new or different to a doctor. The flare and worry practices open with a fixed doctor line, and the worry practice names the emergency number.

Contact: Itai Agami, <support email>, <phone>
```

Don't use the review notes in `store-listing.md` for the beta. They describe the paywall,
which is off in this build.

### What to Test (the build → Test Details)

```
Thank you for testing Attend. It's for pain you already know.

Please try:
- The welcome, then Day 1: a 2-minute lesson, then 5 minutes with your eyes closed. Headphones help.
- One practice a day for the first week, at a time that suits you. On a low day, 3 minutes completes it.
- The one-tap practices on Today when you need them: in a flare, can't sleep, feeling worried.
- Locking your phone during a practice. The guide should keep going.
- A sound on its own, in Sounds.

Please tell us, with a screenshot in TestFlight or by email:
- Any time the voice stopped or a practice didn't start: what you were doing, and whether you had signal.
- Any line, sound or screen that felt wrong for you.
- In your own words, what the app is for.

All 28 days are open during the beta, and nothing is sold.
Stopping is part of the practice. Open your eyes, look around the room, and stop whenever you need to.
If something is new, sudden or severe, call your local emergency number. Attend can't help with that.
```

For each later build, put one line at the top saying what changed.

---

## 5. The external group: "founding testers"

1. **TestFlight → External Testing → +** → "founding testers" → add the build → paste What
   to Test → **Submit for Review**. The first build of 0.1.0 waits for Beta App Review, often
   about a day. Later builds of 0.1.0 usually go through faster.
2. Once it's approved: **Public Link → Enable**, and **limit the testers to 15** for the first
   three days. If nobody reports a silent session or a crash, raise the limit to **50**. This
   way a bug reaches 15 people, not 50.
3. **Recruiting**, from `outreach.md`, in this order:
   - The waitlist (email #3, "beta spots").
   - Communities, with **modmail first** and a post only after a yes. No link in the post
     unless the mods allow it; DM the public link instead. One post per community, a few days
     apart.
   - Clinicians, each passing the link to two or three patients.
   - Aim for a mix: always-there pain, flares, and stress with poor sleep (the round-1
     personas).

**TestFlight forbids compensation.** App Review Guideline 2.2: TestFlight apps "cannot be
distributed to testers in exchange for compensation of any kind." So there's no "test and get a
free year". The free year is **a gift to founding members**: everyone who joins the waitlist or
the beta before launch gets it, whether or not they test, finish, or give feedback. Nothing
asks for anything in return. **`outreach.md` needs rewording before anything is posted:** lines
87, 119, 139–140 and waitlist email #3 (line 201) all tie the free year to testing. One way
to put it: "Everyone who joins before launch is a founding member and gets a free year of
Plus."

---

## 6. What to learn in the beta (about 3 weeks)

**Go/no-go for launch** (LAUNCH.md §5):
- at least **half of testers finish Week 1**
- **nobody hits a crash or a silent session**
- testers can **say in their own words what the app is for**

There's no analytics in the app, so the evidence comes from TestFlight → Feedback and Crashes
(and per-tester sessions where Apple shows them), the form below, and **ten 20-minute calls**.

**The form** goes out on Day 8 and again at the end. Make it anonymous (Tally or Google Forms),
with no email required, and make every question optional. It never asks about pain levels,
improvement, or before and after: the beta tests the practice, not anyone's pain.

1. How many days of your first week did you practice? (0–7. Progress shows your practice
   days.)
2. In a sentence, what is Attend for?
3. Did the voice ever stop, or a practice not start? If so: what were you doing, was the phone
   locked, and were you on Wi-Fi or cellular?
4. Was there a line, a sound, the pace, or a screen that felt wrong for you, or made you want
   to stop?
5. If Attend went away tomorrow, how would you feel? (very disappointed / somewhat
   disappointed / not disappointed) And what would you miss, if anything?

Q1 answers the Week 1 gate, Q3 the silent-session gate and Q2 the "what it's for" gate. Q5 is
a signal, not a gate.

---

## 7. After the beta: switching Plus on

`PLUS_ENABLED` (`src/domain/access.ts`, line 25) stays `false` until **all** of these are true:

- [ ] Itai has confirmed the prices (founding $39.99/yr with 7 days free, $7.99/mo, $99
      lifetime: LAUNCH.md §1, §7).
- [ ] The Paid Applications Agreement, banking and tax are **active** (Business →
      Agreements), and the Small Business Program enrolment is done.
- [ ] The subscription group "Attend Plus" exists, with `plus_yearly` (7-day free trial),
      `plus_monthly` and the lifetime purchase.
- [ ] RevenueCat is wired (`react-native-purchases`, with the import guarded like
      `voice/speechModule.ts`).
- [ ] The privacy policy, the Settings privacy copy and the README name RevenueCat *before*
      it ships (AGENTS.md). The App Privacy label adds Purchase History.

Then set it to `true` and run `npm run verify`. Build, and buy with a sandbox account on the
TestFlight build (TestFlight purchases are never charged). Then submit for App Review with a
paywall screenshot. Copy, placement and the never-here list are in `docs/launch/paywall.md`.
Send the founding-member codes to the whole waitlist, testers included.
