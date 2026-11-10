import { test } from 'node:test';
import assert from 'node:assert/strict';
import { schedule } from '../src/srs.js';

const NEW_CARD = { ease: 2.5, interval_days: 0, repetitions: 0 };
const DAY_MS = 24 * 60 * 60 * 1000;

function daysUntil(dueAt) {
  return (Date.parse(`${dueAt.replace(' ', 'T')}Z`) - Date.now()) / DAY_MS;
}

test('a new card answered "good" comes back tomorrow, then in 3 days', () => {
  const first = schedule(NEW_CARD, 2);
  assert.equal(first.repetitions, 1);
  assert.equal(first.interval_days, 1);
  assert.equal(first.ease, 2.5);

  const second = schedule(first, 2);
  assert.equal(second.repetitions, 2);
  assert.equal(second.interval_days, 3);
});

test('after the second review the interval grows by the ease factor', () => {
  const card = { ease: 2.5, interval_days: 3, repetitions: 2 };
  assert.equal(schedule(card, 2).interval_days, 8); // round(3 * 2.5)
});

test('"forgot" resets the card and lowers the ease', () => {
  const card = { ease: 2.5, interval_days: 30, repetitions: 5 };
  const next = schedule(card, 0);
  assert.equal(next.repetitions, 0);
  assert.equal(next.interval_days, 1);
  assert.equal(next.ease, 2.3);
});

test('"hard" shortens the interval and lowers the ease', () => {
  const card = { ease: 2.5, interval_days: 10, repetitions: 3 };
  const next = schedule(card, 1);
  assert.equal(next.interval_days, 15); // round(round(10 * 2.5) * 0.6)
  assert.equal(next.ease, 2.35);
});

test('"easy" raises the ease', () => {
  const next = schedule({ ease: 2.5, interval_days: 3, repetitions: 2 }, 3);
  assert.equal(next.ease, 2.65);
});

test('ease never drops below 1.3', () => {
  let card = { ease: 1.4, interval_days: 5, repetitions: 3 };
  for (let i = 0; i < 5; i++) card = schedule(card, 0);
  assert.equal(card.ease, 1.3);
});

test('"hard" never schedules sooner than one day', () => {
  assert.equal(schedule(NEW_CARD, 1).interval_days, 1);
});

test('due_at is a SQLite-style UTC timestamp interval_days ahead', () => {
  const next = schedule({ ease: 2.5, interval_days: 3, repetitions: 2 }, 2);
  assert.match(next.due_at, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  assert.ok(Math.abs(daysUntil(next.due_at) - next.interval_days) < 0.01);
});

test('schedule does not change the card it is given', () => {
  const card = { ...NEW_CARD };
  schedule(card, 3);
  assert.deepEqual(card, NEW_CARD);
});
