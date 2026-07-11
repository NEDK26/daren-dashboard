const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('anomaly table cells override the default and hover backgrounds', () => {
  const css = fs.readFileSync(path.join(__dirname, '../public/style.css'), 'utf8');

  assert.match(css, /\.ant-table-tbody\s*>\s*tr\s*>\s*td\.cell-anomaly\s*\{[^}]*background:\s*#fff1f0\s*!important;/s);
});
