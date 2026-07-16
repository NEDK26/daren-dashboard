const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const path = require('path');
const { prepare } = require('../db');
const { requireAdmin } = require('../middleware');
const { exportColumns } = require('../excel-schema');
const { addScreenshotImages, renderCellImages } = require('../services/exportImages');
const { getVisibleBatch } = require('../services/batches');

const exportKeyCol = Object.fromEntries(exportColumns.map(({ key }, index) => [key, index + 1]));

router.get('/export', requireAdmin, async (req, res) => {
  const { category, contentType, search, batchId } = req.query;
  const resolved = getVisibleBatch(req, batchId);
  if (resolved.error) return res.status(resolved.status).json({ error: resolved.error });
  const batch = resolved.batch;

  let sql = `SELECT d.nickname, d.organization, d.content_type, d.category, d.platform, v.is_main_platform, d.platform_nickname, d.homepage_url, d.account, d.followers, v.work_id, v.platform as v_platform, v.title, v.tags, v.content_url, v.duration, v.publish_time, v.da_plays, v.da_likes, v.da_7d_plays, v.da_7d_likes, v.comments, v.saves, v.shares, v.violation_status, v.violation_desc, v.compliance_status, v.compliance_desc, v.is_node, v.node_name, v.is_hot, v.screenshot_plays, v.screenshot_likes, v.screenshot_7d_plays, v.screenshot_7d_likes, v.anomaly_data,
    (SELECT appeal_text FROM video_appeals WHERE video_id = v.id AND group_no = 1) AS appeal_text_1,
    (SELECT image_path FROM video_appeals WHERE video_id = v.id AND group_no = 1) AS appeal_image_1,
    (SELECT appeal_text FROM video_appeals WHERE video_id = v.id AND group_no = 2) AS appeal_text_2,
    (SELECT image_path FROM video_appeals WHERE video_id = v.id AND group_no = 2) AS appeal_image_2,
    (SELECT appeal_text FROM video_appeals WHERE video_id = v.id AND group_no = 3) AS appeal_text_3,
    (SELECT image_path FROM video_appeals WHERE video_id = v.id AND group_no = 3) AS appeal_image_3
    FROM videos v JOIN darens d ON v.daren_id = d.id`;
  const conditions = ['d.batch_id = ?'], params = [batch.id];
  if (category) { conditions.push('d.category = ?'); params.push(category); }
  if (contentType) { conditions.push('d.content_type = ?'); params.push(contentType); }
  if (search) { conditions.push('d.nickname LIKE ?'); params.push('%' + search + '%'); }
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  // videos.id is assigned in Excel row insertion order; keep export rows aligned with the source workbook.
  sql += ' ORDER BY v.id';

  const rows = prepare(sql).all(...params);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('达人数据');

  ws.columns = exportColumns;

  ws.addRows(rows);
  const screenshotImages = addScreenshotImages({
    sheet: ws,
    rows,
    uploadsDir: path.join(__dirname, '..', 'uploads'),
    screenshotColumns: Object.fromEntries(
      ['screenshot_plays', 'screenshot_likes', 'screenshot_7d_plays', 'screenshot_7d_likes',
        'appeal_image_1', 'appeal_image_2', 'appeal_image_3']
        .map(key => [key, exportKeyCol[key]])
    )
  });

  // Apply red fill to anomaly cells
  const redFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri];
    if (!row.anomaly_data || row.anomaly_data === '{}') continue;
    let anomalies = {};
    try { anomalies = JSON.parse(row.anomaly_data); } catch { continue; }
    const excelRow = ws.getRow(ri + 2); // +2: header row + 0-index
    for (const key of Object.keys(anomalies)) {
      const col = exportKeyCol[key];
      if (col) {
        excelRow.getCell(col).fill = redFill;
      }
    }
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=daren-data.xlsx');
  res.end(await renderCellImages(await wb.xlsx.writeBuffer(), screenshotImages));
});

module.exports = router;
