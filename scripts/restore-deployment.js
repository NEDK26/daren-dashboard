const fs = require('node:fs');
const path = require('node:path');

const backupDir = process.argv[2] && path.resolve(process.argv[2]);
if (!backupDir || process.argv[3] !== '--confirm') {
  console.error('用法：node scripts/restore-deployment.js <backup-dir> --confirm');
  process.exit(1);
}

const projectRoot = path.resolve(__dirname, '..');
const database = path.join(backupDir, 'data.db');
const uploads = path.join(backupDir, 'uploads');
if (!fs.existsSync(backupDir)) throw new Error(`备份目录不存在：${backupDir}`);
if (!fs.existsSync(database) && !fs.existsSync(uploads)) throw new Error('备份目录中没有可恢复的数据');

if (fs.existsSync(database)) fs.copyFileSync(database, path.join(projectRoot, 'data.db'));
if (fs.existsSync(uploads)) {
  const target = path.join(projectRoot, 'uploads');
  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(uploads, target, { recursive: true });
}

console.log(`已恢复部署数据：${backupDir}`);

