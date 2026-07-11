const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('export keeps video insertion order from Excel import', () => {
  const route = fs.readFileSync(path.join(__dirname, '../routes/export.js'), 'utf8');
  assert.match(route, /ORDER BY v\.id/);
  assert.doesNotMatch(route, /ORDER BY d\.nickname, v\.platform, v\.publish_time DESC/);
});
