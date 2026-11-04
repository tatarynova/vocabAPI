import { aiEnabled, defineInContext, translateInContext, makeQuiz, checkSentence } from './ai.js';
import { schedule } from './srs.js';
import express from 'express';
import { db, initDb } from './db.js';
import { lookUp } from './dictionary.js';
import { cleanContext, cleanWord } from './clean.js';

const FEEDBACK_LANGUAGES = { ru: 'Russian', en: 'English' };
const app = express();
app.use(express.json());
app.use(express.static('public'));

app.get('/health', (req, res) => res.json({ ok: true, ai: aiEnabled }));

app.use((req, res, next) => {
  if (!process.env.API_KEY) return next(); // no key set = allow (local only)
  if (req.get('x-api-key') === process.env.API_KEY) return next();
  res.status(401).json({ error: 'Missing or wrong API key' });
});

app.post('/words', async (req, res) => {
  const word = cleanWord(req.body.word);
  const context = cleanContext(req.body.context);
  const source = req.body.source || null;
  if (!word) return res.status(400).json({ error: 'word is required' });

  const dict = await lookUp(word);
//   const definition = dict?.definition ?? null;
  let definition = dict?.definition ?? null;
  try {
  definition = (await defineInContext(word, context)) ?? definition;
  } catch (err) {
  console.error('AI definition failed:', err.message);
  }
  let translation = null;
  try {
    translation = await translateInContext(word, context);
  } catch (err) {
    console.error('AI translation failed:', err.message);
  }

  const result = await db.execute({
    sql: `INSERT INTO words (word, definition, part_of_speech, context, source, translation_ru)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(word) DO UPDATE SET
            context = excluded.context,
            definition = COALESCE(excluded.definition, words.definition),
            translation_ru = COALESCE(excluded.translation_ru, words.translation_ru)
          RETURNING *`,
    args: [word, definition, dict?.partOfSpeech ?? null, context || null, source, translation],
  });
  const saved = result.rows[0];

  const wantsRussian = req.body.notify === 'ru';
  const meaning = wantsRussian
    ? (saved.translation_ru ?? saved.definition) // no translation? fall back to English
    : saved.definition;

  res.status(201).json({
    ...saved,
    message: `${saved.word}: ${meaning ?? 'saved (no definition found)'}`,
  });
});

app.get('/words', async (req, res) => {
  const result = await db.execute('SELECT * FROM words ORDER BY created_at DESC');
  res.json(result.rows);
});

app.delete('/words/:id', async (req, res) => {
  await db.execute({ sql: 'DELETE FROM words WHERE id = ?', args: [req.params.id] });
  res.status(204).end();
});

async function getWord(id) {
  const r = await db.execute({ sql: 'SELECT * FROM words WHERE id = ?', args: [id] });
  return r.rows[0];
}

app.get('/quiz/:id', async (req, res) => {
  if (!aiEnabled) return res.status(503).json({ error: 'AI is not configured' });
  const w = await getWord(req.params.id);
  if (!w) return res.status(404).json({ error: 'word not found' });
  res.json(await makeQuiz(w.word, w.definition));
});

app.post('/check/:id', async (req, res) => {
  if (!aiEnabled) return res.status(503).json({ error: 'AI is not configured' });
  const w = await getWord(req.params.id);
  if (!w) return res.status(404).json({ error: 'word not found' });
  if (!req.body.sentence) return res.status(400).json({ error: 'sentence is required' });
  const language = FEEDBACK_LANGUAGES[req.body.lang] ?? 'English';
  res.json(await checkSentence(w.word, w.definition, req.body.sentence, language));
});

app.get('/review', async (req, res) => {
  const result = await db.execute(
    `SELECT * FROM words WHERE due_at <= datetime('now') ORDER BY due_at LIMIT 20`
  );
  res.json(result.rows);
});

app.post('/review/:id', async (req, res) => {
  const grade = Number(req.body.grade);
  if (![0, 1, 2, 3].includes(grade)) {
    return res.status(400).json({ error: 'grade must be 0, 1, 2 or 3' });
  }
  const found = await db.execute({ sql: 'SELECT * FROM words WHERE id = ?', args: [req.params.id] });
  const card = found.rows[0];
  if (!card) return res.status(404).json({ error: 'word not found' });

  const next = schedule(card, grade);
  await db.execute({
    sql: `UPDATE words SET ease = ?, interval_days = ?, repetitions = ?, due_at = ? WHERE id = ?`,
    args: [next.ease, next.interval_days, next.repetitions, next.due_at, card.id],
  });
  res.json({ id: card.id, ...next });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

const PORT = process.env.PORT || 3000;
await initDb();
app.listen(PORT, '0.0.0.0', () => console.log(`Vocab API running on http://localhost:${PORT}`));