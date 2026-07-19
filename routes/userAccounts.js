const express = require('express');
const router = express.Router();
const { prepare, withTransaction } = require('../db');
const { requireAdmin, operationLog } = require('../middleware');
const { resetUserPassword, resetUserPasswords } = require('../services/userAccounts');
const { createAccountWorkbook, sendAccountWorkbook } = require('../services/accountWorkbook');

router.get('/user-accounts', requireAdmin, (req, res) => {
  const batchId = Number(req.query.batchId) || 0;
  const search = String(req.query.search || '').trim();
  const conditions = ["u.role = 'user'"];
  const params = [];
  if (batchId) {
    conditions.push('EXISTS (SELECT 1 FROM darens bd WHERE bd.batch_id = ? AND bd.nickname = u.display_name)');
    params.push(batchId);
  }
  if (search) {
    conditions.push('u.display_name LIKE ?');
    params.push(`%${search}%`);
  }
  const rows = prepare(`SELECT u.id, u.display_name, u.must_change_password, u.password_changed_at,
      u.initial_password_issued_at,
      CASE WHEN COUNT(d.id) = 0 THEN '历史无当前批次数据'
        WHEN u.must_change_password = 1 THEN '待首次改密' ELSE '正常' END AS status,
      GROUP_CONCAT(DISTINCT b.name) AS batch_names
    FROM users u
    LEFT JOIN darens d ON d.nickname = u.display_name
    LEFT JOIN batches b ON b.id = d.batch_id
    WHERE ${conditions.join(' AND ')}
    GROUP BY u.id
    ORDER BY u.display_name`).all(...params);
  res.json({ rows, total: rows.length });
});

router.post('/user-accounts/:id/reset-password', requireAdmin, async (req, res) => {
  try {
    const account = resetUserPassword({ prepare, withTransaction, userId: Number(req.params.id) });
    if (!account) return res.status(404).json({ error: '普通用户账号不存在' });
    operationLog(req, {
      actionType: '重置达人密码', subjectType: '用户账号', subjectId: account.id, subjectName: account.display_name,
      subjectNickname: account.display_name,
      changes: [{ field: '密码', old: '原密码', new: '已生成新随机码' }]
    });
    const buffer = await createAccountWorkbook([account]);
    sendAccountWorkbook(res, 'daren-account-reset.xlsx', buffer);
  } catch (error) {
    res.status(400).json({ error: error.message || '重置密码失败' });
  }
});

router.post('/user-accounts/reset-passwords', requireAdmin, async (req, res) => {
  const body = req.body || {};
  const batchId = Number(body.batchId) || 0;
  const all = Boolean(body.all);
  const userIds = Array.isArray(body.userIds) ? body.userIds.map(Number).filter(Number.isInteger) : [];
  let ids = userIds;
  if (!ids.length && batchId) {
    ids = prepare(`SELECT u.id FROM users u
      WHERE u.role = 'user' AND EXISTS (
        SELECT 1 FROM darens d WHERE d.batch_id = ? AND d.nickname = u.display_name
      )`).all(batchId).map(row => row.id);
  } else if (!ids.length && all) {
    ids = prepare("SELECT id FROM users WHERE role = 'user'").all().map(row => row.id);
  }
  if (!ids.length) return res.status(400).json({ error: '没有可重置的普通用户账号' });
  try {
    const accounts = resetUserPasswords({ prepare, withTransaction, userIds: ids });
    operationLog(req, {
      actionType: '批量重置达人密码', subjectType: '用户账号', subjectId: '', subjectName: all ? '全部普通账号' : `账号 ${accounts.length} 个`,
      changes: [{ field: '密码', old: '原密码', new: `已生成 ${accounts.length} 个新随机码` }]
    });
    const buffer = await createAccountWorkbook(accounts);
    sendAccountWorkbook(res, 'daren-account-reset.xlsx', buffer);
  } catch (error) {
    res.status(400).json({ error: error.message || '批量重置密码失败' });
  }
});

module.exports = router;
