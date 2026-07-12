const express = require('express');
const router = express.Router();
const { prepare } = require('../db');
const { requireLogin, requireAdmin } = require('../middleware');
const { buildBatchName, getCurrentBatch } = require('../services/batches');

router.get('/batches', requireLogin, (req, res) => {
  const isAdmin = req.session.user.role === 'admin';
  const batches = isAdmin
    ? prepare(`SELECT * FROM batches ORDER BY CASE status WHEN 'current' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END, imported_at DESC, id DESC`).all()
    : prepare(`
        SELECT DISTINCT b.* FROM batches b
        LEFT JOIN darens d ON d.batch_id = b.id AND d.nickname = ?
        WHERE b.status = 'current' OR (b.status = 'history' AND d.id IS NOT NULL)
        ORDER BY CASE b.status WHEN 'current' THEN 0 ELSE 1 END, b.imported_at DESC, b.id DESC
      `).all(req.session.user.display_name);
  res.json({ batches, current: getCurrentBatch() || null });
});

router.post('/batches', requireAdmin, (req, res) => {
  if (prepare("SELECT 1 FROM batches WHERE status = 'draft'").get()) {
    return res.status(400).json({ error: '已有草稿批次' });
  }
  try {
    const year = Number(req.body.year);
    const month = Number(req.body.month);
    const title = String(req.body.title || '').trim();
    const name = buildBatchName(year, month, title);
    const info = prepare('INSERT INTO batches (name, year, month, title, status) VALUES (?, ?, ?, ?, ?)')
      .run(name, year, month, title, 'draft');
    res.json({ ok: true, batch: prepare('SELECT * FROM batches WHERE id = ?').get(info.lastInsertRowid) });
  } catch (error) {
    const message = /UNIQUE constraint failed/.test(error.message) ? '批次名称已存在' : error.message;
    res.status(400).json({ error: message });
  }
});

router.delete('/batches/:id', requireAdmin, (req, res) => {
  const batch = prepare('SELECT * FROM batches WHERE id = ?').get(req.params.id);
  if (!batch) return res.status(404).json({ error: '批次不存在' });
  if (batch.status !== 'draft') return res.status(400).json({ error: '只能删除草稿批次' });
  prepare('DELETE FROM batches WHERE id = ?').run(batch.id);
  res.json({ ok: true });
});

module.exports = router;
