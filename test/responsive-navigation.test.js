const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../public/style.css'), 'utf8');
const audit = fs.readFileSync(path.join(__dirname, '../routes/audit.js'), 'utf8');

test('responsive navigation exposes role-specific desktop and mobile destinations', () => {
  assert.match(app, /function AppNavigation/);
  assert.match(app, /达人页/);
  assert.match(app, /批次管理/);
  assert.match(app, /编辑设置/);
  assert.match(app, /完整审计日志/);
  assert.match(app, /数据核对/);
  assert.match(app, /我的日志/);
  assert.match(app, /切换批次/);
  assert.match(app, /function BatchSwitchPage/);
  assert.match(css, /\.desktop-nav/);
  assert.match(css, /\.mobile-nav/);
});

test('regular users can read operation events related to their own data', () => {
  assert.match(audit, /router\.get\('\/audit-logs', requireLogin/);
  assert.match(audit, /subject_nickname = \?/);
  assert.match(audit, /operator_name = \?/);
  assert.match(audit, /req\.session\.user\.display_name/);
});
