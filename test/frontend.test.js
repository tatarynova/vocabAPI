// Unit tests for the browser code. The modules only touch the DOM inside
// functions, so their pure helpers can be imported straight into Node.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { TEXT, t, setLang, getLang, formatDay } from '../public/js/i18n.js';
import { niceScale, stackLayout, labelIndexes, topRoundedRect, CHART } from '../public/js/charts.js';
import { buildWordPayload } from '../public/js/add-word.js';
import { feedbackText } from '../public/js/practice.js';
import { tileValues } from '../public/js/stats.js';

describe('i18n', () => {
  test('Russian and English have exactly the same keys', () => {
    assert.deepEqual(Object.keys(TEXT.ru).sort(), Object.keys(TEXT.en).sort());
  });

  test('every data-i18n key used in the page exists', async () => {
    const html = await readFile(new URL('../public/practice.html', import.meta.url), 'utf8');
    const keys = [...html.matchAll(/data-i18n(?:-placeholder|-aria)?="([^"]+)"/g)].map((m) => m[1]);
    assert.ok(keys.length > 20);
    for (const key of keys) assert.ok(key in TEXT.en, `missing text for "${key}"`);
  });

  test('t fills in values and falls back to English, then to the key', () => {
    assert.equal(t('wordsLeft', { n: 3 }, 'en'), 'Words left: 3');
    assert.equal(t('wordsLeft', { n: 3 }, 'ru'), 'Осталось слов: 3');
    assert.equal(t('wordsLeft', { n: 3 }, 'de'), 'Words left: 3');
    assert.equal(t('no-such-key', {}, 'en'), 'no-such-key');
  });

  test('setLang only accepts known languages', () => {
    setLang('en');
    assert.equal(getLang(), 'en');
    setLang('xx');
    assert.equal(getLang(), 'en');
    setLang('ru');
  });

  test('formatDay prints a short date in the chosen language', () => {
    assert.equal(formatDay('2026-11-10', undefined, 'en'), 'Nov 10');
    assert.match(formatDay('2026-11-10', undefined, 'ru'), /^10 нояб/);
  });
});

describe('charts', () => {
  test('niceScale ends the axis on a round number', () => {
    assert.deepEqual(niceScale(7), { max: 8, ticks: [0, 2, 4, 6, 8] });
    assert.deepEqual(niceScale(3), { max: 3, ticks: [0, 1, 2, 3] });
    assert.deepEqual(niceScale(130), { max: 150, ticks: [0, 50, 100, 150] });
    assert.deepEqual(niceScale(0), { max: 4, ticks: [0, 1, 2, 3, 4] });
  });

  test('stackLayout stacks segments bottom-up with a gap between them', () => {
    const data = [{ a: 2, b: 2 }, { a: 0, b: 0 }];
    const { bars, baseline } = stackLayout(data, ['a', 'b']);
    const [first, empty] = bars;
    assert.equal(first.total, 4);
    assert.equal(empty.segments.length, 0);
    const [a, b] = first.segments;
    assert.ok(Math.abs(a.y + a.h - baseline) < 1e-9, 'first segment sits on the baseline');
    assert.ok(b.y < a.y, 'second segment is above the first');
    assert.ok(Math.abs(a.y - (b.y + b.h) - 2) < 1e-9, '2px gap between segments');
    assert.ok(Math.abs(b.y - CHART.top) < 1e-9, 'tallest bar reaches the top of the scale');
  });

  test('bars are never thicker than 24px and always leave a gap', () => {
    const few = stackLayout([{ v: 1 }, { v: 2 }], ['v']);
    assert.equal(few.bars[0].w, 24);
    const many = stackLayout(Array.from({ length: 90 }, () => ({ v: 1 })), ['v']);
    assert.ok(many.bars[0].w < many.bars[0].slotW);
  });

  test('labelIndexes picks a few evenly spaced labels ending on the last day', () => {
    assert.deepEqual(labelIndexes(7), [0, 2, 4, 6]);
    const idx = labelIndexes(30);
    assert.equal(idx.at(-1), 29);
    assert.ok(idx.length <= 6);
    assert.deepEqual(labelIndexes(0), []);
  });

  test('topRoundedRect never uses a radius bigger than the bar', () => {
    assert.equal(topRoundedRect(0, 0, 10, 20), 'M0,20V4Q0,0 4,0H6Q10,0 10,4V20Z');
    assert.equal(topRoundedRect(0, 0, 2, 1), 'M0,1V1Q0,0 1,0H1Q2,0 2,1V1Z');
  });
});

describe('add word form', () => {
  test('leaves out empty optional fields so the server fills them in', () => {
    assert.deepEqual(buildWordPayload({ word: '  Quaint ', context: ' ', definition: '', translation: '' }), {
      word: 'Quaint',
      source: 'manual',
    });
  });

  test('sends what the user typed', () => {
    assert.deepEqual(
      buildWordPayload({ word: 'bank', context: 'On the bank.', definition: 'edge', translation: 'берег', source: 'film' }),
      { word: 'bank', source: 'film', context: 'On the bank.', definition: 'edge', translation: 'берег' }
    );
  });
});

describe('practice feedback', () => {
  const en = (key, values) => t(key, values, 'en');

  test('shows a suggestion only when it differs from the sentence', () => {
    const sentence = 'I sat on the bank.';
    assert.equal(feedbackText({ out: { correct: true, feedback: 'Good.', better: sentence }, sentence }, en), '✅ Good.');
    assert.equal(
      feedbackText({ out: { correct: false, feedback: 'Almost.', better: 'I sat on the river bank.' }, sentence }, en),
      '✏️ Almost. Try: “I sat on the river bank.”'
    );
  });

  test('shows "checking" and errors', () => {
    assert.equal(feedbackText('checking', en), 'Checking…');
    assert.equal(feedbackText({ out: { error: 'AI is not configured' }, sentence: 'x' }, en), 'AI is not configured');
    assert.equal(feedbackText(null, en), '');
  });
});

describe('progress tiles', () => {
  test('retention shows a dash until there are reviews', () => {
    const base = { words: 5, dueToday: 2, reviewsToday: 0, streak: 0 };
    assert.equal(tileValues({ ...base, retention: null }).at(-1)[1], '—');
    assert.equal(tileValues({ ...base, retention: 87 }).at(-1)[1], '87%');
  });
});
