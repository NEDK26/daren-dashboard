const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('data reconciliation card opens the existing data page and fee card stays a placeholder', () => {
  const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
  assert.match(app, /onDataCheck/);
  assert.match(app, /message\.info\('功能正在开发中'\)/);
  assert.match(app, /setPage\('darens'\)/);
  assert.match(app, /setPage\('videos'\)/);
});
