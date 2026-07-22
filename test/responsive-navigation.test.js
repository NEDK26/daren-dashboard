const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
const workspace = fs.readFileSync(path.join(__dirname, '../public/workspace-components.jsx'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../public/style.css'), 'utf8');
const audit = fs.readFileSync(path.join(__dirname, '../routes/audit.js'), 'utf8');

test('responsive navigation exposes role-specific desktop and mobile destinations', () => {
  assert.match(workspace, /function AppNavigation/);
  assert.match(workspace, /达人核对/);
  assert.match(workspace, /label: '批次'/);
  assert.match(workspace, /label: '权限'/);
  assert.match(workspace, /label: '操作日志'/);
  assert.match(workspace, /数据核对/);
  assert.match(workspace, /我的日志/);
  assert.match(workspace, /切换批次/);
  assert.match(app, /function BatchSwitchPage/);
  assert.match(css, /\.desktop-nav/);
  assert.match(css, /\.mobile-nav/);
});

test('tablet widths switch to compact navigation before the header becomes crowded', () => {
  assert.match(css, /@media\s*\(max-width:\s*960px\)/);
  assert.match(css, /@media\s*\(max-width:\s*960px\)[\s\S]*?\.desktop-nav\s*\{[^}]*display:\s*none/s);
  assert.match(css, /@media\s*\(max-width:\s*960px\)[\s\S]*?\.mobile-nav\s*\{[^}]*display:\s*flex/s);
});

test('regular users can read operation events related to their own data', () => {
  assert.match(audit, /router\.get\('\/audit-logs', requireLogin/);
  assert.match(audit, /subject_nickname = \?/);
  assert.match(audit, /operator_name = \?/);
  assert.match(audit, /req\.session\.user\.display_name/);
});
