const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const app = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');

test('home batch effect skips role access after logout clears the user', () => {
  assert.match(
    app,
    /if \(!user \|\| page !== 'home' \|\| !batchesLoaded\) return;[\s\S]*?setPage\(user\.role === 'admin'/
  );
});
