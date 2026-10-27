import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildRecap } from '../src/domain/recap';
import { EMPTY_SIGNALS } from '../src/domain/types';
import { dayLabel, greeting, longDate, partOfDay, sessionDate, shortDate } from '../src/features/shared/format';
import { setLang } from '../src/i18n';
import { reminderBody } from '../src/voice/reminders';

// Local times, so the tests hold in any time zone the suite runs in.
const NOW = new Date(2026, 9, 17, 18, 0).getTime(); // Saturday 17 Oct 2026, evening
const at = (day: number, hour: number) => new Date(2026, 9, day, hour, 0).getTime();

function inHebrew(run: () => void) {
  setLang('he');
  try {
    run();
  } finally {
    setLang('en');
  }
}

test('dates in Hebrew come from our own tables: today, yesterday, weekday and month', () => {
  inHebrew(() => {
    assert.equal(dayLabel(at(17, 9), NOW), 'היום');
    assert.equal(dayLabel(at(16, 9), NOW), 'אתמול');
    assert.equal(dayLabel(at(13, 9), NOW), 'יום ג׳, 13 באוק׳');
    assert.equal(dayLabel(at(10, 9), NOW), 'שבת, 10 באוק׳');
    assert.equal(shortDate(at(13, 9)), '13 באוק׳');
    assert.equal(longDate(at(13, 9)), '13 באוקטובר');
    assert.equal(partOfDay(at(13, 14)), 'אחר הצהריים');
    assert.equal(sessionDate(Date.now()).split(' · ')[0], 'היום');
    assert.equal(sessionDate(at(13, 9)), 'יום ג׳, 13 באוק׳ · בוקר');
  });
  // English is unchanged.
  assert.equal(dayLabel(at(13, 9), NOW), 'Tue 13 Oct');
  assert.equal(dayLabel(at(17, 9), NOW), 'Today');
  assert.equal(shortDate(at(13, 9)), '13 Oct');
  assert.equal(partOfDay(at(13, 14)), 'Afternoon');
});

test('greetings follow the part of the day, and night still greets rather than says goodnight', () => {
  inHebrew(() => {
    assert.equal(greeting(at(17, 8)), 'בוקר טוב.');
    assert.equal(greeting(at(17, 14)), 'צהריים טובים.');
    assert.equal(greeting(at(17, 19)), 'ערב טוב.');
    assert.equal(greeting(at(17, 23)), 'ערב טוב.');
  });
  assert.equal(greeting(at(17, 8)), 'Good morning.');
  assert.equal(greeting(at(17, 14)), 'Good afternoon.');
  assert.equal(greeting(at(17, 23)), 'Good evening.');
});

test('reminders in Hebrew are gentle and never count missed days', () => {
  inHebrew(() => {
    const all = [reminderBody(true), ...[1, 2, 3, 4].map((d) => reminderBody(false, new Date(2026, 9, d)))];
    assert.equal(new Set(all).size, 5);
    for (const body of all) {
      assert.match(body, /[֐-׿]/);
      assert.doesNotMatch(body, /פספס|החמצ|רצף|לא תרגלתם|\d/);
    }
  });
  assert.equal(reminderBody(true), 'Whenever you’d like to come back, your practice is here.');
});

test('a guided recap in Hebrew says only where attention rested and for how long', () => {
  const input = {
    sessionType: 'notice' as const,
    outcome: 'completed' as const,
    bodyMapStart: { sensations: [] },
    bodyMapEnd: { sensations: [] },
    changes: [],
    signals: { ...EMPTY_SIGNALS, observedSeconds: 300 },
    mode: 'guided' as const,
    place: { region: 'shoulder' as const, side: 'left' as const },
  };
  inHebrew(() => {
    const r = buildRecap(input);
    assert.equal(r.oneLiner, 'תשומת הלב נחה על הכתף השמאלית.');
    assert.match(r.summary, /במשך כ־5 דקות/);
    assert.doesNotMatch(r.title + r.summary + r.oneLiner, /התרכך|הוקל|השתפר|פחות כאב|[a-z]/i);
    assert.equal(buildRecap({ ...input, place: undefined }).title, 'זמן עם הגוף כולו.');
  });
  assert.equal(buildRecap(input).oneLiner, 'Attention rested on your left shoulder.');
});
