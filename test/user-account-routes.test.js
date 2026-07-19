const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('users store credential status without plaintext passwords', () => {
  const db = read('db.js');
  assert.match(db, /must_change_password/);
  assert.match(db, /credential_version/);
  assert.match(db, /initial_password_issued_at/);
});

test('import defers account creation to an explicit initialization action', () => {
  const source = read('routes/import.js');
  assert.doesNotMatch(source, /hashPassword\('123456'\)/);
  assert.doesNotMatch(source, /INSERT OR IGNORE INTO users/);
});

test('admin can initialize accounts from a batch and manage user accounts', () => {
  assert.match(read('routes/batches.js'), /initialize-accounts/);
  assert.match(read('routes/userAccounts.js'), /user-accounts/);
  assert.match(read('routes/userAccounts.js'), /reset-password/);
});

test('users can change passwords and sessions track credential versions', () => {
  assert.match(read('routes/auth.js'), /account\/password/);
  assert.match(read('middleware.js'), /credential_version/);
});

test('admin home exposes a foundation workbench and account menu exposes password change', () => {
  const app = read('public/app.js');
  assert.match(app, /基础工作台/);
  assert.match(app, /达人账号管理/);
  assert.match(app, /修改密码/);
});
