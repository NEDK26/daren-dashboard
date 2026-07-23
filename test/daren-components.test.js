const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', 'public');

test('daren list page is provided by the dedicated component bundle', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const daren = fs.readFileSync(path.join(root, 'daren-components.jsx'), 'utf8');
  assert.doesNotMatch(app, /function DarenList/);
  assert.match(daren, /function DarenList/);
  assert.match(daren, /className="admin-review-page"/);
});
