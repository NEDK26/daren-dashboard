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
  assert.throws(() => validateDeploymentConfig({
    identity: { code: 'partial' },
    branding: { title: 'partial', logo: '/partial.png' },
    capabilities: { dataCheck: true }
  }), /缺少能力/);
});

test('capability changes stay scoped to one deployment load and do not alter the stored profile', () => {
  const { profiles, loadDeploymentConfig } = require('../config');
  const disabled = loadDeploymentConfig('sj');
  disabled.capabilities.appeals = false;

  assert.equal(profiles.sj.capabilities.appeals, true);
  assert.equal(loadDeploymentConfig('sj').capabilities.appeals, true);
});

test('production startup rejects an implicit default deployment profile', () => {
  const { getDeploymentConfig } = require('../config');
  const previousNodeEnv = process.env.NODE_ENV;
  const previousProfile = process.env.DEPLOYMENT_PROFILE;
  try {
    process.env.NODE_ENV = 'production';
    delete process.env.DEPLOYMENT_PROFILE;
    assert.throws(() => getDeploymentConfig(), /生产环境必须显式设置 DEPLOYMENT_PROFILE/);
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousProfile === undefined) delete process.env.DEPLOYMENT_PROFILE;
    else process.env.DEPLOYMENT_PROFILE = previousProfile;
  }
});

test('deployment config route exposes only safe profile fields', () => {
  const source = fs.readFileSync(path.join(root, 'routes/deploymentConfig.js'), 'utf8');

  assert.match(source, /router\.get\('\/deployment-config'/);
  assert.match(source, /getPublicDeploymentConfig/);
  assert.doesNotMatch(source, /process\.env\.(SESSION_SECRET|ADMIN_PASS)/);
});

test('frontend loads deployment config before rendering the application shell', () => {
  const app = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
  const context = fs.readFileSync(path.join(root, 'public/deployment-context.js'), 'utf8');

  assert.match(context, /\/api\/deployment-config/);
  assert.match(app, /deploymentConfig/);
  assert.match(app, /deploymentConfig\.branding\.title/);
  assert.match(app, /deploymentConfig\.branding\.logo/);
  assert.match(app, /capabilities\.feeCheck/);
  assert.match(app, /当前部署未启用该功能/);
});
