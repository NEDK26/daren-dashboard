const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
const workspace = fs.readFileSync(path.join(__dirname, '../public/workspace-components.jsx'), 'utf8');

test('persistent workspace navigation routes directly into data', () => {
  assert.match(app, /const \[activeWorkspace, setActiveWorkspace\] = useState\(null\)/);
  assert.doesNotMatch(app, /function FeePlaceholderPage/);
  assert.match(app, /onFeeCheck/);
  assert.match(app, /setActiveWorkspace\('data'\)/);
  assert.doesNotMatch(app, /setPage\('fees'\)/);
  assert.match(app, /message\.info\('费用核对暂未开启'\)/);
  assert.match(app, /<WorkspaceSidebar/);
  assert.match(app, /activeWorkspace=\{activeWorkspace\}/);
  assert.match(app, /onDataCheck=\{enterDataCheck\}/);
  assert.doesNotMatch(app, /请选择要核对的内容/);
});

test('workspace destinations use native buttons', () => {
  assert.match(workspace, /<nav className="workspace-navigation"/);
  assert.match(workspace, /<button key=\{key\} type="button" className=\{'workspace-nav-item '/);
});
