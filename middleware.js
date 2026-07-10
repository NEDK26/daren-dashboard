const { getDb, prepare } = require('./db');

function requireLogin(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: '未登录' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: '未登录' });
  if (req.session.user.role !== 'admin') return res.status(403).json({ error: '需要管理员权限' });
  next();
}

function auditLog(req, tableName, recordId, changes) {
  const nickname = req.session.user.display_name;
  for (const [col, { old: oldVal, new: newVal }] of Object.entries(changes)) {
    if (oldVal !== newVal) {
      prepare(
        'INSERT INTO audit_logs (user_nickname, table_name, record_id, column_name, old_value, new_value) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(nickname, tableName, String(recordId), col, String(oldVal ?? ''), String(newVal ?? ''));
    }
  }
}

module.exports = { requireLogin, requireAdmin, auditLog };
