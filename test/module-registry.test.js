const test = require('node:test');
const assert = require('node:assert/strict');

const { modules, getModule, validateModule } = require('../modules/registry');

test('module registry declares stable capabilities and boundaries', () => {
  assert.equal(modules.length, 8);
  assert.equal(getModule('appeals').capability, 'appeals');
  assert.deepEqual(getModule('appeals').routes, ['/api/appeals']);
  assert.equal(getModule('fee-check').status, 'planned');
  assert.equal(getModule('missing'), null);
});

test('module metadata rejects unknown capabilities and missing arrays', () => {
  assert.throws(() => validateModule({ key: 'bad', capability: 'unknown', dependencies: [], routes: [], pages: [] }), /未知能力/);
  assert.throws(() => validateModule({ key: 'bad', capability: 'appeals' }), /元数据不完整/);
});
