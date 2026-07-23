const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('screenshot fields are configurable and checked by both client and server', () => {
  const app = fs.readFileSync(path.join(__dirname, '../public/video-components.jsx'), 'utf8');
  const upload = fs.readFileSync(path.join(__dirname, '../routes/upload.js'), 'utf8');

  for (const field of ['screenshot_plays', 'screenshot_likes', 'screenshot_7d_plays', 'screenshot_7d_likes']) {
    assert.match(app, new RegExp(`key: '${field}'`));
  }
  assert.match(upload, /router\.post\('\/upload\/:id\/:field', requireLogin, authorizeScreenshotUpload, requireCapability\('dataCheck'\), upload\.single\('file'\)/);
  assert.match(upload, /function authorizeScreenshotUpload\(req, res, next\) \{/);
  assert.match(app, /editingKey === record\.id && \(isAdmin \|\| editableCols\.includes\(key\)\)/);
  assert.match(upload, /!isAdmin && !editableCols\.includes\(field\)/);
  assert.match(upload, /video\.nickname !== req\.session\.user\.display_name/);
});

test('screenshot files stay in the browser until the edited row is saved', () => {
  const app = fs.readFileSync(path.join(__dirname, '../public/video-components.jsx'), 'utf8');

  assert.match(app, /const \[pendingScreenshots, setPendingScreenshots\] = useState\(\{\}\)/);
  assert.match(app, /const stageScreenshot = \(key, file\) =>/);
  assert.match(app, /beforeUpload=\{file => stageScreenshot\(key, file\)\}/);
  assert.match(app, /const pendingUploads = Object\.entries\(pendingScreenshots\)/);
  assert.match(app, /await api\.upload\('\/api\/upload\/' \+ videoId \+ '\/' \+ key, pending\.file\)/);
  assert.match(app, /onClick=\{cancelEditing\}/);
  assert.doesNotMatch(app, /beforeUpload=\{file => \{ api\.upload/);
});
