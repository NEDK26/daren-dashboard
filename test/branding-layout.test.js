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

test('workspace shell reuses the logo in aligned brand groups', () => {
  assert.ok((app.match(/src="\/logo\.png"/g) || []).length >= 3);
  assert.match(app, /className="workspace-brand"/);
  assert.match(app, /className="app-brand"/);
  assert.match(app, /className="header-logo"/);
  assert.match(css, /\.app-brand\s*\{[^}]*display:\s*flex[^}]*align-items:\s*center/s);
  assert.match(css, /\.header-logo\s*\{[^}]*object-fit:\s*contain/s);
});

test('workspace navigation stays visible instead of relying on a return arrow', () => {
  assert.match(app, /function WorkspaceSidebar/);
  assert.match(app, /aria-label="工作区导航"/);
  assert.match(css, /\.workspace-sidebar\s*\{[^}]*position:\s*sticky/s);
});

test('fee entry uses a paused prompt and white logo surface', () => {
  assert.match(app, /message\.info\('费用核对暂未开启'\)/);
  assert.doesNotMatch(app, /<small>暂未开启<\/small>/);
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
  assert.match(css, /--accent:\s*#000\s*;/);
  assert.match(css, /\.workspace-nav-item\.active\s*\{[^}]*color:\s*var\(--ink\)[^}]*background:\s*var\(--active\)/s);
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

test('platform and status tags use muted solid fills without outlines', () => {
  assert.match(css, /\.ant-tag\s*\{[^}]*border:\s*0\s*!important/s);
  assert.match(css, /\.ant-tag-blue\s*\{[^}]*background:\s*#dceeff\s*!important/s);
  assert.match(css, /\.ant-tag-orange\s*\{[^}]*background:\s*#f9e7c7\s*!important/s);
  assert.match(css, /\.ant-tag-red\s*\{[^}]*background:\s*#f5dfe2\s*!important/s);
  assert.match(css, /\.ant-tag-green\s*\{[^}]*background:\s*#dceee3\s*!important/s);
  assert.doesNotMatch(css, /\.ant-tag\s*\{[^}]*background:\s*var\(--paper\)\s*!important/s);
});

test('browser autofill keeps login inputs white with black text', () => {
  assert.match(css, /input:-webkit-autofill[^}]*-webkit-text-fill-color:\s*var\(--ink\)[^}]*-webkit-box-shadow:\s*0 0 0 1000px var\(--paper\) inset/s);
});

test('password and search inputs render a single visible frame', () => {
  assert.match(css, /\.ant-input-affix-wrapper\s*>\s*input\.ant-input\s*\{[^}]*border:\s*0\s*!important[^}]*background:\s*transparent\s*!important/s);
  assert.match(css, /\.ant-input-search\s+\.ant-input-affix-wrapper\s*\{[^}]*border-right:\s*0\s*!important/s);
  assert.match(css, /\.ant-input-search-button\s*\{[^}]*border-left:\s*0\s*!important/s);
});

test('fixed table cells are opaque while scrolling', () => {
  assert.match(css, /\.ant-table-cell-fix-left[^}]*background:\s*var\(--card\)\s*!important/s);
  assert.match(css, /\.ant-table-tbody\s*>\s*tr:hover\s*>\s*td\.ant-table-cell-fix-left[^}]*background:\s*var\(--hover\)\s*!important/s);
  assert.match(css, /\.ant-table-cell-fix-right[^}]*background:\s*var\(--card\)\s*!important/s);
  assert.match(css, /\.ant-table-tbody\s*>\s*tr:hover\s*>\s*td\.ant-table-cell-fix-right[^}]*background:\s*var\(--hover\)\s*!important/s);
});

test('application pages keep the full available width without shrinking to their content', () => {
  assert.match(css, /\.app-content\s*\{[^}]*width:\s*100%[^}]*min-width:\s*0/s);
  assert.match(css, /\.app-header h2\s*\{[^}]*white-space:\s*nowrap/s);
});

test('header account opens logout from the username menu', () => {
  assert.match(app, /\bDropdown\b/);
  assert.match(app, /className="account-trigger"/);
  assert.match(app, /className="account-name"/);
  assert.match(app, /className="account-chevron"/);
  assert.match(app, /key:\s*'logout',\s*label:\s*'退出登录'/);
  assert.match(app, /trigger=\{\['click'\]\}/);
  assert.doesNotMatch(app, /className="account-role"|className="logout-button"/);
  assert.match(css, /\.account-trigger\s*\{[^}]*display:\s*flex[^}]*background:\s*transparent[^}]*border:\s*0/s);
  assert.match(css, /\.account-chevron\s*\{[^}]*color:\s*var\(--ink-muted\)/s);
});
