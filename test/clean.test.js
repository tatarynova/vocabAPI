import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanContext, cleanWord, cleanText } from '../src/clean.js';

test('cleanWord lower-cases and trims punctuation from both ends', () => {
  assert.equal(cleanWord('  Bank, '), 'bank');
  assert.equal(cleanWord('“Serendipity!”'), 'serendipity');
  assert.equal(cleanWord('(ephemeral)...'), 'ephemeral');
});

test('cleanWord keeps inner hyphens, apostrophes and spaces', () => {
  assert.equal(cleanWord('Well-Being'), 'well-being');
  assert.equal(cleanWord("Don't"), "don't");
  assert.equal(cleanWord('Give Up.'), 'give up');
});

test('cleanWord keeps non-English letters', () => {
  assert.equal(cleanWord('Café;'), 'café');
  assert.equal(cleanWord('«Берег»'), 'берег');
});

test('cleanWord returns an empty string for missing or non-text input', () => {
  assert.equal(cleanWord(), '');
  assert.equal(cleanWord('123!?'), '');
  assert.equal(cleanWord(null), '');
  assert.equal(cleanWord(42), '');
  assert.equal(cleanWord({ word: 'x' }), '');
});

test('cleanContext removes the Apple Books footer and the quotes', () => {
  const copied = '“They sat on the river bank.”\n\nExcerpt From\nSome Book\nSome Author\nThis material may be protected by copyright.';
  assert.equal(cleanContext(copied), 'They sat on the river bank.');
});

test('cleanContext leaves a plain sentence alone', () => {
  assert.equal(cleanContext('  It was a dark and stormy night.  '), 'It was a dark and stormy night.');
  assert.equal(cleanContext(), '');
  assert.equal(cleanContext(undefined), '');
});

test('cleanText trims strings and turns anything else into an empty string', () => {
  assert.equal(cleanText('  hi  '), 'hi');
  assert.equal(cleanText(undefined), '');
  assert.equal(cleanText(['a']), '');
});
