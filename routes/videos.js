const express = require('express');
const router = express.Router();
const { getDb, prepare, escapeColumn } = require('../db');
const { requireLogin, requireAdmin, auditLog } = require('../middleware');
const { resetDarenConfirmation } = require('../services/darenConfirmation');
const { updateScreenshotAnomalies } = require('../services/anomalyMarkers');
const { getVisibleBatch } = require('../services/batches');

router.get('/darens/:id/videos', requireLogin, (req, res) => {
  const { id } = req.params;
  const { platform, title, violation, compliance, batchId } = req.query;
  const resolved = getVisibleBatch(req, batchId);
  if (resolved.error) return res.status(resolved.status).json({ error: resolved.error });
  const batch = resolved.batch;
  const paged = req.query.page !== undefined || req.query.pageSize !== undefined;
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
  const isAdmin = req.session.user.role === 'admin';

  if (!isAdmin) {
    const daren = prepare('SELECT nickname FROM darens WHERE id = ? AND batch_id = ?').get(id, batch.id);
    if (!daren || daren.nickname !== req.session.user.display_name) {
      return res.status(403).json({ error: '只能查看自己的数据' });
    }
  }

  let sql = 'SELECT * FROM videos WHERE daren_id = ? AND batch_id = ?';
  const params = [id, batch.id];

  if (platform) { sql += ' AND platform = ?'; params.push(platform); }
  if (title) { sql += ' AND title LIKE ?'; params.push('%' + title + '%'); }
  if (violation && violation !== 'all') { sql += ' AND violation_status = ?'; params.push(violation); }
  if (compliance && compliance !== 'all') { sql += ' AND compliance_status = ?'; params.push(compliance); }
  const filterSql = sql.slice(sql.indexOf(' WHERE '));
  const totalRow = paged ? prepare(`SELECT COUNT(*) AS total FROM videos${filterSql}`).get(...params) : null;
  sql += ' ORDER BY platform, publish_time DESC';
  if (paged) {
    sql += ' LIMIT ? OFFSET ?';
    params.push(pageSize, (page - 1) * pageSize);
  }

  const rows = prepare(sql).all(...params);
  const anomalySummary = getAnomalySummary(id, batch.id);
  if (paged) {
    return res.json({
      rows,
      total: totalRow ? totalRow.total : 0,
      page,
      pageSize,
      anomalySummary
    });
  }
  res.json(rows);
});

router.put('/videos/:id', requireLogin, (req, res) => {
  const { id } = req.params;
  const isAdmin = req.session.user.role === 'admin';

  const video = prepare(`
    SELECT v.*, d.nickname, b.status AS batch_status
    FROM videos v
    JOIN darens d ON v.daren_id = d.id
    JOIN batches b ON b.id = v.batch_id
    WHERE v.id = ?
  `).get(id);
  if (!video) return res.status(404).json({ error: '视频不存在' });
  if (video.batch_status !== 'current') return res.status(403).json({ error: '历史批次只读' });
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
    resetDarenConfirmation({ prepare, darenId: video.daren_id, changes });
  }
  auditLog(req, 'videos', id, changes);
  res.json({ ok: true, changes: Object.keys(changes) });
});

router.put('/videos/:id/anomaly-markers', requireAdmin, (req, res) => {
  const { id } = req.params;
  const fields = req.body?.fields;
  if (!Array.isArray(fields)) return res.status(400).json({ error: 'fields 必须是数组' });

  const video = prepare(`
    SELECT v.anomaly_data, b.status AS batch_status
    FROM videos v JOIN batches b ON b.id = v.batch_id
    WHERE v.id = ?
  `).get(id);
  if (!video) return res.status(404).json({ error: '视频不存在' });
  if (video.batch_status !== 'current') return res.status(403).json({ error: '历史批次只读' });

  try {
    const result = updateScreenshotAnomalies(video.anomaly_data, fields);
    if (Object.keys(result.changes).length > 0) {
      prepare('UPDATE videos SET anomaly_data = ? WHERE id = ?').run(result.anomalyData, id);
      auditLog(req, 'videos', id, result.changes, '标记异常');
    }
    res.json({ ok: true, changes: Object.keys(result.changes) });
  } catch (error) {
    res.status(400).json({ error: error.message || '异常标记保存失败' });
  }
});

function getEditableColumns() {
  const row = prepare("SELECT value FROM settings WHERE key = ?").get('editable_columns');
  return row ? JSON.parse(row.value) : [];
}

function getAnomalySummary(darenId, batchId) {
  const daren = prepare('SELECT confirmation_status FROM darens WHERE id = ? AND batch_id = ?').get(darenId, batchId);
  const rows = prepare('SELECT anomaly_data, appeal FROM videos WHERE daren_id = ? AND batch_id = ?').all(darenId, batchId);
  const submittedForDaren = daren?.confirmation_status === '已提交申诉';
  let anomalyCount = 0;
  let submittedAnomalyCount = 0;

  for (const row of rows) {
    if (!row.anomaly_data || row.anomaly_data === '{}') continue;
    let count = 0;
    try { count = Object.keys(JSON.parse(row.anomaly_data)).length; } catch {}
    anomalyCount += count;
    if (submittedForDaren || String(row.appeal ?? '').trim()) submittedAnomalyCount += count;
  }

  return { anomalyCount, submittedAnomalyCount };
}

module.exports = router;
