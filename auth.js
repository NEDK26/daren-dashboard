const bcrypt = require('bcryptjs');
const { getDb, prepare } = require('./db');

function initAdmin() {
  const db = getDb();
  const adminUser = process.env.ADMIN_USER || 'admin';
  const adminPass = process.env.ADMIN_PASS || 'admin123';

  const existing = prepare('SELECT id FROM users WHERE display_name = ?').get(adminUser);
  if (!existing) {
    const hash = bcrypt.hashSync(adminPass, 10);
    prepare('INSERT INTO users (display_name, password_hash, role) VALUES (?, ?, ?)').run(adminUser, hash, 'admin');
    console.log(`Admin user "${adminUser}" created.`);
  }
}

function verifyPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

function hashPassword(plain) {
  return bcrypt.hashSync(plain, 10);
}

module.exports = { initAdmin, verifyPassword, hashPassword };
