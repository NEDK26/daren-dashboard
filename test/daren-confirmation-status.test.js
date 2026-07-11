const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('confirmation status has the three allowed states and only normal users can submit their own daren', () => {
  const source = fs.readFileSync(path.join(__dirname, '../routes/darens.js'), 'utf8');
  const schema = fs.readFileSync(path.join(__dirname, '../db.js'), 'utf8');

  assert.match(schema, /confirmation_status TEXT NOT NULL DEFAULT '待确认'/);
  assert.match(source, /router\.put\('\/darens\/:id\/confirmation', requireLogin,/);
  assert.match(source, /\['已确认', '已提交申诉'\]/);
  assert.match(source, /router\.put\('\/darens\/:id\/confirmation', requireLogin, \(req, res\) => \{[\s\S]*?if \(req\.session\.user\.role === 'admin'\) return res\.status\(403\)/);
  assert.match(source, /daren\.nickname !== req\.session\.user\.display_name/);
});
