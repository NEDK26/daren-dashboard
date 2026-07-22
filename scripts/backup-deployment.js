const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const backupRoot = path.resolve(process.env.DEPLOYMENT_BACKUP_DIR || path.join(projectRoot, 'backups'));
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const target = path.join(backupRoot, timestamp);

fs.mkdirSync(target, { recursive: true });

const database = path.join(projectRoot, 'data.db');
if (fs.existsSync(database)) fs.copyFileSync(database, path.join(target, 'data.db'));

const uploads = path.join(projectRoot, 'uploads');
if (fs.existsSync(uploads)) fs.cpSync(uploads, path.join(target, 'uploads'), { recursive: true });

console.log(JSON.stringify({ backupDir: target, database: fs.existsSync(path.join(target, 'data.db')), uploads: fs.existsSync(path.join(target, 'uploads')) }));

