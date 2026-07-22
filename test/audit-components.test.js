const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', 'public');

test('audit page is provided by the audit component bundle', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const audit = fs.readFileSync(path.join(root, 'audit-components.jsx'), 'utf8');
  assert.doesNotMatch(app, /function AuditPage/);
  assert.match(audit, /function AuditPage/);
  assert.match(audit, /\/api\/audit-logs/);
});
