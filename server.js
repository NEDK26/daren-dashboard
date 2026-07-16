require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const { initDb } = require('./db');
const { initAdmin } = require('./auth');

async function main() {
  await initDb();
  initAdmin();

  const app = express();
  const PORT = process.env.PORT || 3001;

  app.use(express.json({ limit: '50mb' }));
  app.use(session({
    secret: process.env.SESSION_SECRET || 'change-me',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000, httpOnly: true }
  }));

  app.use(express.static(path.join(__dirname, 'public')));
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  app.use('/api', require('./routes/auth'));
  app.use('/api', require('./routes/batches'));
  app.use('/api', require('./routes/darens'));
  app.use('/api', require('./routes/videos'));
  app.use('/api', require('./routes/upload'));
  app.use('/api', require('./routes/appeals'));
  app.use('/api', require('./routes/import'));
  app.use('/api', require('./routes/export'));
  app.use('/api', require('./routes/settings'));
  app.use('/api', require('./routes/audit'));

  // SPA fallback
  app.use((req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

  app.listen(PORT, () => {
    console.log('Server running on http://localhost:' + PORT);
  });
}

main().catch(err => { console.error(err); process.exit(1); });
