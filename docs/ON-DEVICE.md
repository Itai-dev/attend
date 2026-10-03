# First checks on an iPhone

Everything below was built and type-checked, and the engine was exercised end to end in
tests and in the web build, but none of it has run on an iPhone yet. In rough order of risk:

## 1. Listening (development build only)

- [ ] First session asks for Microphone and Speech Recognition, once, with Attend's wording.
- [ ] `supportsOnDeviceRecognition()` is true on the test phone. If not, Settings → Developer
      shows it; the input is configured `onDeviceOnly`, so it will report unavailable rather
      than silently sending audio to Apple's servers.
- [ ] End-of-utterance feels right. Tune `END_OF_UTTERANCE_MS` (1700) in
      `engine/SessionRunner.ts`; the trailing-word extension (×1.8 after "and", "um"…) is in
      `voice/input/OnDeviceSpeechInput.ts`.
- [ ] The guide's own voice is not picked up as an answer (listening starts only after the
      line has finished; if it bleeds, try `iosVoiceProcessingEnabled: true` in `start()`).

## 2. Audio route

- [ ] Speaker, wired headphones and AirPods each work for the whole session without the route
      flipping between speaking and listening (`voice/audioSession.ts` sets play-and-record once).
- [ ] With AirPods, the mic used is the AirPods mic and the voice quality is acceptable (HFP).
- [ ] Silent switch on: the guide is still heard (`playsInSilentMode`).
- [ ] A phone call or Siri mid-session: the session pauses; Resume continues with
      "Let's continue." and the question again.
- [ ] Locking the phone / leaving the app pauses; the screen does not auto-lock during a session.

## 3. Natural voice (with the proxy)

- [ ] First line starts within ~1 s; later lines start on time (prefetch of the next two lines).
- [ ] Airplane mode mid-session: lines fall back to the on-device voice without a gap or error.

## 4. Visuals

- [ ] Skia shaders compile (they do in CanvasKit; native Skia uses the same SkSL compiler).
- [ ] The session field runs smoothly full-screen; Journey thumbnails scroll smoothly.
- [ ] Reduce Motion: both fields become still.
- [ ] Tab icons render (`circle.circle`, `figure.stand`,
      `point.topleft.down.curvedto.point.bottomright.up`). Swap the SF Symbol names in
      `src/app/(tabs)/_layout.tsx` if any is blank.

## 5. Accessibility

- [ ] VoiceOver: every control is labelled; the body map reads as a sentence; the session's
      status word does not talk over the guide.
- [ ] Largest Dynamic Type size: Home, Recap and Journey still read without clipping.

## 6. Data

- [ ] Kill the app mid-session: next launch, Journey has the session as a shorter one.
- [ ] Settings → Delete all sessions empties Journey and Body.
