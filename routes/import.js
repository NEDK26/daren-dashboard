const express = require('express');
const router = express.Router();
const multer = require('multer');
const ExcelJS = require('exceljs');
const { getDb, prepare } = require('../db');
const { requireAdmin } = require('../middleware');
const { hashPassword } = require('../auth');

const upload = multer({ storage: multer.memoryStorage() });

// Excel col -> DB column name for video anomaly detection
const anomalyColMap = {
  22: 'title', 23: 'tags', 24: 'content_url', 26: 'duration', 27: 'publish_time',
  28: 'da_plays', 30: 'da_likes', 32: 'da_7d_plays', 34: 'da_7d_likes',
  36: 'comments', 37: 'saves', 38: 'shares',
  39: 'violation_status', 40: 'violation_desc', 41: 'compliance_status', 42: 'compliance_desc',
  43: 'is_node', 44: 'node_name', 45: 'is_hot', 46: 'appeal'
};

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

  // Debug: dump first 3 data rows to verify column mapping
  let debugCount = 0;
  let totalRows = 0;

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    totalRows++;

    // Debug: print all non-empty columns of first 3 rows (before any validation)
    if (debugCount < 3) {
      const cells = [];
      for (let c = 1; c <= 50; c++) {
        try {
          const cell = row.getCell(c);
          if (cell.value !== null && cell.value !== undefined && cell.value !== '') {
            cells.push(`col${c}:${JSON.stringify(String(cell.value).trim().slice(0, 40))}`);
          }
        } catch {}
      }
      console.log(`--- [DEBUG] row ${rowNumber} cols with data ---`);
      console.log(' ', cells.join(' | '));
      debugCount++;
    }

    const getVal = (col) => {
      const cell = row.getCell(col);
      return cell.value ? String(cell.value).trim() : '';
    };
    const getNum = (col) => Number(row.getCell(col).value) || 0;

    const nickname = getVal(12) || getVal(1);
    if (!nickname) { skippedNoName++; skipped++; return; }

    const workId = getVal(25);
    if (!workId) { skippedNoWorkId++; skipped++; return; }

    let darenId = darenCache.get(nickname);
    if (!darenId) {
      const org = getVal(13);
      const cat = getVal(14);
      const ctype = getVal(15);
      const platform = getVal(17) || getVal(6);
      const isMain = getVal(18) || getVal(7);
      const platNick = getVal(19) || getVal(8);
      const homepage = getVal(9);
      const account = getVal(21) || getVal(10);
      const followers = getNum(20) || getNum(11);

      const info = prepare('INSERT INTO darens (nickname, organization, content_type, category, platform, is_main_platform, platform_nickname, homepage_url, account, followers) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(nickname, org, ctype, cat, platform, isMain, platNick, homepage, account, followers);
      darenId = info.lastInsertRowid;
      darenCache.set(nickname, darenId);

      const ur = prepare('INSERT OR IGNORE INTO users (display_name, password_hash, role) VALUES (?, ?, ?)').run(nickname, defaultHash, 'user');
      if (ur.changes > 0) newUsers++;
    }

    const platform = getVal(17) || getVal(6);
    const publishTime = (() => {
      const v = row.getCell(27).value;
      if (!v) return '';
      if (v instanceof Date) return v.toISOString().slice(0, 10);
      return String(v).slice(0, 10);
    })();

    // Detect red-filled cells → anomaly_data
    const anomalies = {};
    for (const [colNum, colName] of Object.entries(anomalyColMap)) {
      try {
        const cell = row.getCell(Number(colNum));
        if (isRedFill(cell)) {
          anomalies[colName] = '数据异常';
        }
      } catch {}
    }

    const info = prepare('INSERT OR IGNORE INTO videos (work_id, daren_id, platform, title, tags, content_url, duration, publish_time, da_plays, da_likes, da_7d_plays, da_7d_likes, comments, saves, shares, violation_status, violation_desc, compliance_status, compliance_desc, is_node, node_name, is_hot, appeal, anomaly_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      workId, darenId, platform,
      getVal(22), getVal(23), getVal(24), getNum(26), publishTime,
      getNum(28), getNum(30), getNum(32), getNum(34),
      getNum(36), getNum(37), getNum(38),
      getVal(39), getVal(40), getVal(41), getVal(42),
      getVal(43), getVal(44), getVal(45), getVal(46),
      JSON.stringify(anomalies)
    );
    if (info.changes > 0) imported++; else { skipped++; skippedConflict++; }
  });

  console.log('--- [DEBUG] import result ---');
  console.log('  data rows in file:', totalRows);
  console.log('  imported:', imported);
  console.log('  skipped (no name):', skippedNoName);
  console.log('  skipped (no workId):', skippedNoWorkId);
  console.log('  skipped (conflict/duplicate):', skippedConflict);

  res.json({ ok: true, imported, skipped, newUsers });
});

module.exports = router;
