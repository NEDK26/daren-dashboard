const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const app = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');
const darenSource = fs.readFileSync(path.join(__dirname, '..', 'public', 'daren-components.jsx'), 'utf8');

test('export downloads the full selected batch with progress and error feedback', () => {
  const darens = darenSource;
  const exportHandler = darens.slice(darens.indexOf('const handleExport'), darens.indexOf('const handleDelete'));
  assert.match(darens, /const \[exporting, setExporting\] = useState\(false\)/);
  assert.match(darens, /fetch\('\/api\/export\?/);
  assert.match(darens, /await response\.blob\(\)/);
  assert.match(darens, /URL\.createObjectURL\(blob\)/);
  assert.match(darens, /download =/);
  assert.match(darens, /loading=\{exporting\}/);
  assert.doesNotMatch(exportHandler, /if \(search\) params\.set\('search'/);
  assert.doesNotMatch(exportHandler, /if \(category\) params\.set\('category'/);
  assert.doesNotMatch(exportHandler, /if \(contentType\) params\.set\('contentType'/);
  assert.doesNotMatch(darens, /window\.open\('\/api\/export/);
});
