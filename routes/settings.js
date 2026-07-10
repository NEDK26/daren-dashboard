const express = require('express');
const router = express.Router();
const { prepare } = require('../db');
const { requireAdmin } = require('../middleware');

router.get('/settings/editable-columns', requireAdmin, (req, res) => {
  const row = prepare("SELECT value FROM settings WHERE key = ?").get('editable_columns');
  res.json({ columns: row ? JSON.parse(row.value) : [] });
});

router.put('/settings/editable-columns', requireAdmin, (req, res) => {
  const { columns } = req.body;
  if (!Array.isArray(columns)) return res.status(400).json({ error: 'columns 必须是数组' });
  prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('editable_columns', JSON.stringify(columns));
  res.json({ ok: true });
});

module.exports = router;
