import { createApp } from './app.js';
import { createDb, initDb } from './db.js';

const db = createDb();
await initDb(db);

const PORT = process.env.PORT || 3000;
createApp({ db }).listen(PORT, '0.0.0.0', () => console.log(`Vocab API running on http://localhost:${PORT}`));
