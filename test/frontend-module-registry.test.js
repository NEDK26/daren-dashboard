const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', 'public');

test('frontend does not load a second static module registry', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.doesNotMatch(html, /module-registry\.js/);
  assert.equal(fs.existsSync(path.join(root, 'module-registry.js')), false);
});

test('frontend navigation reads page capabilities from deployment config modules', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  assert.match(app, /deploymentConfig\.modules/);
  assert.doesNotMatch(app, /window\.DAREN_MODULES/);
  assert.doesNotMatch(app, /const capabilityByPage = \{/);
});
