import express from 'express';
import { db, initDb } from './db.js';
import { lookUp } from './dictionary.js';
import { cleanContext, cleanWord } from './clean.js';

const app = express();
app.use(express.json());
app.use(express.static('public'));

app.get('/health', (req, res) => res.json({ ok: true }));

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
  const definition = dict?.definition ?? null;

  const result = await db.execute({
    sql: `INSERT INTO words (word, definition, part_of_speech, context, source)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(word) DO UPDATE SET
            context = excluded.context,
            definition = COALESCE(excluded.definition, words.definition)
          RETURNING *`,
    args: [word, definition, dict?.partOfSpeech ?? null, context || null, source],
  });
  const saved = result.rows[0];

  res.status(201).json({
    ...saved,
    message: `${saved.word}: ${saved.definition ?? 'saved (no definition found)'}`,
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

// --- Days 3 and 4: new routes go here, above the error handler ---

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

const PORT = process.env.PORT || 3000;
await initDb();
app.listen(PORT, '0.0.0.0', () => console.log(`Vocab API running on http://localhost:${PORT}`));