const express = require('express');
const router = express.Router();
const { prepare } = require('../db');
const { requireAdmin } = require('../middleware');

router.get('/audit-logs', requireAdmin, (req, res) => {
  const { table, record, user, limit = 200, offset = 0 } = req.query;

  let sql = 'SELECT * FROM audit_logs';
  const conditions = [];
  const params = [];

  if (table) { conditions.push('table_name = ?'); params.push(table); }
  if (record) { conditions.push('record_id = ?'); params.push(record); }
  if (user) { conditions.push('user_nickname = ?'); params.push(user); }
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY changed_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const rows = prepare(sql).all(...params);
  const totalRow = prepare('SELECT COUNT(*) as cnt FROM audit_logs').get();
  res.json({ rows, total: totalRow ? totalRow.cnt : 0 });
});

module.exports = router;
