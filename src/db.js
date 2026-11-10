import { createClient } from '@libsql/client';

// Opens a database. No URL = the local vocab.db file; ':memory:' is used by tests.
export function createDb(url = process.env.DATABASE_URL || 'file:vocab.db', authToken = process.env.DATABASE_AUTH_TOKEN) {
  return createClient({ url, authToken });
}

// words: one row per saved word. context is the sentence it was found in;
//        the last four columns are spaced-repetition state.
// reviews: one row per rating, so progress can be charted over time.
export async function initDb(db) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS words (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      word           TEXT NOT NULL UNIQUE,
      definition     TEXT,
      translation_ru TEXT,
      part_of_speech TEXT,
      context        TEXT,
      source         TEXT,
      created_at     TEXT NOT NULL DEFAULT (datetime('now')),
      ease           REAL NOT NULL DEFAULT 2.5,
      interval_days  INTEGER NOT NULL DEFAULT 0,
      repetitions    INTEGER NOT NULL DEFAULT 0,
      due_at         TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS reviews (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      word_id       INTEGER NOT NULL,
      grade         INTEGER NOT NULL,
      interval_days INTEGER NOT NULL,
      reviewed_at   TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  await db.execute('CREATE INDEX IF NOT EXISTS reviews_reviewed_at ON reviews (reviewed_at)');
}
