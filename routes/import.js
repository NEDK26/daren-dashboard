const express = require('express');
const router = express.Router();
const multer = require('multer');
const ExcelJS = require('exceljs');
const { prepare, withTransaction } = require('../db');
const { requireAdmin } = require('../middleware');
const { hashPassword } = require('../auth');
const { buildHeaderMap } = require('../excel-schema');

const upload = multer({ storage: multer.memoryStorage() });

const anomalyFields = [
  'title', 'tags', 'content_url', 'duration', 'publish_time',
  'da_plays', 'da_likes', 'da_7d_plays', 'da_7d_likes',
  'comments', 'saves', 'shares', 'violation_status', 'violation_desc',
  'compliance_status', 'compliance_desc', 'is_node', 'node_name', 'is_hot', 'appeal'
];

function isRedFill(cell) {
  const fill = cell.fill || cell.style && cell.style.fill;
  if (!fill || !fill.fgColor) return false;
  const c = fill.fgColor;
  // Check if argb exists and red channel dominates
  if (c.argb && c.argb.length >= 8) {
    const r = parseInt(c.argb.slice(2, 4), 16);
    const g = parseInt(c.argb.slice(4, 6), 16);
    const b = parseInt(c.argb.slice(6, 8), 16);
    return r > 150 && r > g + b;
  }
  return false;
}

router.post('/import', requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '请上传文件' });

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(req.file.buffer);
  const ws = workbook.worksheets[0];
  if (!ws) return res.status(400).json({ error: '空文件' });

  let columns;
  try {
    columns = buildHeaderMap(ws.getRow(1));
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  let imported = 0, skipped = 0, skippedNoName = 0, skippedNoWorkId = 0, skippedConflict = 0, newUsers = 0;
  const darenCache = new Map();

  for (const d of prepare('SELECT id, nickname FROM darens').all()) {
    darenCache.set(d.nickname, d.id);
  }

  const defaultHash = hashPassword('123456');

  console.log('--- [DEBUG] workbook loaded ---');
  console.log('  worksheet name:', ws.name);
  console.log('  row count:', ws.rowCount);
  console.log('  actual row count:', ws.actualRowCount);

  let totalRows = 0;

  withTransaction(() => ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    totalRows++;

    const getCell = (key) => columns[key] ? row.getCell(columns[key]) : null;
    const getVal = (key) => {
      const cell = getCell(key);
      return cell ? cell.text.trim() : '';
    };
    const getNum = (key) => Number(getVal(key).replace(/,/g, '')) || 0;

    const nickname = getVal('nickname');
    if (!nickname) { skippedNoName++; skipped++; return; }

    const workId = getVal('work_id');
    if (!workId) { skippedNoWorkId++; skipped++; return; }

    let darenId = darenCache.get(nickname);
    if (!darenId) {
      const org = getVal('organization');
      const cat = getVal('category');
      const ctype = getVal('content_type');
      const platform = getVal('platform');
      const isMain = getVal('is_main_platform');
      const platNick = getVal('platform_nickname');
      const homepage = getVal('homepage_url');
      const account = getVal('account');
      const followers = getNum('followers');

      const info = prepare('INSERT INTO darens (nickname, organization, content_type, category, platform, is_main_platform, platform_nickname, homepage_url, account, followers) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(nickname, org, ctype, cat, platform, isMain, platNick, homepage, account, followers);
      darenId = info.lastInsertRowid;
      darenCache.set(nickname, darenId);

      const ur = prepare('INSERT OR IGNORE INTO users (display_name, password_hash, role) VALUES (?, ?, ?)').run(nickname, defaultHash, 'user');
      if (ur.changes > 0) newUsers++;
    }

    const platform = getVal('v_platform') || getVal('platform');
    const publishTime = (() => {
      const cell = getCell('publish_time');
      const v = cell && cell.value;
      if (!v) return '';
      if (v instanceof Date) return v.toISOString().slice(0, 10);
      return cell.text.trim().slice(0, 10);
    })();

    // Detect red-filled cells → anomaly_data
    const anomalies = {};
    for (const field of anomalyFields) {
      try {
        const cell = getCell(field);
        if (cell && isRedFill(cell)) anomalies[field] = '数据异常';
      } catch {}
    }

    const info = prepare('INSERT OR IGNORE INTO videos (work_id, daren_id, platform, title, tags, content_url, duration, publish_time, da_plays, da_likes, da_7d_plays, da_7d_likes, comments, saves, shares, violation_status, violation_desc, compliance_status, compliance_desc, is_node, node_name, is_hot, appeal, screenshot_plays, screenshot_likes, screenshot_7d_plays, screenshot_7d_likes, anomaly_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      workId, darenId, platform,
      getVal('title'), getVal('tags'), getVal('content_url'), getNum('duration'), publishTime,
      getNum('da_plays'), getNum('da_likes'), getNum('da_7d_plays'), getNum('da_7d_likes'),
      getNum('comments'), getNum('saves'), getNum('shares'),
      getVal('violation_status'), getVal('violation_desc'), getVal('compliance_status'), getVal('compliance_desc'),
      getVal('is_node'), getVal('node_name'), getVal('is_hot'), getVal('appeal'),
      getVal('screenshot_plays'), getVal('screenshot_likes'), getVal('screenshot_7d_plays'), getVal('screenshot_7d_likes'),
      JSON.stringify(anomalies)
    );
    if (info.changes > 0) imported++; else { skipped++; skippedConflict++; }
  }));

  console.log('--- [DEBUG] import result ---');
  console.log('  data rows in file:', totalRows);
  console.log('  imported:', imported);
  console.log('  skipped (no name):', skippedNoName);
  console.log('  skipped (no workId):', skippedNoWorkId);
  console.log('  skipped (conflict/duplicate):', skippedConflict);

  res.json({ ok: true, imported, skipped, newUsers });
});

module.exports = router;
