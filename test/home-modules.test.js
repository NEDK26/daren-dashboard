const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('data reconciliation opens the data workspace and fee check stays on the current page', () => {
  const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
  assert.match(app, /onDataCheck/);
  assert.doesNotMatch(app, /function FeePlaceholderPage/);
  assert.doesNotMatch(app, /setPage\('fees'\)/);
  assert.match(app, /message\.info\('费用核对暂未开启'\)/);
  assert.match(app, /setPage\('darens'\)/);
  assert.match(app, /setPage\('videos'\)/);
});
