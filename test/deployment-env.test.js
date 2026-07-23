const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { readDeploymentProfile, verifyDeploymentEnv } = require('../scripts/verify-deployment-env');

test('reads the deployment profile from a dotenv file', () => {
  assert.equal(readDeploymentProfile('PORT=3001\nDEPLOYMENT_PROFILE=sj\n'), 'sj');
  assert.equal(readDeploymentProfile('PORT=3001\n'), null);
});

test('deployment env verification rejects the wrong profile', () => {
  const validEnv = 'DEPLOYMENT_PROFILE=default\nDATABASE_PATH=data.db\nUPLOADS_DIR=uploads\n';
  assert.equal(verifyDeploymentEnv('default', validEnv), 'default');
  assert.throws(
    () => verifyDeploymentEnv('sj', validEnv),
    /应为 sj，实际为 default/
  );
  assert.throws(
    () => verifyDeploymentEnv('default', 'DEPLOYMENT_PROFILE=default\nUPLOADS_DIR=uploads\n'),
    /DATABASE_PATH/
  );
});

test('the checked-in environment templates select the intended deployment profile', () => {
  const defaultEnv = fs.readFileSync(path.join(__dirname, '..', '.env.example'), 'utf8');
  const sjEnv = fs.readFileSync(path.join(__dirname, '..', '.env.sj.example'), 'utf8');
  assert.equal(readDeploymentProfile(defaultEnv), 'default');
  assert.equal(readDeploymentProfile(sjEnv), 'sj');
});
