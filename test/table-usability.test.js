const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');

test('tables reveal truncated text and let users choose page size', () => {
  assert.match(app, /const PAGE_SIZE_OPTIONS = \['20', '50', '100'\]/);
  assert.match(app, /const textTooltip = value => value \? <Tooltip title=\{value\}>/);
  assert.match(app, /render: textTooltip/);
  assert.match(app, /showSizeChanger: true/);
  assert.match(app, /pageSizeOptions: PAGE_SIZE_OPTIONS/);
  assert.match(app, /params\.set\('pageSize', pageSize\)/);
});

test('wide data tables scroll inside the page and use a Chinese empty state', () => {
  assert.match(app, /const TABLE_LOCALE = \{ emptyText: '当前批次暂无数据' \}/);
  assert.match(app, /scroll=\{\{x:1200\}\}/);
  assert.match(app, /locale=\{TABLE_LOCALE\}/);
});
