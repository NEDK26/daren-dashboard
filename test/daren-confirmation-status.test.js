const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const initSqlJs = require('sql.js');

let resetDarenConfirmation;
try {
  ({ resetDarenConfirmation } = require('../services/darenConfirmation'));
} catch {
  resetDarenConfirmation = null;
}

function createPrepare(db) {
  return sql => ({
    get: (...params) => {
      const stmt = db.prepare(sql);
      if (params.length) stmt.bind(params);
      const row = stmt.step() ? stmt.getAsObject() : undefined;
      stmt.free();
      return row;
    },
    run: (...params) => db.run(sql, params)
  });
}

test('confirmation status has the three allowed states and only normal users can submit their own daren', () => {
  const source = fs.readFileSync(path.join(__dirname, '../routes/darens.js'), 'utf8');
  const schema = fs.readFileSync(path.join(__dirname, '../db.js'), 'utf8');

  assert.match(schema, /confirmation_status TEXT NOT NULL DEFAULT '待确认'\s+CHECK\s*\(\s*confirmation_status IN \('待确认', '已确认', '已提交申诉'\)\s*\)/);
  assert.match(schema, /CREATE TRIGGER IF NOT EXISTS validate_darens_confirmation_status_insert\s+BEFORE INSERT ON darens[\s\S]*?NEW\.confirmation_status NOT IN \('待确认', '已确认', '已提交申诉'\)/);
  assert.match(schema, /CREATE TRIGGER IF NOT EXISTS validate_darens_confirmation_status_update\s+BEFORE UPDATE OF confirmation_status ON darens[\s\S]*?NEW\.confirmation_status NOT IN \('待确认', '已确认', '已提交申诉'\)/);
  assert.match(source, /router\.put\('\/darens\/:id\/confirmation', requireLogin,/);
  assert.match(source, /\['已确认', '已提交申诉'\]/);
  assert.match(source, /router\.put\('\/darens\/:id\/confirmation', requireLogin, \(req, res\) => \{[\s\S]*?if \(req\.session\.user\.role === 'admin'\) return res\.status\(403\)/);
  assert.match(source, /daren\.nickname !== req\.session\.user\.display_name/);
});

test('video saves and screenshot uploads use the shared confirmation reset helper', () => {
  const videos = fs.readFileSync(path.join(__dirname, '../routes/videos.js'), 'utf8');
  const upload = fs.readFileSync(path.join(__dirname, '../routes/upload.js'), 'utf8');
  assert.match(videos, /resetDarenConfirmation\(\{[^}]*darenId: video\.daren_id/s);
  assert.match(upload, /resetDarenConfirmation\(\{[^}]*darenId: video\.daren_id/s);
});

test('confirmation reset persists the pending status and audits only a real status change', async () => {
  assert.ok(resetDarenConfirmation, 'expected darenConfirmation service');
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  const prepare = createPrepare(db);
  const audits = [];
  const req = { session: { user: { display_name: 'alice' } } };
  db.run("CREATE TABLE darens (id INTEGER PRIMARY KEY, confirmation_status TEXT NOT NULL)");
  db.run("INSERT INTO darens (id, confirmation_status) VALUES (1, '已确认')");

  assert.equal(resetDarenConfirmation({
    prepare,
    auditLog: (...args) => audits.push(args),
    req,
    darenId: 1
  }), true);
  assert.equal(prepare('SELECT confirmation_status FROM darens WHERE id = ?').get(1).confirmation_status, '待确认');
  assert.deepEqual(audits, [[req, 'darens', 1, {
    confirmation_status: { old: '已确认', new: '待确认' }
  }]]);

  assert.equal(resetDarenConfirmation({
    prepare,
    auditLog: (...args) => audits.push(args),
    req,
    darenId: 1
  }), false);
  assert.equal(audits.length, 1);
});

test('video changes compare normalized persisted and submitted values before recording changes', () => {
  const videos = fs.readFileSync(path.join(__dirname, '../routes/videos.js'), 'utf8');

  assert.match(videos, /const oldValue = String\(video\[col\] \?\? ''\);\s+const newValue = String\(req\.body\[col\] \?\? ''\);\s+if \(oldValue !== newValue\) \{\s+changes\[col\] = \{ old: oldValue, new: newValue \};/);
});
