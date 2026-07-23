const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', 'routes');

test('business route groups declare deployment capability guards', () => {
  const expectations = {
    videos: 'anomalyMarking',
    userAccounts: 'accountManagement',
    import: 'importExport',
    export: 'importExport',
    audit: 'auditLogs',
    batches: 'batchManagement',
    darens: 'dataCheck',
    settings: 'accountManagement',
    upload: 'dataCheck'
  };

  for (const [route, capability] of Object.entries(expectations)) {
    const source = fs.readFileSync(path.join(root, `${route}.js`), 'utf8');
    assert.match(source, /requireCapability/,
      `${route} route must import requireCapability`);
    assert.match(source, new RegExp(`requireCapability\\(['"]${capability}['"]\\)`),
      `${route} route must guard ${capability}`);
  }
});
