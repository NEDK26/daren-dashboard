const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('logged-in users can read the global editable-column configuration', () => {
  const settings = fs.readFileSync(path.join(__dirname, '../routes/settings.js'), 'utf8');
  const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');

  assert.match(settings, /router\.get\('\/settings\/editable-columns', requireLogin,/);
  assert.match(app, /useEffect\(\(\) => \{\s*api\.get\('\/api\/settings\/editable-columns'\)/s);
});
