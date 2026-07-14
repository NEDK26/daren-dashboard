const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const app = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');

test('violation and compliance statuses are editable with constrained options', () => {
  assert.match(app, /dataIndex: 'violation_status', width: 65, editable: true/);
  assert.match(app, /dataIndex: 'compliance_status', width: 65, editable: true/);
  assert.match(app, /violation_status:\s*\[[\s\S]*?'未违规'[\s\S]*?'违规'/);
  assert.match(app, /compliance_status:\s*\[[\s\S]*?'不合规'[\s\S]*?'合规'/);
  assert.match(app, /statusOptions\[dataIndex\][\s\S]*?<Select/);
});
