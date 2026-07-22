const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const account = fs.readFileSync(path.join(__dirname, '../public/account-components.jsx'), 'utf8');

test('logged-in users can read the global editable-column configuration', () => {
  const settings = fs.readFileSync(path.join(__dirname, '../routes/settings.js'), 'utf8');
  assert.match(settings, /router\.get\('\/settings\/editable-columns', requireLogin,/);
  assert.match(account, /useEffect\(\(\) => \{\s*api\.get\('\/api\/settings\/editable-columns'\)/s);
});

test('the video editor enables only configured columns for regular users', () => {
  const app = fs.readFileSync(path.join(__dirname, '../public/video-components.jsx'), 'utf8');

  assert.match(app, /editable:\s*col\.editable\s*&&\s*\(isAdmin\s*\|\|\s*editableCols\.includes\(col\.dataIndex\)\)/);
});

test('editable columns are grouped into scannable permission sections', () => {
  const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '../public/style.css'), 'utf8');

  assert.match(app, /基础内容/);
  assert.match(app, /数据指标/);
  assert.match(app, /截图凭证/);
  assert.match(app, /合规与申诉/);
  assert.match(account, /editable-column-groups/);
  assert.match(css, /\.editable-column-groups\s*\{/);
});
