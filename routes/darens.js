const express = require('express');
const path = require('path');
const router = express.Router();
const { getDb, saveDb, prepare, escapeColumn } = require('../db');
const { requireLogin, requireAdmin, requireCapability, auditLog } = require('../middleware');
const { deleteDarensByIds } = require('../services/deleteDarens');
const { getVisibleBatch } = require('../services/batches');

router.get('/daren-categories', requireAdmin, requireCapability('dataCheck'), (req, res) => {
  const resolved = getVisibleBatch(req, req.query.batchId);
  if (resolved.error) return res.status(resolved.status).json({ error: resolved.error });
  const categories = prepare("SELECT category FROM darens WHERE batch_id = ? AND TRIM(category) != '' GROUP BY category ORDER BY MIN(id)")
    .all(resolved.batch.id)
    .map(row => row.category);
  res.json({ categories });
});

router.get('/daren-content-types', requireAdmin, requireCapability('dataCheck'), (req, res) => {
  const resolved = getVisibleBatch(req, req.query.batchId);
  if (resolved.error) return res.status(resolved.status).json({ error: resolved.error });
  const contentTypes = prepare("SELECT content_type FROM darens WHERE batch_id = ? AND TRIM(content_type) != '' GROUP BY content_type ORDER BY MIN(id)")
    .all(resolved.batch.id)
    .map(row => row.content_type);
  res.json({ contentTypes });
});

router.get('/daren-platforms', requireAdmin, requireCapability('dataCheck'), (req, res) => {
  const resolved = getVisibleBatch(req, req.query.batchId);
  if (resolved.error) return res.status(resolved.status).json({ error: resolved.error });
  const platforms = prepare("SELECT platform FROM darens WHERE batch_id = ? AND TRIM(platform) != '' GROUP BY platform ORDER BY MIN(id)")
    .all(resolved.batch.id)
    .map(row => row.platform);
  res.json({ platforms });
});

router.get('/darens', requireLogin, requireCapability('dataCheck'), (req, res) => {
  const { search, category, contentType, confirmationStatus, hasAnomaly, platform, batchId } = req.query;
  const resolved = getVisibleBatch(req, batchId);
  if (resolved.error) return res.status(resolved.status).json({ error: resolved.error });
  const batch = resolved.batch;
  const paged = req.query.page !== undefined || req.query.pageSize !== undefined;
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
  const isAdmin = req.session.user.role === 'admin';
  const nickname = req.session.user.display_name;

  let sql = `
    SELECT d.id, d.nickname, d.organization, d.content_type, d.category, d.platform,
           d.platform_nickname, d.homepage_url, d.account, d.followers,
           d.confirmation_status,
           COALESCE(SUM(v.da_plays), 0) as total_plays
    FROM darens d
    LEFT JOIN videos v ON v.daren_id = d.id
  `;
  const conditions = ['d.batch_id = ?'];
  const params = [batch.id];

  if (!isAdmin) { conditions.push('d.nickname = ?'); params.push(nickname); }
  if (search) { conditions.push('d.nickname LIKE ?'); params.push(`%${search}%`); }
  if (category) { conditions.push('d.category = ?'); params.push(category); }
  if (contentType) { conditions.push('d.content_type = ?'); params.push(contentType); }
  if (confirmationStatus) { conditions.push('d.confirmation_status = ?'); params.push(confirmationStatus); }
  if (platform) { conditions.push('d.platform = ?'); params.push(platform); }
  if (hasAnomaly === 'yes') {
    conditions.push("EXISTS (SELECT 1 FROM videos av WHERE av.daren_id = d.id AND av.batch_id = d.batch_id AND av.anomaly_data != '' AND av.anomaly_data != '{}')");
  }
  if (hasAnomaly === 'no') {
    conditions.push("NOT EXISTS (SELECT 1 FROM videos av WHERE av.daren_id = d.id AND av.batch_id = d.batch_id AND av.anomaly_data != '' AND av.anomaly_data != '{}')");
  }

  const whereSql = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';
  if (paged) {
    sql += whereSql + ' GROUP BY d.id ORDER BY d.id LIMIT ? OFFSET ?';
  } else {
    sql += whereSql + ' GROUP BY d.id ORDER BY d.id';
  }

  const queryParams = paged ? [...params, pageSize, (page - 1) * pageSize] : params;
  const rows = prepare(sql).all(...queryParams);

  // Count anomaly cells per daren (count "数据异常" occurrences in anomaly_data JSON)
  // ponytail: string counting instead of SQLite JSON functions for simplicity
  const anomalyRows = rows.length
    ? prepare(`SELECT daren_id, anomaly_data FROM videos WHERE batch_id = ? AND anomaly_data != '' AND anomaly_data != '{}' AND daren_id IN (${rows.map(() => '?').join(',')})`).all(batch.id, ...rows.map(row => row.id))
    : [];
  const anomalyCounts = new Map();
  for (const a of anomalyRows) {
    let count = 0;
    try { count = Object.keys(JSON.parse(a.anomaly_data)).length; } catch {}
    anomalyCounts.set(a.daren_id, (anomalyCounts.get(a.daren_id) || 0) + count);
  }
  for (const row of rows) row.anomaly_count = anomalyCounts.get(row.id) || 0;

  if (paged) {
    const totalRow = prepare(`SELECT COUNT(*) AS total FROM darens d${whereSql}`).get(...params);
    const statusRow = isAdmin
      ? prepare(`
          SELECT
            SUM(CASE WHEN d.confirmation_status = '待确认' THEN 1 ELSE 0 END) AS pending,
            SUM(CASE WHEN d.confirmation_status = '已确认' THEN 1 ELSE 0 END) AS confirmed,
            SUM(CASE WHEN d.confirmation_status = '已提交申诉' THEN 1 ELSE 0 END) AS appealed
          FROM darens d
          WHERE d.batch_id = ?
        `).get(batch.id)
      : null;
    return res.json({
      rows,
      total: totalRow ? totalRow.total : 0,
      page,
      pageSize,
      statusCounts: {
        pending: Number(statusRow?.pending) || 0,
        confirmed: Number(statusRow?.confirmed) || 0,
        appealed: Number(statusRow?.appealed) || 0
      }
    });
  }
  res.json(rows);
});

router.put('/darens/:id', requireLogin, requireCapability('dataCheck'), (req, res) => {
  const { id } = req.params;
  const isAdmin = req.session.user.role === 'admin';

  const daren = prepare(`
    SELECT d.*, b.status AS batch_status
    FROM darens d JOIN batches b ON b.id = d.batch_id
    WHERE d.id = ?
  `).get(id);
  if (!daren) return res.status(404).json({ error: '达人不存在' });
  if (daren.batch_status !== 'current') return res.status(403).json({ error: '历史批次只读' });
  if (!isAdmin && daren.nickname !== req.session.user.display_name) {
    return res.status(403).json({ error: '只能编辑自己的数据' });
  }

  const editableCols = getEditableColumns();
  const allowedCols = isAdmin ? Object.keys(req.body) : Object.keys(req.body).filter(k => editableCols.includes(k));
  if (allowedCols.length === 0) return res.status(403).json({ error: '没有可编辑的列' });

  const darenCols = ['organization', 'content_type', 'category', 'platform',
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

router.put('/darens/:id/confirmation', requireLogin, requireCapability('dataCheck'), (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (req.session.user.role === 'admin') return res.status(403).json({ error: '管理员仅可查看确认状态' });
  const daren = prepare(`
    SELECT d.*, b.status AS batch_status
    FROM darens d JOIN batches b ON b.id = d.batch_id
    WHERE d.id = ?
  `).get(id);
  if (!daren) return res.status(404).json({ error: '达人不存在' });
  if (daren.batch_status !== 'current') return res.status(403).json({ error: '历史批次只读' });
  if (daren.nickname !== req.session.user.display_name) {
    return res.status(403).json({ error: '只能确认自己的数据' });
  }

  const allowedStatuses = ['已确认', '已提交申诉'];
  if (!allowedStatuses.includes(status)) return res.status(400).json({ error: '无效的确认状态' });

  prepare('UPDATE darens SET confirmation_status = ? WHERE id = ?').run(status, id);
  auditLog(req, 'darens', id, {
    confirmation_status: { old: String(daren.confirmation_status ?? '待确认'), new: status }
  }, status === '已确认' ? '确认数据' : '提交申诉');
  res.json({ ok: true, status });
});

router.delete('/darens', requireAdmin, requireCapability('dataCheck'), (req, res) => {
  try {
    const resolved = getVisibleBatch(req, req.body.batchId);
    if (resolved.error) return res.status(resolved.status).json({ error: resolved.error });
    if (resolved.batch.status !== 'current') return res.status(403).json({ error: '历史批次只读' });
    const result = deleteDarensByIds({
      db: getDb(),
      ids: req.body.ids,
      batchId: resolved.batch.id,
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
