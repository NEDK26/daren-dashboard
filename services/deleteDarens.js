const fs = require('fs');
const path = require('path');

const SCREENSHOT_COLUMNS = ['screenshot_plays', 'screenshot_likes', 'screenshot_7d_plays', 'screenshot_7d_likes'];

function queryAll(db, sql, params = []) {
  return db.prepare(sql).all(...params);
}

function execute(db, sql, params = []) {
  return db.prepare(sql).run(...params);
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

function deleteUploadFiles(rows, uploadsDir, columns = SCREENSHOT_COLUMNS) {
  const files = new Set();
  for (const row of rows) {
    for (const col of columns) {
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

function deleteDarensByIds({ db, ids, batchId, actor, uploadsDir }) {
  const darenIds = normalizeIds(ids);
  const sqlIds = placeholders(darenIds);
  const normalizedBatchId = Number(batchId);
  const hasBatch = Number.isInteger(normalizedBatchId) && normalizedBatchId > 0;
  const batchFilter = hasBatch ? ' AND batch_id = ?' : '';
  const scopedParams = hasBatch ? [...darenIds, normalizedBatchId] : darenIds;
  const darens = queryAll(db, `SELECT id, nickname FROM darens WHERE id IN (${sqlIds})${batchFilter}`, scopedParams);
  const found = new Set(darens.map(row => Number(row.id)));
  const missingIds = darenIds.filter(id => !found.has(id));
  if (missingIds.length) throw new Error(`部分达人不存在：${missingIds.join(', ')}`);

  const videos = queryAll(
    db,
    `SELECT rowid AS video_id, work_id, ${SCREENSHOT_COLUMNS.join(', ')} FROM videos WHERE daren_id IN (${sqlIds})${batchFilter}`,
    scopedParams
  );
  const videoIds = videos.map(video => Number(video.video_id));
  const hasAppealTable = queryAll(db, "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'video_appeals'").length > 0;
  const appealImages = hasAppealTable && videoIds.length
    ? queryAll(db, `SELECT image_path FROM video_appeals WHERE video_id IN (${placeholders(videoIds)})`, videoIds)
    : [];
  const userNames = [...new Set(darens.map(row => row.nickname))];
  let deletedUsers = 0;

  db.transaction(() => {
    if (actor) {
      for (const daren of darens) {
        execute(
          db,
          `INSERT INTO operation_logs
            (batch_id, operator_name, action_type, subject_type, subject_id, subject_name, subject_nickname, changes_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [hasBatch ? normalizedBatchId : null, actor, '删除数据', '达人', String(daren.id), daren.nickname, daren.nickname,
            JSON.stringify([{ field: '数据状态', old: '存在', new: '已删除' }])]
        );
      }
    }
    execute(db, `DELETE FROM videos WHERE daren_id IN (${sqlIds})${batchFilter}`, scopedParams);
    execute(db, `DELETE FROM darens WHERE id IN (${sqlIds})${batchFilter}`, scopedParams);
    for (const nickname of userNames) {
      const remaining = queryAll(db, 'SELECT 1 FROM darens WHERE nickname = ? LIMIT 1', [nickname]);
      if (remaining.length) continue;
      const result = execute(db, "DELETE FROM users WHERE role = 'user' AND display_name = ?", [nickname]);
      deletedUsers += result.changes;
    }
  })();

  const fileWarnings = uploadsDir
    ? [...deleteUploadFiles(videos, uploadsDir), ...deleteUploadFiles(appealImages, uploadsDir, ['image_path'])]
    : [];
  return {
    deletedDarens: darens.length,
    deletedVideos: videos.length,
    deletedUsers,
    fileWarnings
  };
}

module.exports = { deleteDarensByIds };
