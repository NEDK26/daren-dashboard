const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

async function main() {
  const projectRoot = path.resolve(__dirname, '..');
  const backupRoot = path.resolve(process.env.DEPLOYMENT_BACKUP_DIR || path.join(projectRoot, 'backups'));
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const target = path.join(backupRoot, timestamp);

  fs.mkdirSync(target, { recursive: true });

  const database = path.resolve(process.env.DATABASE_PATH || path.join(projectRoot, 'data.db'));
  if (fs.existsSync(database)) {
    const source = new Database(database, { readonly: true, fileMustExist: true });
    try {
      await source.backup(path.join(target, 'data.db'));
    } finally {
      source.close();
    }
  }

  const uploads = path.resolve(process.env.UPLOADS_DIR || path.join(projectRoot, 'uploads'));
  if (fs.existsSync(uploads)) fs.cpSync(uploads, path.join(target, 'uploads'), { recursive: true });

  console.log(JSON.stringify({ backupDir: target, database: fs.existsSync(path.join(target, 'data.db')), uploads: fs.existsSync(path.join(target, 'uploads')) }));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
