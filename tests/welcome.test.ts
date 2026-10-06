import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GUIDE_VOICES } from '../src/config';
import { violatesGuideLanguage } from '../src/domain/safety';
import { parseFocus, parseMinutes, parseUnderstood, parseVoiceOffer, parseVoiceReply, parseWelcomeCommand, SPOKEN } from '../src/domain/welcome';
import { WelcomeRunner } from '../src/engine/WelcomeRunner';
import type { ListenResult, SpeechOutput } from '../src/voice/types';

test('spoken answers are understood in the person’s own words', () => {
  assert.equal(parseFocus('Mostly my lower back, it aches all the time'), 'notice');
  assert.equal(parseFocus('I get flares'), 'flare');
  assert.equal(parseFocus("It's worse at night, I can't sleep"), 'sleep');
  assert.equal(parseFocus("I'm scared of what it means"), 'fear');
  assert.equal(parseFocus('the second one'), 'flare');
  assert.equal(parseFocus('hmm'), undefined);
  assert.equal(parseMinutes('Five minutes.'), 5);
  assert.equal(parseMinutes('ten'), 10);
  assert.equal(parseMinutes('Just a quick one'), 3);
  assert.equal(parseMinutes("I'm not sure"), 5);
  assert.equal(parseVoiceOffer('Keep yours'), 'keep');
  assert.equal(parseVoiceOffer("No, I'd like to hear the others"), 'hear');
  assert.equal(parseVoiceOffer('Sure'), 'hear');
  assert.equal(parseVoiceReply('This one.'), 'keep');
  assert.equal(parseVoiceReply('Next'), 'next');
  assert.equal(parseVoiceReply('No, not this'), 'next');
  assert.ok(parseUnderstood('I understand.'));
  assert.ok(parseUnderstood('Yes'));
  assert.ok(!parseUnderstood("I don't understand"));
  assert.equal(parseWelcomeCommand('Sorry?'), 'repeat');
  assert.equal(parseWelcomeCommand("I'd rather tap"), 'skip');
});

test('the spoken welcome keeps the guide’s rules', () => {
  const lines = [
    ...SPOKEN.intro,
    SPOKEN.focus,
    SPOKEN.focusHint,
    SPOKEN.minutes,
    SPOKEN.minutesHint,
    SPOKEN.voiceOffer('River'),
    SPOKEN.voiceSample('Sarah'),
    SPOKEN.voicesDone,
    ...SPOKEN.safety,
    SPOKEN.safetyAsk,
    SPOKEN.ready('During a flare', 5),
  ];
  for (const l of lines) assert.ok(!violatesGuideLanguage(l), l);
});

/** Drive a whole spoken welcome: each listen returns the next scripted answer (null = silence). */
async function runWelcome(replies: Array<string | null>) {
  const spoken: Array<{ voice: string; text: string }> = [];
  const states: string[] = [];
  const queue = [...replies];
  const outputFor = (voice: string): SpeechOutput => ({
    id: voice,
    label: voice,
    isAvailable: async () => true,
    speak: async (text) => {
      spoken.push({ voice, text });
    },
    stop() {},
    dispose() {},
  });
  const runner = new WelcomeRunner({
    input: {
      id: 'fake',
      label: 'fake',
      isAvailable: async () => true,
      requestPermission: async () => true,
      listen: async (): Promise<ListenResult> => {
        if (!queue.length) return { kind: 'silence', waitedMs: 12_000 };
        const r = queue.shift()!;
        return r === null ? { kind: 'silence', waitedMs: 12_000 } : { kind: 'speech', text: r, durationMs: 800 };
      },
      dispose() {},
    },
    outputFor,
    welcomeVoice: GUIDE_VOICES[0],
    voices: GUIDE_VOICES,
    onState: (s) => states.push(s.status),
  });
  const result = await runner.run();
  return { result, spoken, states };
}

test('a whole spoken welcome sets up the first session, in the voice chosen by ear', async () => {
  const { result, spoken, states } = await runWelcome(['Flares, mostly', 'five', 'I want to hear the others', 'next', 'this one', 'I understand']);
  assert.deepEqual(result.answers, { focus: 'flare', minutes: 5, voice: GUIDE_VOICES[2].id, understood: true });
  assert.equal(result.ended, false);
  // The samples are spoken in their own voices; the closing line in the chosen one.
  assert.ok(spoken.some((s) => s.voice === GUIDE_VOICES[1].id && s.text.includes(GUIDE_VOICES[1].name)));
  assert.equal(spoken[spoken.length - 1].voice, GUIDE_VOICES[2].id);
  assert.match(spoken[spoken.length - 1].text, /During a flare, 5 minutes/);
  assert.ok(!states.includes('paused'));
});

test('unclear answers get one hint, then a gentle default; the safety note is never assumed', async () => {
  const { result, spoken } = await runWelcome(['hmm', null, 'um', null, null, null, null, null]);
  assert.equal(result.answers.focus, 'notice');
  assert.equal(result.answers.minutes, 5);
  assert.equal(result.answers.voice, GUIDE_VOICES[0].id);
  assert.equal(result.answers.understood, undefined);
  assert.ok(spoken.some((s) => s.text === SPOKEN.focusHint));
  assert.ok(spoken.some((s) => s.text === SPOKEN.safetyAsk));
});

test('asking to tap instead ends the spoken welcome', async () => {
  const { result } = await runWelcome(['skip']);
  assert.equal(result.ended, true);
});
