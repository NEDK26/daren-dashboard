const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('deployment profiles expose the same existing capabilities by default', () => {
  const { loadDeploymentConfig } = require('../config');
  const defaultProfile = loadDeploymentConfig('default');
  const sjProfile = loadDeploymentConfig('sj');

  assert.equal(defaultProfile.identity.code, 'default');
  assert.equal(sjProfile.identity.code, 'sj');
  assert.equal(defaultProfile.capabilities.dataCheck, true);
  assert.equal(defaultProfile.capabilities.appeals, true);
  assert.equal(sjProfile.capabilities.dataCheck, true);
  assert.equal(sjProfile.capabilities.appeals, true);
});

test('deployment profile loader rejects unknown profiles and capabilities', () => {
  const { loadDeploymentConfig, validateDeploymentConfig } = require('../config');

  assert.throws(() => loadDeploymentConfig('unknown'), /未知部署配置/);
  assert.throws(() => validateDeploymentConfig({
    identity: { code: 'bad' },
    branding: { title: 'bad', logo: '/bad.png' },
    capabilities: { notARealCapability: true }
  }), /未知能力/);
});

test('deployment config route exposes only safe profile fields', () => {
  const source = fs.readFileSync(path.join(root, 'routes/deploymentConfig.js'), 'utf8');

  assert.match(source, /router\.get\('\/deployment-config'/);
  assert.match(source, /getPublicDeploymentConfig/);
  assert.doesNotMatch(source, /process\.env\.(SESSION_SECRET|ADMIN_PASS)/);
});

test('frontend loads deployment config before rendering the application shell', () => {
  const app = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');

  assert.match(app, /\/api\/deployment-config/);
  assert.match(app, /deploymentConfig/);
  assert.match(app, /deploymentConfig\.branding\.title/);
  assert.match(app, /deploymentConfig\.branding\.logo/);
  assert.match(app, /capabilities\.feeCheck/);
  assert.match(app, /当前部署未启用该功能/);
});
