const fs = require('fs');
const path = require('path');

function readDeploymentProfile(envText) {
  const line = String(envText).split(/\r?\n/).find(value => /^\s*DEPLOYMENT_PROFILE\s*=/.test(value));
  if (!line) return null;
  return line.replace(/^\s*DEPLOYMENT_PROFILE\s*=\s*/, '').trim();
}

function verifyDeploymentEnv(expectedProfile, envText = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8')) {
  const actualProfile = readDeploymentProfile(envText);
  if (actualProfile !== expectedProfile) {
    throw new Error(`服务器 DEPLOYMENT_PROFILE 应为 ${expectedProfile}，实际为 ${actualProfile || '(未配置)'}`);
  }
  return actualProfile;
}

if (require.main === module) {
  const expectedProfile = process.argv[2];
  if (!expectedProfile) throw new Error('用法：node scripts/verify-deployment-env.js <profile>');
  verifyDeploymentEnv(expectedProfile);
  console.log(`Deployment profile verified: ${expectedProfile}`);
}

module.exports = { readDeploymentProfile, verifyDeploymentEnv };
