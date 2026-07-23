const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', 'public');

test('frontend loads the module registry before the application bundle', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /module-registry\.js/);
  assert.ok(html.indexOf('module-registry.js') < html.indexOf('app.build.js'));
});

test('frontend navigation reads page capabilities from the registry', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  assert.match(app, /window\.DAREN_MODULES\?\.pageCapabilities/);
  assert.doesNotMatch(app, /const capabilityByPage = \{/);
});

