const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', 'public');

test('account management page is isolated from the app orchestrator', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const account = fs.readFileSync(path.join(root, 'account-components.jsx'), 'utf8');
  assert.doesNotMatch(app, /function AccountManagementPage/);
  assert.match(account, /function AccountManagementPage/);
  assert.match(account, /\/api\/user-accounts/);
});

