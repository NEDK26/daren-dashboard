const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');

test('build script compiles workspace components and index loads them first', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  assert.match(pkg.scripts.build, /workspace-components\.jsx/);
  assert.match(html, /workspace-components\.build\.js/);
  assert.ok(html.indexOf('workspace-components.build.js') < html.indexOf('app.build.js'));
});

