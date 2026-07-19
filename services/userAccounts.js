const crypto = require('node:crypto');
const { hashPassword, verifyPassword } = require('../auth');

const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

function generateRandomPassword(length = 10) {
  return Array.from({ length }, () => PASSWORD_ALPHABET[crypto.randomInt(PASSWORD_ALPHABET.length)]).join('');
}

function validatePassword(password, displayName = '') {
  if (typeof password !== 'string' || password.length < 8) {
    return { ok: false, error: '密码至少需要 8 位' };
  }
  if (displayName && password === displayName) return { ok: false, error: '密码不能与达人昵称相同' };
  return { ok: true };
}

function initializeBatchAccounts({ prepare, withTransaction, batchId }) {
  const darens = prepare(`SELECT d.nickname
    FROM darens d LEFT JOIN users u ON u.display_name = d.nickname
    WHERE d.batch_id = ? AND u.id IS NULL ORDER BY d.nickname`).all(batchId);
  const accounts = [];
  withTransaction(() => {
    for (const daren of darens) {
      const password = generateRandomPassword();
      prepare(`INSERT INTO users
        (display_name, password_hash, role, must_change_password, credential_version, initial_password_issued_at)
        VALUES (?, ?, 'user', 1, 1, datetime('now','localtime'))`
      ).run(daren.nickname, hashPassword(password));
      accounts.push({ display_name: daren.nickname, password });
    }
  });
  return accounts;
}

function resetUserPassword({ prepare, withTransaction, userId }) {
  const user = prepare("SELECT id, display_name, role FROM users WHERE id = ? AND role = 'user'").get(userId);
  if (!user) return null;
  const password = generateRandomPassword();
  withTransaction(() => {
    prepare(`UPDATE users SET password_hash = ?, must_change_password = 1,
      credential_version = credential_version + 1, password_changed_at = NULL
      WHERE id = ?`).run(hashPassword(password), user.id);
  });
  return { ...user, password };
}

function resetUserPasswords({ prepare, withTransaction, userIds }) {
  const users = userIds.length
    ? prepare(`SELECT id, display_name, role FROM users WHERE role = 'user' AND id IN (${userIds.map(() => '?').join(',')})`).all(...userIds)
    : [];
  const accounts = [];
  withTransaction(() => {
    for (const user of users) {
      const password = generateRandomPassword();
      prepare(`UPDATE users SET password_hash = ?, must_change_password = 1,
        credential_version = credential_version + 1, password_changed_at = NULL
        WHERE id = ?`).run(hashPassword(password), user.id);
      accounts.push({ ...user, password });
    }
  });
  return accounts;
}

function changeUserPassword({ prepare, withTransaction, userId, currentPassword, newPassword }) {
  const user = prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user || !verifyPassword(currentPassword || '', user.password_hash)) {
    return { ok: false, error: '当前密码错误' };
  }
  const validation = validatePassword(newPassword, user.display_name);
  if (!validation.ok) return validation;
  withTransaction(() => {
    prepare(`UPDATE users SET password_hash = ?, must_change_password = 0,
      credential_version = credential_version + 1, password_changed_at = datetime('now','localtime')
      WHERE id = ?`).run(hashPassword(newPassword), user.id);
  });
  return { ok: true };
}

module.exports = { generateRandomPassword, validatePassword, initializeBatchAccounts, resetUserPassword, resetUserPasswords, changeUserPassword };
