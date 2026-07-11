const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.db');

let _db = null;

async function initDb() {
  if (_db) return _db;
  const SQL = await initSqlJs();

  let buffer;
  try { buffer = fs.readFileSync(DB_PATH); } catch { buffer = null; }
  _db = buffer ? new SQL.Database(buffer) : new SQL.Database();

  _db.run('PRAGMA foreign_keys = ON');
  initSchema();
  saveDb();
  return _db;
}

function getDb() {
  if (!_db) throw new Error('DB not initialized. Call await initDb() first.');
  return _db;
}

function saveDb() {
  const data = _db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function initSchema() {
  _db.run(`CREATE TABLE IF NOT EXISTS darens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nickname TEXT NOT NULL UNIQUE,
    organization TEXT,
    content_type TEXT,
    category TEXT,
    total_plays INTEGER DEFAULT 0,
    platform TEXT,
    is_main_platform TEXT,
    platform_nickname TEXT,
    homepage_url TEXT,
    account TEXT,
    followers INTEGER DEFAULT 0
  )`);

  _db.run(`CREATE TABLE IF NOT EXISTS videos (
    work_id TEXT PRIMARY KEY,
    daren_id INTEGER NOT NULL,
    platform TEXT NOT NULL,
    title TEXT,
    tags TEXT,
    content_url TEXT,
    duration INTEGER DEFAULT 0,
    publish_time TEXT,
    da_plays INTEGER DEFAULT 0,
    da_likes INTEGER DEFAULT 0,
    da_7d_plays INTEGER DEFAULT 0,
    da_7d_likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    violation_status TEXT,
    violation_desc TEXT,
    compliance_status TEXT,
    compliance_desc TEXT,
    is_node TEXT,
    node_name TEXT,
    is_hot TEXT,
    appeal TEXT,
    screenshot_plays TEXT,
    screenshot_likes TEXT,
    screenshot_7d_plays TEXT,
    screenshot_7d_likes TEXT,
	    anomaly_data TEXT DEFAULT '',
    FOREIGN KEY (daren_id) REFERENCES darens(id)
  )`);

  _db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    display_name TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin','user'))
  )`);

  _db.run(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`);

  _db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_nickname TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    column_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  )`);

  try { _db.run("ALTER TABLE videos ADD COLUMN anomaly_data TEXT DEFAULT ''"); } catch {}
  _db.run('CREATE INDEX IF NOT EXISTS idx_videos_daren_id ON videos(daren_id)');
  _db.run('CREATE INDEX IF NOT EXISTS idx_videos_platform ON videos(platform)');
  _db.run('CREATE INDEX IF NOT EXISTS idx_audit_table_record ON audit_logs(table_name, record_id)');
}

// Prepare wrapper mimicking better-sqlite3 sync API
function prepare(sql) {
  const stmt = _db.prepare(sql);
  return {
    get: (...params) => {
      if (params.length) stmt.bind(params);
      const row = stmt.step() ? stmt.getAsObject() : undefined;
      stmt.free();
      return row;
    },
    all: (...params) => {
      if (params.length) stmt.bind(params);
      const rows = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      stmt.free();
      return rows;
    },
    run: (...params) => {
      if (params.length) stmt.bind(params);
      stmt.step();
      const changes = _db.getRowsModified();
      stmt.free();
      // Get last insert rowid
      const lastId = prepare('SELECT last_insert_rowid() as id').get();
      saveDb();
      return { changes, lastInsertRowid: lastId ? lastId.id : 0 };
    }
  };
}

// Escape column names for dynamic SQL (sql.js doesn't allow param binding for column names)
function escapeColumn(col) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col)) throw new Error('Invalid column name: ' + col);
  return col;
}

module.exports = { initDb, getDb, saveDb, prepare, escapeColumn };
