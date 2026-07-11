const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('screenshot fields are configurable and checked by both client and server', () => {
  const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
  const upload = fs.readFileSync(path.join(__dirname, '../routes/upload.js'), 'utf8');

  for (const field of ['screenshot_plays', 'screenshot_likes', 'screenshot_7d_plays', 'screenshot_7d_likes']) {
    assert.match(app, new RegExp(`key: '${field}'`));
  }
  assert.match(upload, /router\.post\('\/upload\/:workId\/:field', requireLogin, authorizeScreenshotUpload, upload\.single\('file'\)/);
  assert.match(upload, /function authorizeScreenshotUpload\(req, res, next\) \{/);
  assert.match(app, /isAdmin \|\| \(editingKey === record\.work_id && editableCols\.includes\(key\)\)/);
  assert.match(upload, /!isAdmin && !editableCols\.includes\(field\)/);
  assert.match(upload, /video\.nickname !== req\.session\.user\.display_name/);
});
