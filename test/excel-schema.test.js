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
