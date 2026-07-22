const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('confirmation UI shows the three statuses and submits the correct user actions', () => {
  const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
  const daren = fs.readFileSync(path.join(__dirname, '../public/daren-components.jsx'), 'utf8');
  assert.match(daren, /title:\s*'核对状态',\s*dataIndex:\s*'confirmation_status'/);
  assert.match(app, /确认数据无误/);
  assert.match(app, /是否确认提交修改/);
  assert.match(app, /'已确认'/);
  assert.match(app, /'已提交申诉'/);
});
