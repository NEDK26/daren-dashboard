const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const script = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'backup-deployment.js'), 'utf8');

test('deployment backup copies database and uploads to a timestamped directory', () => {
  assert.match(script, /data\.db/);
  assert.match(script, /uploads/);
  assert.match(script, /toISOString/);
  assert.match(script, /DEPLOYMENT_BACKUP_DIR/);
});

test('deployment restore requires an explicit confirmation flag', () => {
  const restore = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'restore-deployment.js'), 'utf8');
  assert.match(restore, /--confirm/);
  assert.match(restore, /data\.db/);
  assert.match(restore, /uploads/);
});

test('deployment workflows run backups before restarting the service', () => {
  for (const file of ['deploy.yml', 'deploy-sj-prod.yml']) {
    const workflow = fs.readFileSync(path.join(__dirname, '..', '.github', 'workflows', file), 'utf8');
    assert.match(workflow, /backup-deployment\.js/);
    assert.ok(workflow.indexOf('backup-deployment.js') < workflow.indexOf('pm2 restart'));
  }
});
