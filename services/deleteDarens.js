const fs = require('fs');
const path = require('path');

const SCREENSHOT_COLUMNS = ['screenshot_plays', 'screenshot_likes', 'screenshot_7d_plays', 'screenshot_7d_likes'];

function queryAll(db, sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function normalizeIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0) throw new Error('请选择要删除的达人');
  const normalized = [...new Set(ids.map(Number))];
  if (normalized.some(id => !Number.isInteger(id) || id <= 0)) throw new Error('达人 ID 不合法');
  return normalized;
}

function placeholders(values) {
  return values.map(() => '?').join(',');
}

function resolveUploadPath(value, uploadsDir) {
  if (!value || typeof value !== 'string') return null;
  const prefix = '/uploads/';
  const normalized = value.replace(/\\/g, '/');
  if (!normalized.startsWith(prefix)) return null;
  const target = path.resolve(uploadsDir, normalized.slice(prefix.length));
  const root = path.resolve(uploadsDir);
  return target === root || !target.startsWith(root + path.sep) ? null : target;
}

function deleteUploadFiles(rows, uploadsDir) {
  const files = new Set();
  for (const row of rows) {
    for (const col of SCREENSHOT_COLUMNS) {
      const file = resolveUploadPath(row[col], uploadsDir);
      if (file) files.add(file);
    }
  }

  const warnings = [];
  for (const file of files) {
    try {
      fs.unlinkSync(file);
    } catch (err) {
      if (err.code !== 'ENOENT') warnings.push(file);
    }
  }
  return warnings;
}

function deleteDarensByIds({ db, ids, actor, uploadsDir, saveDb }) {
  const darenIds = normalizeIds(ids);
  const sqlIds = placeholders(darenIds);
  const darens = queryAll(db, `SELECT id, nickname FROM darens WHERE id IN (${sqlIds})`, darenIds);
  const found = new Set(darens.map(row => Number(row.id)));
  const missingIds = darenIds.filter(id => !found.has(id));
  if (missingIds.length) throw new Error(`部分达人不存在：${missingIds.join(', ')}`);

  const videos = queryAll(
    db,
    `SELECT work_id, ${SCREENSHOT_COLUMNS.join(', ')} FROM videos WHERE daren_id IN (${sqlIds})`,
    darenIds
  );
  const userNames = darens.map(row => row.nickname);
  const userSql = placeholders(userNames);
  const users = queryAll(
    db,
    `SELECT id FROM users WHERE role = 'user' AND display_name IN (${userSql})`,
    userNames
  );

  try {
    db.run('BEGIN');
    if (actor) {
      for (const daren of darens) {
        db.run(
          'INSERT INTO audit_logs (user_nickname, table_name, record_id, column_name, old_value, new_value) VALUES (?, ?, ?, ?, ?, ?)',
          [actor, 'darens', String(daren.id), '__delete__', daren.nickname, '']
        );
      }
    }
    db.run(`DELETE FROM videos WHERE daren_id IN (${sqlIds})`, darenIds);
    db.run(`DELETE FROM users WHERE role = 'user' AND display_name IN (${userSql})`, userNames);
    db.run(`DELETE FROM darens WHERE id IN (${sqlIds})`, darenIds);
    db.run('COMMIT');
    if (saveDb) saveDb();
  } catch (err) {
    try { db.run('ROLLBACK'); } catch {}
    throw err;
  }

  const fileWarnings = uploadsDir ? deleteUploadFiles(videos, uploadsDir) : [];
  return {
    deletedDarens: darens.length,
    deletedVideos: videos.length,
    deletedUsers: users.length,
    fileWarnings
  };
}

module.exports = { deleteDarensByIds };
