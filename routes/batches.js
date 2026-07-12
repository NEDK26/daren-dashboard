const express = require('express');
const router = express.Router();
const { prepare, withTransaction } = require('../db');
const { requireLogin, requireAdmin, operationLog } = require('../middleware');
const { buildBatchName, getCurrentBatch } = require('../services/batches');
const { publishBatch, revokeBatch } = require('../services/batchLifecycle');

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
    const batch = prepare('SELECT * FROM batches WHERE id = ?').get(info.lastInsertRowid);
    operationLog(req, {
      actionType: '创建批次', subjectType: '批次', subjectId: batch.id, subjectName: batch.name,
      batchId: batch.id, batchName: batch.name,
      changes: [{ field: '批次状态', old: '无', new: '草稿' }]
    });
    res.json({ ok: true, batch });
  } catch (error) {
    const message = /UNIQUE constraint failed/.test(error.message) ? '批次名称已存在' : error.message;
    res.status(400).json({ error: message });
  }
});

router.delete('/batches/:id', requireAdmin, (req, res) => {
  const batch = prepare('SELECT * FROM batches WHERE id = ?').get(req.params.id);
  if (!batch) return res.status(404).json({ error: '批次不存在' });
  if (batch.status !== 'draft') return res.status(400).json({ error: '只能删除草稿批次' });
  try {
    withTransaction(() => {
      const names = [...new Set(prepare('SELECT nickname FROM darens WHERE batch_id = ?').all(batch.id).map(row => row.nickname))];
      prepare('DELETE FROM videos WHERE batch_id = ?').run(batch.id);
      prepare('DELETE FROM darens WHERE batch_id = ?').run(batch.id);
      for (const nickname of names) {
        if (!prepare('SELECT 1 FROM darens WHERE nickname = ? LIMIT 1').get(nickname)) {
          prepare("DELETE FROM users WHERE role = 'user' AND display_name = ?").run(nickname);
        }
      }
      prepare('DELETE FROM batches WHERE id = ?').run(batch.id);
    });
    operationLog(req, {
      actionType: '删除批次', subjectType: '批次', subjectId: batch.id, subjectName: batch.name,
      batchId: batch.id, batchName: batch.name,
      changes: [{ field: '批次状态', old: '草稿', new: '已删除' }]
    });
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: error.message || '删除失败' });
  }
});

router.post('/batches/:id/publish', requireAdmin, (req, res) => {
  try {
    const batch = publishBatch({ prepare, withTransaction, batchId: req.params.id });
    operationLog(req, {
      actionType: '发布批次', subjectType: '批次', subjectId: batch.id, subjectName: batch.name,
      batchId: batch.id, batchName: batch.name,
      changes: [{ field: '批次状态', old: '草稿', new: '当前批次' }]
    });
    res.json({ ok: true, batch });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/batches/:id/revoke', requireAdmin, (req, res) => {
  try {
    const current = prepare("SELECT * FROM batches WHERE id = ? AND status = 'current'").get(req.params.id);
    const batch = revokeBatch({ prepare, withTransaction, batchId: req.params.id });
    operationLog(req, {
      actionType: '撤销发布', subjectType: '批次', subjectId: current?.id, subjectName: current?.name || batch.name,
      batchId: current?.id, batchName: current?.name || batch.name,
      changes: [{ field: '批次状态', old: '当前批次', new: '草稿' }]
    });
    res.json({ ok: true, batch });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
