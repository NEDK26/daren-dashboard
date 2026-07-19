const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../public/style.css'), 'utf8');

test('tables reveal truncated text and let users choose page size', () => {
  assert.match(app, /const PAGE_SIZE_OPTIONS = \['20', '50', '100'\]/);
  assert.match(app, /const textTooltip = value => value \? <Tooltip title=\{value\} placement="topRight" overlayClassName="table-text-tooltip">/);
  assert.match(app, /<span className="table-ellipsis-trigger">\{value\}<\/span>/);
  assert.match(app, /render: textTooltip/);
  assert.match(css, /\.table-text-tooltip\s*\{[^}]*max-width:\s*220px\s*!important/s);
  assert.match(css, /\.table-text-tooltip\s+\.ant-tooltip-inner\s*\{[^}]*word-break:\s*break-word/s);
  assert.match(css, /\.table-ellipsis-trigger\s*\{[^}]*display:\s*block[^}]*max-width:\s*100%[^}]*overflow:\s*hidden[^}]*text-overflow:\s*ellipsis[^}]*white-space:\s*nowrap/s);
  assert.match(app, /showSizeChanger: true/);
  assert.match(app, /pageSizeOptions: PAGE_SIZE_OPTIONS/);
  assert.match(app, /params\.set\('pageSize', pageSize\)/);
});

test('wide data tables scroll inside the page and use a Chinese empty state', () => {
  assert.match(app, /const TABLE_LOCALE = \{\s*emptyText:\s*'当前批次暂无数据'\s*\}/);
  assert.match(app, /scroll=\{\{\s*x:\s*920\s*\}\}/);
  assert.match(app, /locale=\{TABLE_LOCALE\}/);
});
