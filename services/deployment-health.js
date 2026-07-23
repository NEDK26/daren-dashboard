const fs = require('node:fs');
const { CURRENT_SCHEMA_VERSION, prepare } = require('../db');
const { getDeploymentConfig } = require('../config');
const { getUploadsDir } = require('../storage-paths');

function readMigrationVersion() {
  const row = prepare('SELECT MAX(version) AS version FROM schema_migrations').get();
  return Number(row?.version);
}

function assertUploadsAvailable() {
  fs.accessSync(getUploadsDir(), fs.constants.R_OK | fs.constants.W_OK);
}

function createHealthReport(options = {}) {
  const deployment = options.deployment || getDeploymentConfig();
  const expectedMigrationVersion = options.expectedMigrationVersion ?? CURRENT_SCHEMA_VERSION;
  const getMigrationVersion = options.readMigrationVersion || readMigrationVersion;
  const checkUploads = options.assertUploadsAvailable || assertUploadsAvailable;
  const checks = {};

  try {
    const migrationVersion = getMigrationVersion();
    if (migrationVersion !== expectedMigrationVersion) throw new Error('数据库迁移版本不匹配');
    checks.database = { status: 'ok', migrationVersion };
  } catch {
    checks.database = { status: 'error' };
  }

  try {
    checkUploads();
    checks.uploads = { status: 'ok' };
  } catch {
    checks.uploads = { status: 'error' };
  }

  return {
    status: Object.values(checks).every(check => check.status === 'ok') ? 'ok' : 'error',
    deployment: deployment.identity.code,
    checks
  };
}

function createHealthHandler(buildHealthReport = createHealthReport) {
  return (_req, res) => {
    try {
      const report = buildHealthReport();
      return res.status(report.status === 'ok' ? 200 : 503).json(report);
    } catch {
      return res.status(503).json({
        status: 'error',
        deployment: null,
        checks: { configuration: { status: 'error' } }
      });
    }
  };
}

module.exports = {
  createHealthHandler,
  createHealthReport,
  readMigrationVersion,
  assertUploadsAvailable
};
