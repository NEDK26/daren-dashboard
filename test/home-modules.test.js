const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('data reconciliation opens the data workspace and fee check has a returnable placeholder', () => {
  const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
  assert.match(app, /onDataCheck/);
  assert.match(app, /function FeePlaceholderPage/);
  assert.match(app, /setPage\('fees'\)/);
  assert.match(app, /返回选择/);
  assert.match(app, /setPage\('darens'\)/);
  assert.match(app, /setPage\('videos'\)/);
});
