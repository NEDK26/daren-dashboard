const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('daren list returns confirmation status summary counts', () => {
  const route = fs.readFileSync(path.join(__dirname, '../routes/darens.js'), 'utf8');
  assert.match(route, /SUM\(CASE WHEN d\.confirmation_status = '待确认'/);
  assert.match(route, /SUM\(CASE WHEN d\.confirmation_status = '已确认'/);
  assert.match(route, /SUM\(CASE WHEN d\.confirmation_status = '已提交申诉'/);
  assert.match(route, /statusCounts/);
});

test('admin frontend renders the three confirmation summary metrics', () => {
  const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
  assert.match(app, /confirmation-summary-card/);
  assert.match(app, /待确认/);
  assert.match(app, /已确认/);
  assert.match(app, /已提交申诉/);
});
