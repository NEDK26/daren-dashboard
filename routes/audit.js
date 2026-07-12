const express = require('express');
const router = express.Router();
const { prepare } = require('../db');
const { requireLogin } = require('../middleware');

router.get('/audit-logs', requireLogin, (req, res) => {
  const { action, keyword, batchId, limit = 200, offset = 0 } = req.query;

  let sql = `SELECT l.* FROM operation_logs l`;
  const conditions = [];
  const params = [];

  if (action) { conditions.push('l.action_type = ?'); params.push(action); }
  if (batchId) { conditions.push('l.batch_id = ?'); params.push(Number(batchId)); }
  if (keyword) {
    conditions.push('(l.operator_name LIKE ? OR l.subject_name LIKE ? OR l.changes_json LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (req.session.user.role !== 'admin') {
    conditions.push('(l.subject_nickname = ? OR l.operator_name = ?)');
    params.push(req.session.user.display_name, req.session.user.display_name);
  }
  const whereSql = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';
  sql += whereSql;
  sql += ' ORDER BY l.created_at DESC, l.id DESC LIMIT ? OFFSET ?';
  const pageSize = Math.min(100, Math.max(1, Number(limit) || 20));
  params.push(pageSize, Math.max(0, Number(offset) || 0));

  const rows = prepare(sql).all(...params);
  const totalRow = prepare('SELECT COUNT(*) as cnt FROM operation_logs l' + whereSql).get(...params.slice(0, -2));
  res.json({ rows, total: totalRow ? totalRow.cnt : 0 });
});

module.exports = router;
