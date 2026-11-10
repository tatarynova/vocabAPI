import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStats, cardStage, localDay, parseDbDate, reviewStreak } from '../src/stats.js';

// "Now" for every test: 10 Nov 2026, 12:00 UTC.
const NOW = Date.parse('2026-11-10T12:00:00Z');

test('parseDbDate reads SQLite UTC timestamps', () => {
  assert.equal(parseDbDate('2026-11-10 12:00:00'), NOW);
});

test('localDay shifts to the user\'s time zone', () => {
  const lateEvening = Date.parse('2026-11-10T22:30:00Z');
  assert.equal(localDay(lateEvening, 0), '2026-11-10');
  assert.equal(localDay(lateEvening, -180), '2026-11-11'); // Moscow, UTC+3
  assert.equal(localDay(Date.parse('2026-11-10T03:00:00Z'), 300), '2026-11-09'); // New York, UTC-5
});

test('cardStage splits words into new, young and mature', () => {
  assert.equal(cardStage({ interval_days: 0 }), 'new');
  assert.equal(cardStage({ interval_days: 1 }), 'young');
  assert.equal(cardStage({ interval_days: 20 }), 'young');
  assert.equal(cardStage({ interval_days: 21 }), 'mature');
});

test('reviewStreak counts consecutive days ending today', () => {
  assert.equal(reviewStreak(['2026-11-10', '2026-11-09', '2026-11-08', '2026-11-06'], '2026-11-10'), 3);
});

test('reviewStreak still counts yesterday\'s run if today has no reviews yet', () => {
  assert.equal(reviewStreak(['2026-11-09', '2026-11-08'], '2026-11-10'), 2);
  assert.equal(reviewStreak(['2026-11-07'], '2026-11-10'), 0);
  assert.equal(reviewStreak([], '2026-11-10'), 0);
});

test('computeStats on an empty collection returns zeroed buckets for every day', () => {
  const s = computeStats({ now: NOW, days: 7 });
  assert.equal(s.today, '2026-11-10');
  assert.equal(s.reviews.length, 7);
  assert.equal(s.added.length, 7);
  assert.equal(s.forecast.length, 7);
  assert.equal(s.reviews[0].date, '2026-11-04');
  assert.equal(s.reviews.at(-1).date, '2026-11-10');
  assert.equal(s.forecast[0].date, '2026-11-10');
  assert.equal(s.forecast.at(-1).date, '2026-11-16');
  assert.deepEqual(s.totals, {
    words: 0, new: 0, young: 0, mature: 0, dueToday: 0, reviewsToday: 0, reviewsInRange: 0, retention: null, streak: 0,
  });
});

test('computeStats counts reviews per day by grade, retention and streak', () => {
  const reviews = [
    { grade: 0, reviewed_at: '2026-11-10 09:00:00' },
    { grade: 2, reviewed_at: '2026-11-10 09:01:00' },
    { grade: 3, reviewed_at: '2026-11-09 20:00:00' },
    { grade: 1, reviewed_at: '2026-11-08 08:00:00' },
    { grade: 2, reviewed_at: '2026-10-01 08:00:00' }, // outside a 7-day range
  ];
  const s = computeStats({ reviews, now: NOW, days: 7 });
  assert.deepEqual(s.reviews.at(-1), { date: '2026-11-10', forgot: 1, hard: 0, good: 1, easy: 0 });
  assert.deepEqual(s.reviews.at(-2), { date: '2026-11-09', forgot: 0, hard: 0, good: 0, easy: 1 });
  assert.equal(s.totals.reviewsToday, 2);
  assert.equal(s.totals.reviewsInRange, 4);
  assert.equal(s.totals.retention, 75); // 3 of 4 remembered
  assert.equal(s.totals.streak, 3);
});

test('computeStats puts overdue words on today and ignores words due after the range', () => {
  const words = [
    { created_at: '2026-11-01 10:00:00', due_at: '2026-11-02 10:00:00', interval_days: 1 }, // overdue
    { created_at: '2026-11-10 10:00:00', due_at: '2026-11-10 10:00:00', interval_days: 0 }, // new, due now
    { created_at: '2026-11-05 10:00:00', due_at: '2026-11-13 10:00:00', interval_days: 8 },
    { created_at: '2026-08-01 10:00:00', due_at: '2027-01-01 10:00:00', interval_days: 40 }, // mature, far away
  ];
  const s = computeStats({ words, now: NOW, days: 7 });
  assert.equal(s.forecast[0].count, 2);
  assert.equal(s.forecast[3].count, 1);
  assert.equal(s.forecast.reduce((sum, d) => sum + d.count, 0), 3);
  assert.equal(s.totals.dueToday, 2);
  assert.deepEqual([s.totals.new, s.totals.young, s.totals.mature], [1, 2, 1]);
  assert.equal(s.totals.words, 4);
  assert.equal(s.added.at(-1).count, 1); // added today
  assert.equal(s.added.find((d) => d.date === '2026-11-05').count, 1);
  assert.equal(s.added.reduce((sum, d) => sum + d.count, 0), 2); // 1 Nov and 1 Aug are outside
});

test('computeStats uses the user\'s calendar day', () => {
  // 22:30 UTC on 10 Nov is already 11 Nov in Moscow.
  const reviews = [{ grade: 2, reviewed_at: '2026-11-10 22:30:00' }];
  const lateNow = Date.parse('2026-11-10T23:00:00Z');
  const moscow = computeStats({ reviews, now: lateNow, tzOffsetMinutes: -180, days: 7 });
  assert.equal(moscow.today, '2026-11-11');
  assert.equal(moscow.reviews.at(-1).good, 1);
  const utc = computeStats({ reviews, now: lateNow, tzOffsetMinutes: 0, days: 7 });
  assert.equal(utc.today, '2026-11-10');
  assert.equal(utc.reviews.at(-1).good, 1);
});
