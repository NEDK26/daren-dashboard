const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/style.css'), 'utf8');

test('login page uses the provided logo in a centered panel', () => {
  assert.ok(fs.existsSync(path.join(root, 'public/logo.png')));
  assert.match(app, /login-panel/);
  assert.match(app, /src="\/logo\.png"/);
  assert.match(css, /\.login-panel\s*\{[^}]*display:\s*flex/s);
});

test('dashboard base surfaces use white backgrounds', () => {
  assert.match(css, /--paper:\s*#fff\s*;/);
  assert.match(css, /--page:\s*#fff\s*;/);
  assert.match(css, /--card:\s*#fff\s*;/);
});

test('fixed table action cells are opaque while scrolling', () => {
  assert.match(css, /\.ant-table-cell-fix-right[^}]*background:\s*var\(--card\)\s*!important/s);
  assert.match(css, /\.ant-table-tbody\s*>\s*tr:hover\s*>\s*td\.ant-table-cell-fix-right[^}]*background:\s*var\(--hover\)\s*!important/s);
});
