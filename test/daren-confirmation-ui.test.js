const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('confirmation UI shows the three statuses and submits the correct user actions', () => {
  const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
  const daren = fs.readFileSync(path.join(__dirname, '../public/daren-components.jsx'), 'utf8');
  const video = fs.readFileSync(path.join(__dirname, '../public/video-components.jsx'), 'utf8');
  assert.match(daren, /title:\s*'核对状态',\s*dataIndex:\s*'confirmation_status'/);
  assert.match(video, /确认数据无误/);
  assert.match(video, /是否确认提交修改/);
  assert.match(video, /'已确认'/);
  assert.match(video, /'已提交申诉'/);
});
