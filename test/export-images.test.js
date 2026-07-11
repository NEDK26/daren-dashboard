const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ExcelJS = require('exceljs');

let addScreenshotImages;
try {
  ({ addScreenshotImages } = require('../services/exportImages'));
} catch {
  addScreenshotImages = null;
}

test('embeds local screenshots and clears their path cells in exported Excel', async () => {
  assert.ok(addScreenshotImages, 'expected image export service');
  const uploadsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daren-export-images-'));
  fs.writeFileSync(path.join(uploadsDir, 'shot.png'), Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL9xQAAAABJRU5ErkJggg==', 'base64'));

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('达人数据');
  sheet.addRow(['播放量截图', '点赞量截图']);
  sheet.addRow(['/uploads/shot.png', 'https://example.com/shot.png']);

  addScreenshotImages({
    workbook,
    sheet,
    rows: [{ screenshot_plays: '/uploads/shot.png', screenshot_likes: 'https://example.com/shot.png' }],
    uploadsDir,
    screenshotColumns: { screenshot_plays: 1, screenshot_likes: 2 }
  });

  assert.equal(sheet.getCell(2, 1).value, '');
  assert.equal(sheet.getCell(2, 2).value, '');
  assert.equal(sheet.getImages().length, 1);
  assert.ok(sheet.getRow(2).height >= 45);

  const reopened = new ExcelJS.Workbook();
  await reopened.xlsx.load(await workbook.xlsx.writeBuffer());
  assert.equal(reopened.getWorksheet('达人数据').getImages().length, 1);
});
