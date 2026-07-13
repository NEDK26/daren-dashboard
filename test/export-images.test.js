const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ExcelJS = require('exceljs');
const JSZip = require('jszip');

let addScreenshotImages, renderCellImages;
try {
  ({ addScreenshotImages, renderCellImages } = require('../services/exportImages'));
} catch {
  addScreenshotImages = null;
  renderCellImages = null;
}

test('embeds local screenshots as cell values instead of floating drawings', async () => {
  assert.ok(addScreenshotImages, 'expected image export service');
  assert.ok(renderCellImages, 'expected cell image renderer');
  const uploadsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daren-export-images-'));
  fs.writeFileSync(path.join(uploadsDir, 'shot.png'), Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL9xQAAAABJRU5ErkJggg==', 'base64'));

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('达人数据');
  sheet.addRow(['播放量截图', '点赞量截图']);
  sheet.addRow(['/uploads/shot.png', 'https://example.com/shot.png']);

  const images = addScreenshotImages({
    workbook,
    sheet,
    rows: [{ screenshot_plays: '/uploads/shot.png', screenshot_likes: 'https://example.com/shot.png' }],
    uploadsDir,
    screenshotColumns: { screenshot_plays: 1, screenshot_likes: 2 }
  });

  assert.match(sheet.getCell(2, 1).value, /^\$\{imageincell:/);
  assert.equal(sheet.getCell(2, 2).value, '');
  assert.equal(sheet.getImages().length, 0);
  assert.ok(sheet.getRow(2).height >= 45);

  const output = renderCellImages(await workbook.xlsx.writeBuffer(), images);
  const zip = await JSZip.loadAsync(output);
  assert.ok(Object.keys(zip.files).some(name => name.startsWith('xl/richData/')));
  assert.ok(Object.keys(zip.files).some(name => name.startsWith('xl/media/')));
  assert.equal(Object.keys(zip.files).some(name => name.startsWith('xl/drawings/')), false);
  const worksheetXml = await zip.file('xl/worksheets/sheet1.xml').async('string');
  assert.match(worksheetXml, /<c r="A2"[^>]* vm="\d+"/);
});
