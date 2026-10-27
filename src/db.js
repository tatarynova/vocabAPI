import { createClient } from '@libsql/client';

export const db = createClient({
  url: process.env.DATABASE_URL || 'file:vocab.db',
  authToken: process.env.DATABASE_AUTH_TOKEN, 
});

// context will hold actual statement the word was found in
// last four attributes are for spaced repition
export async function initDb() {
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
}