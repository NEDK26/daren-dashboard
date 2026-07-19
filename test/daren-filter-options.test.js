const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');

test('daren category and content type options load independently', () => {
  const darenList = app.slice(app.indexOf('function DarenList'), app.indexOf('function VideoDetail'));
  assert.match(darenList, /Promise\.allSettled\(\[api\.get\('\/api\/daren-categories\?batchId=' \+ batch\.id\)/);
  assert.doesNotMatch(darenList, /daren-platforms/);
  assert.match(app, /categoryResult\.status === 'fulfilled'/);
  assert.match(app, /contentTypeResult\.status === 'fulfilled'/);
});
