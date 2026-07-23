const test = require('node:test');
const assert = require('node:assert/strict');

const {
  modules,
  getModule,
  getPublicModules,
  getPageCapabilities,
  validateModule,
  validateModuleRegistry
} = require('../modules/registry');

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

test('public module manifest is projected from the backend registry', () => {
  const publicModules = getPublicModules();
  const appeals = publicModules.find(module => module.key === 'appeals');

  assert.deepEqual(appeals, {
    key: 'appeals',
    capability: 'appeals',
    pages: ['appeal-drawer'],
    status: 'active'
  });
  assert.equal(Object.prototype.hasOwnProperty.call(appeals, 'routes'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(appeals, 'dependencies'), false);
  assert.equal(getPageCapabilities(publicModules).accounts, 'accountManagement');
});

test('module registry rejects duplicate module keys and page ownership', () => {
  const valid = {
    key: 'first',
    capability: 'appeals',
    dependencies: [],
    routes: [],
    pages: ['shared-page'],
    status: 'active'
  };

  assert.throws(() => validateModuleRegistry([
    valid,
    { ...valid, pages: ['other-page'] }
  ]), /重复模块 key/);
  assert.throws(() => validateModuleRegistry([
    valid,
    { ...valid, key: 'second', capability: 'dataCheck' }
  ]), /页面 shared-page/);
});
