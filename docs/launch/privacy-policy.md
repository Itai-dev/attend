# Attend: privacy policy (draft for Itai to host)

Draft of 18 Oct 2026. Host it at a stable URL (a `*.vercel.app` page is enough for the beta),
then put that URL in App Store Connect and in `PRIVACY_URL` (`src/domain/access.ts`).
Check it against the app before each release. Not legal advice: have it reviewed before the
paid launch.

---

**Attend** is made by Itai Agami. This policy says what the app keeps, what leaves your phone,
and why.

**No account.** You don't sign up. We don't know your name, email or phone number.

**What stays on your iPhone**
- Your practices, check-ins, pain record, moments, goal and settings. They are stored in the
  app on your phone.
- We have no copy. Deleting the app deletes them, and Settings → "delete all sessions"
  removes them too.

**What leaves your iPhone, and why**
- **The guide's voice.** The guide's lines are turned into speech by our voice server (hosted
  on Vercel) using ElevenLabs. For lines that rest attention on a part of the body, the line
  includes that body area, for example "your lower back". Nothing else about you is sent: no
  name, no account, no identifier, nothing you said.
- **What the providers keep.** Vercel may keep request logs for a short time, and ElevenLabs
  may keep a history of generated speech under their own policies. Neither receives anything
  that identifies you.
- **The lesson.** When you choose to listen to a lesson, its text, which is the app's own
  words, is voiced the same way.
- **Reminders.** If you turn on a reminder, it is scheduled by your iPhone. We don't run a
  notification service.
- **Purchases.** Once purchases are available, Apple handles payment, and a purchase service
  (RevenueCat) records which plan is active, under an anonymous ID. We will update this policy
  before that ships.

**What we don't do**
- No analytics.
- No advertising.
- No tracking across apps or websites.
- No selling or sharing of data.
- Guided practices never use the microphone.

**Health information.** Attend is a wellness practice and education. It is not a medical
device, and it doesn't diagnose or treat any condition. If a pain is new, different from your
usual, or severe, please see a medical professional.

**Children.** Attend is not meant for children under 17.

**Changes.** If this policy changes, the new version will be posted here, with its date.

**Contact.** [support email], Itai Agami.
