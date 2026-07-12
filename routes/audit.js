const express = require('express');
const router = express.Router();
const { prepare } = require('../db');
const { requireLogin } = require('../middleware');

router.get('/audit-logs', requireLogin, (req, res) => {
  const { table, record, user, limit = 200, offset = 0 } = req.query;

  let sql = 'SELECT * FROM audit_logs';
  const conditions = [];
  const params = [];

  if (table) { conditions.push('table_name = ?'); params.push(table); }
  if (record) { conditions.push('record_id = ?'); params.push(record); }
  if (req.session.user.role === 'admin' && user) { conditions.push('user_nickname = ?'); params.push(user); }
  if (req.session.user.role !== 'admin') { conditions.push('user_nickname = ?'); params.push(req.session.user.display_name); }
  const whereSql = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';
  sql += whereSql;
  sql += ' ORDER BY changed_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const rows = prepare(sql).all(...params);
  const totalRow = prepare('SELECT COUNT(*) as cnt FROM audit_logs' + whereSql).get(...params.slice(0, -2));
  res.json({ rows, total: totalRow ? totalRow.cnt : 0 });
});

module.exports = router;
