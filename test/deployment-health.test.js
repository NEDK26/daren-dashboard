const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const healthModulePath = path.join(root, 'services', 'deployment-health.js');

function loadHealthModule() {
  assert.equal(fs.existsSync(healthModulePath), true, '缺少部署健康检查服务');
  return require(healthModulePath);
}

function createResponse() {
  return {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    }
  };
}

test('deployment health report exposes only safe successful checks', () => {
  const { createHealthReport } = loadHealthModule();
  const report = createHealthReport({
    deployment: { identity: { code: 'sj' } },
    expectedMigrationVersion: 3,
    readMigrationVersion: () => 3,
    assertUploadsAvailable: () => {}
  });

  assert.deepEqual(report, {
    status: 'ok',
    deployment: 'sj',
    checks: {
      database: { status: 'ok', migrationVersion: 3 },
      uploads: { status: 'ok' }
    }
  });
});

test('deployment health report hides database and storage failure details', () => {
  const { createHealthReport } = loadHealthModule();
  const report = createHealthReport({
    deployment: { identity: { code: 'default' } },
    expectedMigrationVersion: 1,
    readMigrationVersion: () => {
      throw new Error('/secret/data.db is unavailable');
    },
    assertUploadsAvailable: () => {
      throw new Error('/secret/uploads is unavailable');
    }
  });

  assert.equal(report.status, 'error');
  assert.deepEqual(report.checks.database, { status: 'error' });
  assert.deepEqual(report.checks.uploads, { status: 'error' });
  assert.doesNotMatch(JSON.stringify(report), /secret|unavailable/);
});

test('deployment health report rejects an unexpected migration version', () => {
  const { createHealthReport } = loadHealthModule();
  const report = createHealthReport({
    deployment: { identity: { code: 'default' } },
    expectedMigrationVersion: 2,
    readMigrationVersion: () => 1,
    assertUploadsAvailable: () => {}
  });

  assert.equal(report.status, 'error');
  assert.deepEqual(report.checks.database, { status: 'error' });
});

test('deployment health handler returns 200 for healthy and 503 for unhealthy reports', () => {
  const { createHealthHandler } = loadHealthModule();
  const healthyResponse = createResponse();
  createHealthHandler(() => ({ status: 'ok' }))(null, healthyResponse);
  assert.equal(healthyResponse.statusCode, 200);

  const unhealthyResponse = createResponse();
  createHealthHandler(() => ({ status: 'error' }))(null, unhealthyResponse);
  assert.equal(unhealthyResponse.statusCode, 503);
});

test('server exposes the public deployment health route', () => {
  const routePath = path.join(root, 'routes', 'health.js');
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  assert.equal(fs.existsSync(routePath), true, '缺少健康检查路由');
  const route = fs.readFileSync(routePath, 'utf8');

  assert.match(server, /routes\/health/);
  assert.match(route, /router\.get\('\/health'/);
});
