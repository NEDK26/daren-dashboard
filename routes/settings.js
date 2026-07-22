const express = require('express');
const router = express.Router();
const { prepare } = require('../db');
const { requireLogin, requireAdmin, requireCapability, operationLog } = require('../middleware');

router.get('/settings/editable-columns', requireLogin, requireCapability('accountManagement'), (req, res) => {
  const row = prepare("SELECT value FROM settings WHERE key = ?").get('editable_columns');
  res.json({ columns: row ? JSON.parse(row.value) : [] });
});

router.put('/settings/editable-columns', requireAdmin, requireCapability('accountManagement'), (req, res) => {
  const { columns } = req.body;
  if (!Array.isArray(columns)) return res.status(400).json({ error: 'columns 必须是数组' });
  const oldRow = prepare("SELECT value FROM settings WHERE key = ?").get('editable_columns');
  prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('editable_columns', JSON.stringify(columns));
  operationLog(req, {
    actionType: '修改编辑权限', subjectType: '系统设置', subjectName: '可编辑列权限',
    changes: [{ field: '可编辑列', old: oldRow ? oldRow.value : '[]', new: JSON.stringify(columns) }]
  });
  res.json({ ok: true });
});

module.exports = router;
