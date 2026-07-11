const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('regular users open their own video data immediately after login', () => {
  const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');

  assert.match(app, /if \(!user \|\| user\.role === 'admin' \|\| selectedDaren\) return;/);
  assert.match(app, /api\.get\('\/api\/darens'\).*setSelectedDaren\(daren\).*setPage\('videos'\)/s);
  assert.match(app, /user\.role === 'admin' \? '达人数据管理' : '达人数据'/);
});
