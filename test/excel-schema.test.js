const test = require('node:test');
const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');

let schema;
try {
  schema = require('../excel-schema');
} catch {
  schema = null;
}

test('Excel schema is shared and can map reordered headers', () => {
  assert.ok(schema, 'expected a shared excel-schema module');

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('test');
  sheet.addRow(['作品ID', '视频标题', '全网昵称']);

  const columns = schema.buildHeaderMap(sheet.getRow(1));
  assert.equal(columns.work_id, 1);
  assert.equal(columns.title, 2);
  assert.equal(columns.nickname, 3);
});

test('Excel schema rejects missing required headers', () => {
  assert.ok(schema, 'expected a shared excel-schema module');

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('test');
  sheet.addRow(['视频标题']);

  assert.throws(
    () => schema.buildHeaderMap(sheet.getRow(1)),
    /缺少必填列.*全网昵称.*作品ID/
  );
});

test('export columns come from the same import schema', () => {
  assert.ok(schema, 'expected a shared excel-schema module');

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('export');
  sheet.columns = schema.exportColumns;

  const columns = schema.buildHeaderMap(sheet.getRow(1));
  for (const field of schema.excelFields) {
    assert.ok(columns[field.key], `export is missing import field ${field.header}`);
  }
});

test('legacy report headers use aliases and the rightmost duplicate fields', () => {
  assert.ok(schema, 'expected a shared excel-schema module');

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('legacy');
  sheet.addRow([
    '全网昵称', '机构名称', '内容类型', '达人分类', '总播放量', '平台', '是否主平台', '平台昵称', '主页链接', '账号', '粉丝数',
    '全网昵称', '机构名称', '达人分类', '内容类型', '总播放量', '平台', '是否主平台', '平台昵称', '粉丝数', '账号',
    '视频标题', '作品描述标签', '内容链接', '作品id', '时长', '发布时间', 'DA播放量', '播放量截图', 'DA点赞量', '点赞量截图',
    'DA7日播放', '7日播放量截图', 'DA7日点赞', '7日点赞量截图', '评论量', '收藏量', '转发量',
    '违规状态(未违规/违规)', '违规描述', '合规状态(不合规/合规)', '合规异常描述', '是否是节点', '参与节点名称', '是否是爆款', '申诉'
  ]);

  const columns = schema.buildHeaderMap(sheet.getRow(1));
  assert.equal(columns.nickname, 12);
  assert.equal(columns.organization, 13);
  assert.equal(columns.category, 14);
  assert.equal(columns.content_type, 15);
  assert.equal(columns.platform, 17);
  assert.equal(columns.followers, 20);
  assert.equal(columns.account, 21);
  assert.equal(columns.work_id, 25);
  assert.equal(columns.violation_status, 39);
  assert.equal(columns.compliance_status, 41);
});
