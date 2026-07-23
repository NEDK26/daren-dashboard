const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', 'public');

test('frontend loads the shared API client before the application bundle', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /api-client\.js/);
  assert.ok(html.indexOf('api-client.js') < html.indexOf('app.build.js'));
});

test('application uses the shared API client instead of defining request methods', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  assert.match(app, /const api = window\.DAREN_API/);
  assert.doesNotMatch(app, /get: \(url, options = \{\}\) => fetch/);
});

