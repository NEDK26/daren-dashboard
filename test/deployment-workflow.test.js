const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const workflowDir = path.join(__dirname, '..', '.github', 'workflows');

for (const [file, profile, branch] of [
  ['deploy.yml', 'default', 'master'],
  ['deploy-sj-prod.yml', 'sj', 'sj-prod']
]) {
  test(`${file} verifies and health-checks the ${profile} deployment`, () => {
    const source = fs.readFileSync(path.join(workflowDir, file), 'utf8');
    assert.match(source, new RegExp(`branches: \\[${branch}\\]`));
    assert.match(source, /needs: verify/);
    assert.match(source, /run: npm test/);
    assert.match(source, /run: npm run build/);
    assert.match(source, /npm ci --omit=dev/);
    assert.match(source, /\/api\/deployment-config/);
    assert.match(source, new RegExp(`\\\"code\\\":\\\"${profile}\\\"`));
    assert.match(source, /git rev-parse HEAD/);
    assert.match(source, /deployed_at=/);
  });
}
