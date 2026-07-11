const express = require('express');
const path = require('path');
const router = express.Router();
const { getDb, saveDb, prepare, escapeColumn } = require('../db');
const { requireLogin, requireAdmin, auditLog } = require('../middleware');
const { deleteDarensByIds } = require('../services/deleteDarens');

router.get('/darens', requireLogin, (req, res) => {
  const { search, category } = req.query;
  const isAdmin = req.session.user.role === 'admin';
  const nickname = req.session.user.display_name;

  let sql = `
    SELECT d.id, d.nickname, d.organization, d.content_type, d.category,
           d.platform_nickname, d.homepage_url, d.account, d.followers,
           d.confirmation_status,
           COALESCE(SUM(v.da_plays), 0) as total_plays
    FROM darens d
    LEFT JOIN videos v ON v.daren_id = d.id
  `;
  const conditions = [];
  const params = [];

  if (!isAdmin) { conditions.push('d.nickname = ?'); params.push(nickname); }
  if (search) { conditions.push('d.nickname LIKE ?'); params.push(`%${search}%`); }
  if (category) { conditions.push('d.category = ?'); params.push(category); }

  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' GROUP BY d.id ORDER BY d.id';

  const rows = prepare(sql).all(...params);

  // Count anomaly cells per daren (count "数据异常" occurrences in anomaly_data JSON)
  // ponytail: string counting instead of SQLite JSON functions for simplicity
  for (const row of rows) {
    const anomalyRows = prepare(
      "SELECT anomaly_data FROM videos WHERE daren_id = ? AND anomaly_data != '' AND anomaly_data != '{}'"
    ).all(row.id);
    let count = 0;
    for (const a of anomalyRows) {
      try {
        const obj = JSON.parse(a.anomaly_data);
        count += Object.keys(obj).length;
      } catch {}
    }
    row.anomaly_count = count;
  }

  res.json(rows);
});

router.put('/darens/:id', requireLogin, (req, res) => {
  const { id } = req.params;
  const isAdmin = req.session.user.role === 'admin';

  const daren = prepare('SELECT * FROM darens WHERE id = ?').get(id);
  if (!daren) return res.status(404).json({ error: '达人不存在' });
  if (!isAdmin && daren.nickname !== req.session.user.display_name) {
    return res.status(403).json({ error: '只能编辑自己的数据' });
  }

  const editableCols = getEditableColumns();
  const allowedCols = isAdmin ? Object.keys(req.body) : Object.keys(req.body).filter(k => editableCols.includes(k));
  if (allowedCols.length === 0) return res.status(403).json({ error: '没有可编辑的列' });

  const darenCols = ['organization', 'content_type', 'category', 'platform', 'is_main_platform',
    'platform_nickname', 'homepage_url', 'account', 'followers'];

  const changes = {};
  for (const col of allowedCols) {
    if (darenCols.includes(col) && req.body[col] !== undefined) {
      const safeCol = escapeColumn(col);
      changes[col] = { old: String(daren[col] ?? ''), new: String(req.body[col] ?? '') };
      prepare(`UPDATE darens SET ${safeCol} = ? WHERE id = ?`).run(req.body[col], id);
    }
  }

  auditLog(req, 'darens', id, changes);
  res.json({ ok: true, changes: Object.keys(changes) });
});

router.put('/darens/:id/confirmation', requireLogin, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (req.session.user.role === 'admin') return res.status(403).json({ error: '管理员仅可查看确认状态' });
  const daren = prepare('SELECT * FROM darens WHERE id = ?').get(id);
  if (!daren) return res.status(404).json({ error: '达人不存在' });
  if (daren.nickname !== req.session.user.display_name) {
    return res.status(403).json({ error: '只能确认自己的数据' });
  }

  const allowedStatuses = ['已确认', '已提交申诉'];
  if (!allowedStatuses.includes(status)) return res.status(400).json({ error: '无效的确认状态' });

  prepare('UPDATE darens SET confirmation_status = ? WHERE id = ?').run(status, id);
  auditLog(req, 'darens', id, {
    confirmation_status: { old: String(daren.confirmation_status ?? '待确认'), new: status }
  });
  res.json({ ok: true, status });
});

router.delete('/darens', requireAdmin, (req, res) => {
  try {
    const result = deleteDarensByIds({
      db: getDb(),
      ids: req.body.ids,
      actor: req.session.user.display_name,
      uploadsDir: path.join(__dirname, '..', 'uploads'),
      saveDb
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message || '删除失败' });
  }
});

function getEditableColumns() {
  const row = prepare("SELECT value FROM settings WHERE key = ?").get('editable_columns');
  return row ? JSON.parse(row.value) : [];
}

module.exports = router;
