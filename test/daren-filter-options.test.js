const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
const darenSource = fs.readFileSync(path.join(__dirname, '../public/daren-components.jsx'), 'utf8');

test('daren category and content type options load independently', () => {
  const darenList = darenSource;
  assert.match(darenList, /Promise\.allSettled\(\[api\.get\('\/api\/daren-categories\?batchId=' \+ batch\.id\)/);
  assert.doesNotMatch(darenList, /daren-platforms/);
  assert.match(darenList, /categoryResult\.status === 'fulfilled'/);
  assert.match(darenList, /contentTypeResult\.status === 'fulfilled'/);
});
