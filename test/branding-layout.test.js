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
  assert.match(css, /\.login-card\s+\.ant-card-head-title\s*\{[^}]*text-align:\s*center/s);
});

test('fee placeholder uses the paused label and white logo surface', () => {
  assert.match(app, /暂未开启/);
  assert.doesNotMatch(app, /功能正在开发中/);
  assert.match(css, /\.login-logo-frame\s*\{[^}]*background:\s*var\(--paper\)/s);
});

test('dashboard base surfaces use white backgrounds', () => {
  assert.match(css, /--paper:\s*#fff\s*;/);
  assert.match(css, /--page:\s*#fff\s*;/);
  assert.match(css, /--card:\s*#fff\s*;/);
});

test('global theme uses white surfaces with black text', () => {
  assert.match(css, /--ink:\s*#000\s*;/);
  assert.match(css, /--ink-secondary:\s*#333\s*;/);
  assert.match(css, /\.app-header\s*\{[^}]*background:\s*var\(--paper\)[^}]*color:\s*var\(--ink\)/s);
  assert.match(css, /\.ant-btn-primary\s*\{[^}]*background:\s*var\(--paper\)\s*!important[^}]*color:\s*var\(--ink\)\s*!important/s);
});

test('neutral theme removes warm surface and text colors', () => {
  assert.match(css, /html,\s*body,\s*#root,\s*\.ant-layout\s*\{[^}]*background:\s*#fff\s*!important[^}]*color:\s*#000/s);
  assert.match(css, /--success:\s*#000\s*;/);
  assert.match(css, /--warning:\s*#000\s*;/);
  assert.match(css, /--douyin:\s*#000\s*;/);
  assert.match(css, /--kuaishou:\s*#000\s*;/);
  assert.match(css, /--bilibili:\s*#000\s*;/);
  assert.doesNotMatch(css, /#c47a23|#5a8a6a|#ff6b00|rgba\(139,94,60/i);
});

test('browser autofill keeps login inputs white with black text', () => {
  assert.match(css, /input:-webkit-autofill[^}]*-webkit-text-fill-color:\s*var\(--ink\)[^}]*-webkit-box-shadow:\s*0 0 0 1000px var\(--paper\) inset/s);
});

test('fixed table action cells are opaque while scrolling', () => {
  assert.match(css, /\.ant-table-cell-fix-right[^}]*background:\s*var\(--card\)\s*!important/s);
  assert.match(css, /\.ant-table-tbody\s*>\s*tr:hover\s*>\s*td\.ant-table-cell-fix-right[^}]*background:\s*var\(--hover\)\s*!important/s);
});
