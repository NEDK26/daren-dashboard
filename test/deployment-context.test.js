const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', 'public');

test('deployment context loads before the application bundle', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /deployment-context\.js/);
  assert.ok(html.indexOf('deployment-context.js') < html.indexOf('app.build.js'));
});

test('application delegates deployment loading and branding to the shared context', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  assert.match(app, /window\.DAREN_DEPLOYMENT\.load\(\)/);
  assert.match(app, /window\.DAREN_DEPLOYMENT\.applyBranding/);
});

