const test = require('node:test');
const assert = require('node:assert/strict');

const { readDeploymentProfile, verifyDeploymentEnv } = require('../scripts/verify-deployment-env');

test('reads the deployment profile from a dotenv file', () => {
  assert.equal(readDeploymentProfile('PORT=3001\nDEPLOYMENT_PROFILE=sj\n'), 'sj');
  assert.equal(readDeploymentProfile('PORT=3001\n'), null);
});

test('deployment env verification rejects the wrong profile', () => {
  assert.equal(verifyDeploymentEnv('default', 'DEPLOYMENT_PROFILE=default\n'), 'default');
  assert.throws(
    () => verifyDeploymentEnv('sj', 'DEPLOYMENT_PROFILE=default\n'),
    /应为 sj，实际为 default/
  );
});
