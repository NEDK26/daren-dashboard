const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const db = fs.readFileSync(path.join(__dirname, '../db.js'), 'utf8');
const middleware = fs.readFileSync(path.join(__dirname, '../middleware.js'), 'utf8');
const audit = fs.readFileSync(path.join(__dirname, '../routes/audit.js'), 'utf8');
const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
const auditPage = fs.readFileSync(path.join(__dirname, '../public/audit-components.jsx'), 'utf8');

test('operation logs store one readable event with grouped changes', () => {
  assert.match(db, /CREATE TABLE IF NOT EXISTS operation_logs/);
  assert.match(db, /changes_json TEXT NOT NULL/);
  assert.match(middleware, /function operationLog/);
  assert.match(middleware, /JSON\.stringify\(changes\)/);
  assert.match(audit, /FROM operation_logs/);
  assert.match(audit, /subject_nickname = \?/);
});

test('audit page uses readable event rows and an expandable detail drawer', () => {
  assert.match(auditPage, /Drawer/);
  assert.match(auditPage, /操作类型/);
  assert.match(auditPage, /操作对象/);
  assert.match(auditPage, /title: '达人', dataIndex: 'subject_nickname'/);
  assert.match(auditPage, /达人：\$\{log\.subject_nickname\}/);
  assert.match(auditPage, /<span>达人<\/span>\s*<strong>\{selectedLog\.subject_nickname \|\| '-'\}<\/strong>/);
  assert.match(auditPage, /变更详情/);
  assert.match(auditPage, /audit-mobile-list/);
});
