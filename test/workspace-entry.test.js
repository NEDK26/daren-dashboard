const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');

test('users choose a work area before data navigation is shown', () => {
  assert.match(app, /const \[activeWorkspace, setActiveWorkspace\] = useState\(null\)/);
  assert.match(app, /function FeePlaceholderPage/);
  assert.match(app, /onFeeCheck/);
  assert.match(app, /setActiveWorkspace\('data'\)/);
  assert.match(app, /setPage\('fees'\)/);
  assert.match(app, /activeWorkspace === 'data' && <AppNavigation/);
  assert.match(app, /返回选择/);
});

test('the active workbench card can be opened with a keyboard', () => {
  assert.match(app, /role="button"/);
  assert.match(app, /tabIndex=\{0\}/);
  assert.match(app, /event\.key === 'Enter'/);
});
