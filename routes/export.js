const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const { prepare } = require('../db');
const { requireAdmin } = require('../middleware');

// Map export column key -> Excel column index (1-based)
const exportKeyCol = {
  'title': 13, 'tags': 14, 'content_url': 15, 'duration': 16, 'publish_time': 17,
  'da_plays': 18, 'da_likes': 19, 'da_7d_plays': 20, 'da_7d_likes': 21,
  'comments': 22, 'saves': 23, 'shares': 24,
  'violation_status': 25, 'violation_desc': 26, 'compliance_status': 27, 'compliance_desc': 28,
  'is_node': 29, 'node_name': 30, 'is_hot': 31, 'appeal': 32
};

router.get('/export', requireAdmin, async (req, res) => {
  const { category, search } = req.query;

  let sql = 'SELECT d.nickname, d.organization, d.content_type, d.category, d.platform, d.is_main_platform, d.platform_nickname, d.homepage_url, d.account, d.followers, v.work_id, v.platform as v_platform, v.title, v.tags, v.content_url, v.duration, v.publish_time, v.da_plays, v.da_likes, v.da_7d_plays, v.da_7d_likes, v.comments, v.saves, v.shares, v.violation_status, v.violation_desc, v.compliance_status, v.compliance_desc, v.is_node, v.node_name, v.is_hot, v.appeal, v.screenshot_plays, v.screenshot_likes, v.screenshot_7d_plays, v.screenshot_7d_likes, v.anomaly_data FROM videos v JOIN darens d ON v.daren_id = d.id';
  const conditions = [], params = [];
  if (category) { conditions.push('d.category = ?'); params.push(category); }
  if (search) { conditions.push('d.nickname LIKE ?'); params.push('%' + search + '%'); }
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY d.nickname, v.platform, v.publish_time DESC';

  const rows = prepare(sql).all(...params);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('达人数据');

  ws.columns = [
    { header: '全网昵称', key: 'nickname' },
    { header: '机构名称', key: 'organization' },
    { header: '内容类型', key: 'content_type' },
    { header: '达人分类', key: 'category' },
    { header: '平台', key: 'platform' },
    { header: '是否主平台', key: 'is_main_platform' },
    { header: '平台昵称', key: 'platform_nickname' },
    { header: '主页链接', key: 'homepage_url' },
    { header: '账号', key: 'account' },
    { header: '粉丝数', key: 'followers' },
    { header: '作品ID', key: 'work_id' },
    { header: '视频平台', key: 'v_platform' },
    { header: '视频标题', key: 'title' },
    { header: '作品描述标签', key: 'tags' },
    { header: '内容链接', key: 'content_url' },
    { header: '时长', key: 'duration' },
    { header: '发布时间', key: 'publish_time' },
    { header: 'DA播放量', key: 'da_plays' },
    { header: 'DA点赞量', key: 'da_likes' },
    { header: 'DA7日播放', key: 'da_7d_plays' },
    { header: 'DA7日点赞', key: 'da_7d_likes' },
    { header: '评论量', key: 'comments' },
    { header: '收藏量', key: 'saves' },
    { header: '转发量', key: 'shares' },
    { header: '违规状态', key: 'violation_status' },
    { header: '违规描述', key: 'violation_desc' },
    { header: '合规状态', key: 'compliance_status' },
    { header: '合规异常描述', key: 'compliance_desc' },
    { header: '是否是节点', key: 'is_node' },
    { header: '参与节点名称', key: 'node_name' },
    { header: '是否是爆款', key: 'is_hot' },
    { header: '申诉', key: 'appeal' },
    { header: '播放量截图', key: 'screenshot_plays' },
    { header: '点赞量截图', key: 'screenshot_likes' },
    { header: '7日播放量截图', key: 'screenshot_7d_plays' },
    { header: '7日点赞量截图', key: 'screenshot_7d_likes' },
  ];

  ws.addRows(rows);

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
  await wb.xlsx.write(res);
  res.end();
});

module.exports = router;
