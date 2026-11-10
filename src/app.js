import express from 'express';
import * as realAi from './ai.js';
import { lookUp as realLookUp } from './dictionary.js';
import { schedule } from './srs.js';
import { cleanContext, cleanWord, cleanText } from './clean.js';
import { computeStats } from './stats.js';

const FEEDBACK_LANGUAGES = { ru: 'Russian', en: 'English' };
const STATS_RANGES = [7, 30, 90];
const MAX_WORD = 60;
const MAX_TEXT = 1000;

// Builds the Express app. Everything that talks to the outside world (database,
// Claude, Wiktionary) is passed in, so tests can swap in fakes.
export function createApp({ db, ai = realAi, lookUp = realLookUp, apiKey = process.env.API_KEY } = {}) {
  const app = express();
  app.use(express.json());
  app.use(express.static('public'));

  app.get('/health', (req, res) => res.json({ ok: true, ai: ai.aiEnabled }));

  app.use((req, res, next) => {
    if (!apiKey) return next(); // no key set = allow (local only)
    if (req.get('x-api-key') === apiKey) return next();
    res.status(401).json({ error: 'Missing or wrong API key' });
  });

  // Saves a word. Used by the iOS Shortcut and by the "Add word" form.
  // definition / translation are optional: if the user typed them, they are
  // used as they are; otherwise the AI (or the dictionary) fills them in.
  app.post('/words', async (req, res) => {
    const word = cleanWord(req.body.word);
    const context = cleanContext(req.body.context);
    const source = cleanText(req.body.source).slice(0, 100) || null;
    const ownDefinition = cleanText(req.body.definition);
    const ownTranslation = cleanText(req.body.translation);
    if (!word) return res.status(400).json({ error: 'word is required' });
    if (word.length > MAX_WORD) return res.status(400).json({ error: `word must be at most ${MAX_WORD} letters` });
    if ([context, ownDefinition, ownTranslation].some((t) => t.length > MAX_TEXT)) {
      return res.status(400).json({ error: `text fields must be at most ${MAX_TEXT} characters` });
    }

    let definition = ownDefinition || null;
    let partOfSpeech = null;
    if (!definition) {
      const dict = await lookUp(word);
      definition = dict?.definition ?? null;
      partOfSpeech = dict?.partOfSpeech ?? null;
      try {
        definition = (await ai.defineInContext(word, context)) ?? definition;
      } catch (err) {
        console.error('AI definition failed:', err.message);
      }
    }

    let translation = ownTranslation || null;
    if (!translation) {
      try {
        translation = await ai.translateInContext(word, context);
      } catch (err) {
        console.error('AI translation failed:', err.message);
      }
    }

    const result = await db.execute({
      sql: `INSERT INTO words (word, definition, part_of_speech, context, source, translation_ru)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(word) DO UPDATE SET
              context = COALESCE(excluded.context, words.context),
              definition = COALESCE(excluded.definition, words.definition),
              part_of_speech = COALESCE(excluded.part_of_speech, words.part_of_speech),
              translation_ru = COALESCE(excluded.translation_ru, words.translation_ru)
            RETURNING *`,
      args: [word, definition, partOfSpeech, context || null, source, translation],
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
    const result = await db.execute('SELECT * FROM words ORDER BY created_at DESC, id DESC');
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
    if (!ai.aiEnabled) return res.status(503).json({ error: 'AI is not configured' });
    const w = await getWord(req.params.id);
    if (!w) return res.status(404).json({ error: 'word not found' });
    res.json(await ai.makeQuiz(w.word, w.definition));
  });

  app.post('/check/:id', async (req, res) => {
    if (!ai.aiEnabled) return res.status(503).json({ error: 'AI is not configured' });
    const w = await getWord(req.params.id);
    if (!w) return res.status(404).json({ error: 'word not found' });
    if (!req.body.sentence) return res.status(400).json({ error: 'sentence is required' });
    const language = FEEDBACK_LANGUAGES[req.body.lang] ?? 'English';
    res.json(await ai.checkSentence(w.word, w.definition, req.body.sentence, language));
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
    const card = await getWord(req.params.id);
    if (!card) return res.status(404).json({ error: 'word not found' });

    const next = schedule(card, grade);
    await db.batch(
      [
        {
          sql: `UPDATE words SET ease = ?, interval_days = ?, repetitions = ?, due_at = ? WHERE id = ?`,
          args: [next.ease, next.interval_days, next.repetitions, next.due_at, card.id],
        },
        {
          sql: 'INSERT INTO reviews (word_id, grade, interval_days) VALUES (?, ?, ?)',
          args: [card.id, grade, next.interval_days],
        },
      ],
      'write'
    );
    res.json({ id: card.id, ...next });
  });

  // Progress charts. ?days=7|30|90 picks the range; ?tz is the browser's
  // getTimezoneOffset(), so reviews are counted on the user's own calendar days.
  app.get('/stats', async (req, res) => {
    const days = STATS_RANGES.includes(Number(req.query.days)) ? Number(req.query.days) : 30;
    const tz = Number.parseInt(req.query.tz, 10);
    const tzOffsetMinutes = Number.isFinite(tz) && Math.abs(tz) <= 14 * 60 ? tz : 0;

    const [words, reviews] = await Promise.all([
      db.execute('SELECT created_at, due_at, interval_days FROM words'),
      db.execute('SELECT grade, reviewed_at FROM reviews'),
    ]);
    res.json(computeStats({ words: words.rows, reviews: reviews.rows, tzOffsetMinutes, days }));
  });

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  });

  return app;
}
