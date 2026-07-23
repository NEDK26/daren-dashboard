const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const workflowDir = path.join(__dirname, '..', '.github', 'workflows');

test('sj-prod branch is restricted to a master release pointer', () => {
  const source = fs.readFileSync(path.join(workflowDir, 'validate-sj-prod.yml'), 'utf8');
  assert.match(source, /branches: \[sj-prod\]/);
  assert.match(source, /git fetch origin master/);
  assert.match(source, /git merge-base --is-ancestor HEAD origin\/master/);
  assert.match(source, /sj-prod must point to a commit already released through master/);
});

for (const [file, profile, branch] of [
  ['deploy.yml', 'default', 'master'],
  ['deploy-sj-prod.yml', 'sj', 'sj-prod']
]) {
  test(`${file} verifies and health-checks the ${profile} deployment`, () => {
    const source = fs.readFileSync(path.join(workflowDir, file), 'utf8');
    if (file === 'deploy.yml') assert.match(source, new RegExp(`branches: \\[${branch}\\]`));
    else {
      assert.match(source, /workflow_dispatch:/);
      assert.match(source, /description: '已验证的分支、Tag 或 Commit SHA'/);
      assert.match(source, /default: sj-prod/);
      assert.match(source, /uses: actions\/checkout@v4\s+with:\s+ref: \$\{\{ inputs\.ref \}\}/);
    }
    assert.match(source, /needs: verify/);
    assert.match(source, /run: npm test/);
    assert.match(source, /run: npm run build/);
    assert.match(source, /npm ci --omit=dev/);
    assert.match(source, /\/api\/deployment-config/);
    assert.match(source, new RegExp(`\\\"code\\\":\\\"${profile}\\\"`));
    assert.match(source, /git rev-parse HEAD/);
    assert.match(source, /deployed_at=/);
    assert.match(source, /test -f \.env/);
    assert.match(source, new RegExp(`verify-deployment-env\.js ${profile}`));
    assert.ok(source.indexOf('git reset --hard') < source.indexOf('verify-deployment-env.js'));
  });
}
