const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const db = fs.readFileSync(path.join(__dirname, '../db.js'), 'utf8');
const importer = fs.readFileSync(path.join(__dirname, '../routes/import.js'), 'utf8');
const exporter = fs.readFileSync(path.join(__dirname, '../routes/export.js'), 'utf8');
const darens = fs.readFileSync(path.join(__dirname, '../routes/darens.js'), 'utf8');
const app = fs.readFileSync(path.join(__dirname, '../public/video-components.jsx'), 'utf8');

test('main-platform flag is stored with each video and shown with creator details', () => {
  assert.match(db, /VIDEO_COLUMNS = \[[\s\S]*'is_main_platform'/);
  assert.match(db, /CREATE TABLE \$\{tableName\}[\s\S]*is_main_platform TEXT/);
  assert.match(importer, /INSERT INTO videos \(batch_id, work_id, daren_id, platform, is_main_platform/);
  assert.match(exporter, /v\.is_main_platform/);
  assert.match(darens, /d\.platform/);
  assert.match(app, /达人详情/);
  assert.match(app, /dataIndex: 'is_main_platform'/);
});
