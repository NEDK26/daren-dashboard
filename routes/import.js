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
  const batchId = Number(req.body.batchId);
  const batch = prepare("SELECT * FROM batches WHERE id = ? AND status = 'draft'").get(batchId);
  if (!batch) return res.status(400).json({ error: '请选择可导入的草稿批次' });

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const ws = workbook.worksheets[0];
    if (!ws) return res.status(400).json({ error: '空文件' });
    const columns = buildHeaderMap(ws.getRow(1));

    let imported = 0, skipped = 0, skippedNoName = 0, skippedNoWorkId = 0, newUsers = 0;
    let totalRows = 0;
    const defaultHash = hashPassword('123456');

    withTransaction(() => {
      const darenCache = new Map();
      for (const d of prepare('SELECT id, nickname FROM darens WHERE batch_id = ?').all(batchId)) {
        darenCache.set(d.nickname, d.id);
      }

      ws.eachRow((row, rowNumber) => {
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
          const info = prepare('INSERT INTO darens (batch_id, nickname, organization, content_type, category, platform, platform_nickname, homepage_url, account, followers) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
            batchId, nickname, getVal('organization'), getVal('content_type'), getVal('category'), getVal('platform'),
            getVal('platform_nickname'), getVal('homepage_url'), getVal('account'), getNum('followers')
          );
          darenId = info.lastInsertRowid;
          darenCache.set(nickname, darenId);

          const user = prepare('INSERT OR IGNORE INTO users (display_name, password_hash, role) VALUES (?, ?, ?)').run(nickname, defaultHash, 'user');
          if (user.changes > 0) newUsers++;
        }

        const platform = getVal('v_platform') || getVal('platform');
        const publishTime = (() => {
          const cell = getCell('publish_time');
          const value = cell && cell.value;
          if (!value) return '';
          if (value instanceof Date) return value.toISOString().slice(0, 10);
          return cell.text.trim().slice(0, 10);
        })();
        const anomalies = {};
        for (const field of anomalyFields) {
          try {
            const cell = getCell(field);
            if (cell && isRedFill(cell)) anomalies[field] = '数据异常';
          } catch {}
        }

        prepare(`INSERT INTO videos (batch_id, work_id, daren_id, platform, is_main_platform, title, tags, content_url, duration, publish_time, da_plays, da_likes, da_7d_plays, da_7d_likes, comments, saves, shares, violation_status, violation_desc, compliance_status, compliance_desc, is_node, node_name, is_hot, appeal, screenshot_plays, screenshot_likes, screenshot_7d_plays, screenshot_7d_likes, anomaly_data)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(batch_id, daren_id, platform, work_id) DO UPDATE SET
            is_main_platform = excluded.is_main_platform, title = excluded.title, tags = excluded.tags, content_url = excluded.content_url, duration = excluded.duration, publish_time = excluded.publish_time,
            da_plays = excluded.da_plays, da_likes = excluded.da_likes, da_7d_plays = excluded.da_7d_plays, da_7d_likes = excluded.da_7d_likes,
            comments = excluded.comments, saves = excluded.saves, shares = excluded.shares, violation_status = excluded.violation_status,
            violation_desc = excluded.violation_desc, compliance_status = excluded.compliance_status, compliance_desc = excluded.compliance_desc,
            is_node = excluded.is_node, node_name = excluded.node_name, is_hot = excluded.is_hot, appeal = excluded.appeal,
            screenshot_plays = excluded.screenshot_plays, screenshot_likes = excluded.screenshot_likes,
            screenshot_7d_plays = excluded.screenshot_7d_plays, screenshot_7d_likes = excluded.screenshot_7d_likes, anomaly_data = excluded.anomaly_data`).run(
          batchId, workId, darenId, platform, getVal('is_main_platform'),
          getVal('title'), getVal('tags'), getVal('content_url'), getNum('duration'), publishTime,
          getNum('da_plays'), getNum('da_likes'), getNum('da_7d_plays'), getNum('da_7d_likes'),
          getNum('comments'), getNum('saves'), getNum('shares'),
          getVal('violation_status'), getVal('violation_desc'), getVal('compliance_status'), getVal('compliance_desc'),
          getVal('is_node'), getVal('node_name'), getVal('is_hot'), getVal('appeal'),
          getVal('screenshot_plays'), getVal('screenshot_likes'), getVal('screenshot_7d_plays'), getVal('screenshot_7d_likes'), JSON.stringify(anomalies)
        );
        imported++;
      });

      prepare("UPDATE batches SET source_filename = ?, imported_at = datetime('now','localtime') WHERE id = ?").run(req.file.originalname, batchId);
    });

    res.json({ ok: true, imported, skipped, newUsers, totalRows });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

module.exports = router;
