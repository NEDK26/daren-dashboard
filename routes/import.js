const express = require('express');
const router = express.Router();
const multer = require('multer');
const ExcelJS = require('exceljs');
const { getDb, prepare } = require('../db');
const { requireAdmin } = require('../middleware');
const { hashPassword } = require('../auth');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/import', requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '请上传文件' });

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(req.file.buffer);
  const ws = workbook.worksheets[0];
  if (!ws) return res.status(400).json({ error: '空文件' });

  let imported = 0, skipped = 0, newUsers = 0;
  const darenCache = new Map();

  for (const d of prepare('SELECT id, nickname FROM darens').all()) {
    darenCache.set(d.nickname, d.id);
  }

  const defaultHash = hashPassword('123456');

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const getVal = (col) => {
      const cell = row.getCell(col);
      return cell.value ? String(cell.value).trim() : '';
    };
    const getNum = (col) => Number(row.getCell(col).value) || 0;

    const nickname = getVal(12) || getVal(1);
    if (!nickname) { skipped++; return; }

    const workId = getVal(25);
    if (!workId) { skipped++; return; }

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

    const info = prepare('INSERT OR IGNORE INTO videos (work_id, daren_id, platform, title, tags, content_url, duration, publish_time, da_plays, da_likes, da_7d_plays, da_7d_likes, comments, saves, shares, violation_status, violation_desc, compliance_status, compliance_desc, is_node, node_name, is_hot, appeal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      workId, darenId, platform,
      getVal(22), getVal(23), getVal(24), getNum(26), publishTime,
      getNum(28), getNum(30), getNum(32), getNum(34),
      getNum(36), getNum(37), getNum(38),
      getVal(39), getVal(40), getVal(41), getVal(42),
      getVal(43), getVal(44), getVal(45), getVal(46)
    );
    if (info.changes > 0) imported++; else skipped++;
  });

  res.json({ ok: true, imported, skipped, newUsers });
});

module.exports = router;
