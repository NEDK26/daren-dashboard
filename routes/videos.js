const express = require('express');
const router = express.Router();
const { getDb, prepare, escapeColumn } = require('../db');
const { requireLogin, auditLog } = require('../middleware');
const { resetDarenConfirmation } = require('../services/darenConfirmation');

router.get('/darens/:id/videos', requireLogin, (req, res) => {
  const { id } = req.params;
  const { platform, title, violation, compliance } = req.query;
  const isAdmin = req.session.user.role === 'admin';

  if (!isAdmin) {
    const daren = prepare('SELECT nickname FROM darens WHERE id = ?').get(id);
    if (!daren || daren.nickname !== req.session.user.display_name) {
      return res.status(403).json({ error: '只能查看自己的数据' });
    }
  }

  let sql = 'SELECT * FROM videos WHERE daren_id = ?';
  const params = [id];

  if (platform) { sql += ' AND platform = ?'; params.push(platform); }
  if (title) { sql += ' AND title LIKE ?'; params.push('%' + title + '%'); }
  if (violation && violation !== 'all') { sql += ' AND violation_status = ?'; params.push(violation); }
  if (compliance && compliance !== 'all') { sql += ' AND compliance_status = ?'; params.push(compliance); }
  sql += ' ORDER BY platform, publish_time DESC';

  res.json(prepare(sql).all(...params));
});

router.put('/videos/:id', requireLogin, (req, res) => {
  const { id } = req.params;
  const isAdmin = req.session.user.role === 'admin';

  const video = prepare('SELECT v.*, d.nickname FROM videos v JOIN darens d ON v.daren_id = d.id WHERE v.id = ?').get(id);
  if (!video) return res.status(404).json({ error: '视频不存在' });
  if (!isAdmin && video.nickname !== req.session.user.display_name) {
    return res.status(403).json({ error: '只能编辑自己的数据' });
  }

  const editableCols = getEditableColumns();
  const allowedCols = isAdmin ? Object.keys(req.body) : Object.keys(req.body).filter(k => editableCols.includes(k));
  if (allowedCols.length === 0) return res.status(403).json({ error: '没有可编辑的列' });

  const videoCols = ['title', 'tags', 'content_url', 'duration', 'publish_time',
    'da_plays', 'da_likes', 'da_7d_plays', 'da_7d_likes', 'comments', 'saves', 'shares',
    'violation_status', 'violation_desc', 'compliance_status', 'compliance_desc',
    'is_node', 'node_name', 'is_hot', 'appeal'];

  const changes = {};
  for (const col of allowedCols) {
    if (videoCols.includes(col) && req.body[col] !== undefined) {
      const safeCol = escapeColumn(col);
      const oldValue = String(video[col] ?? '');
      const newValue = String(req.body[col] ?? '');
      if (oldValue !== newValue) {
        changes[col] = { old: oldValue, new: newValue };
        prepare(`UPDATE videos SET ${safeCol} = ? WHERE id = ?`).run(req.body[col], id);
      }
    }
  }

  if (Object.keys(changes).length > 0) {
    resetDarenConfirmation({ prepare, auditLog, req, darenId: video.daren_id });
  }
  auditLog(req, 'videos', id, changes);
  res.json({ ok: true, changes: Object.keys(changes) });
});

function getEditableColumns() {
  const row = prepare("SELECT value FROM settings WHERE key = ?").get('editable_columns');
  return row ? JSON.parse(row.value) : [];
}

module.exports = router;
