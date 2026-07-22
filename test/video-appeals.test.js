const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const initSqlJs = require('sql.js');
const dbModule = require('../db');
const { exportColumns } = require('../excel-schema');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

function all(db, sql) {
  const stmt = db.prepare(sql);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

test('video appeals use a separate table with three slots and migrate legacy text', async () => {
  assert.equal(typeof dbModule.createVideoAppealsTable, 'function');
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.run('PRAGMA foreign_keys = ON');
  db.run(`CREATE TABLE videos (
    id INTEGER PRIMARY KEY,
    appeal TEXT
  )`);
  db.run("INSERT INTO videos (id, appeal) VALUES (7, '旧申诉内容')");

  dbModule.createVideoAppealsTable(db);

  assert.deepEqual(all(db, 'SELECT video_id, group_no, appeal_text, image_path FROM video_appeals'), [{
    video_id: 7,
    group_no: 1,
    appeal_text: '旧申诉内容',
    image_path: null
  }]);
  assert.throws(() => db.run("INSERT INTO video_appeals (video_id, group_no) VALUES (7, 4)"));
  assert.throws(() => db.run("INSERT INTO video_appeals (video_id, group_no) VALUES (7, 1)"));
});

test('Excel export appends three appeal text and image pairs', () => {
  assert.deepEqual(exportColumns.slice(-6).map(column => column.header), [
    '申诉文字1', '申诉图片1',
    '申诉文字2', '申诉图片2',
    '申诉文字3', '申诉图片3'
  ]);

  const route = read('routes/export.js');
  for (let group = 1; group <= 3; group++) {
    assert.match(route, new RegExp(`appeal_text_${group}`));
    assert.match(route, new RegExp(`appeal_image_${group}`));
  }
  assert.match(route, /appeal_image_1[^\]]*appeal_image_2[^\]]*appeal_image_3/s);
});

test('appeal API is scoped to the video owner and saves at most three uploaded groups', () => {
  const server = read('server.js');
  const route = read('routes/appeals.js');

  assert.match(server, /require\('\.\/routes\/appeals'\)/);
  assert.match(route, /router\.get\('\/videos\/:id\/appeals', requireLogin/);
  assert.match(route, /router\.post\('\/videos\/:id\/appeals', requireLogin/);
  assert.match(route, /video\.nickname !== req\.session\.user\.display_name/);
  assert.match(route, /video\.batch_status !== 'current'/);
  assert.match(route, /for \(let groupNo = 1; groupNo <= 3; groupNo\+\+\)/);
  assert.match(route, /upload\.fields\(APPEAL_IMAGE_FIELDS\)/);
  assert.match(route, /appealText\.length > 1000/);
});

test('video row opens an appeal drawer and only uploads when the drawer is saved', () => {
  const app = read('public/video-components.jsx');

  assert.match(app, />申诉<\/Button>/);
  assert.match(app, /title="视频申诉"/);
  assert.match(app, /Array\.from\(\{\s*length:\s*3\s*\}/);
  assert.match(app, /api\.upload\('\/api\/videos\/' \+ appealTarget\.id \+ '\/appeals'/);
  assert.doesNotMatch(app, /beforeUpload=\{file => api\.upload\([^\n]*appeals/);
  assert.match(app, /return !isReadOnly \? <Space[^;]*>申诉<\/Button>/s);
});

test('legacy and new Excel appeal text imports into the separate table', () => {
  const route = read('routes/import.js');
  const apiRoute = read('routes/appeals.js');

  assert.match(route, /getVal\('appeal_text_1'\)/);
  assert.match(route, /INSERT INTO video_appeals/);
  assert.match(route, /for \(let groupNo = 1; groupNo <= 3; groupNo\+\+\)/);
  assert.match(apiRoute, /UPDATE videos SET appeal = \?/);
});

test('appeal records drive anomaly submission counts and their images are deleted with the daren', () => {
  const videos = read('routes/videos.js');
  const deletion = read('services/deleteDarens.js');

  assert.match(videos, /EXISTS\s*\(SELECT 1 FROM video_appeals/s);
  assert.match(deletion, /SELECT image_path FROM video_appeals/);
});
