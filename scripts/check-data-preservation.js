const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function listFiles(root, relative = '') {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    const entryRelative = path.join(relative, entry.name);
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) return listFiles(fullPath, entryRelative);
    return [{ path: entryRelative, sha256: sha256(fullPath), size: fs.statSync(fullPath).size }];
  }).sort((left, right) => left.path.localeCompare(right.path));
}

function createSnapshot({ databasePath, uploadsDir }) {
  return {
    database: fs.existsSync(databasePath) ? { sha256: sha256(databasePath), size: fs.statSync(databasePath).size } : null,
    uploads: listFiles(uploadsDir)
  };
}

function assertSnapshotUnchanged(before, after) {
  if (JSON.stringify(before) !== JSON.stringify(after)) {
    throw new Error('数据库或上传目录发生变化');
  }
}

function resolvePaths() {
  const projectRoot = path.resolve(__dirname, '..');
  return {
    databasePath: path.resolve(process.env.DATABASE_PATH || path.join(projectRoot, 'data.db')),
    uploadsDir: path.resolve(process.env.UPLOADS_DIR || path.join(projectRoot, 'uploads'))
  };
}

if (require.main === module) {
  const mode = process.argv[2];
  const snapshotPath = process.argv[3];
  if (!['snapshot', 'verify'].includes(mode) || !snapshotPath) {
    console.error('用法：node scripts/check-data-preservation.js <snapshot|verify> <snapshot.json>');
    process.exit(1);
  }
  const paths = resolvePaths();
  if (mode === 'snapshot') {
    fs.writeFileSync(path.resolve(snapshotPath), JSON.stringify(createSnapshot(paths), null, 2) + '\n');
    console.log(`数据快照已写入：${path.resolve(snapshotPath)}`);
  } else {
    const before = JSON.parse(fs.readFileSync(path.resolve(snapshotPath), 'utf8'));
    assertSnapshotUnchanged(before, createSnapshot(paths));
    console.log('数据库和上传目录未发生变化');
  }
}

module.exports = { createSnapshot, assertSnapshotUnchanged, listFiles };
