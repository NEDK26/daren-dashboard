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

test('embeds local screenshots with WPS DISPIMG cell images', async () => {
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

  assert.match(sheet.getCell(2, 1).formula, /^_xlfn\.DISPIMG\("ID_[A-F0-9]{32}",1\)$/);
  assert.equal(sheet.getCell(2, 2).value, '');
  assert.equal(sheet.getImages().length, 0);
  assert.ok(sheet.getRow(2).height >= 45);

  const output = await renderCellImages(await workbook.xlsx.writeBuffer(), images);
  const zip = await JSZip.loadAsync(output);
  assert.ok(zip.file('xl/cellimages.xml'));
  assert.ok(zip.file('xl/_rels/cellimages.xml.rels'));
  assert.ok(Object.keys(zip.files).some(name => name.startsWith('xl/media/')));
  assert.equal(Object.keys(zip.files).some(name => name.startsWith('xl/drawings/')), false);
  assert.equal(Object.keys(zip.files).some(name => name.startsWith('xl/richData/')), false);

  const worksheetXml = await zip.file('xl/worksheets/sheet1.xml').async('string');
  const imageId = worksheetXml.match(/_xlfn\.DISPIMG\(&quot;(ID_[A-F0-9]{32})&quot;,1\)/)?.[1];
  assert.ok(imageId);

  const cellImagesXml = await zip.file('xl/cellimages.xml').async('string');
  assert.match(cellImagesXml, new RegExp(`name="${imageId}"`));
  const workbookRels = await zip.file('xl/_rels/workbook.xml.rels').async('string');
  assert.match(workbookRels, /Type="http:\/\/www\.wps\.cn\/officeDocument\/2020\/cellImage"/);
  const contentTypes = await zip.file('[Content_Types].xml').async('string');
  assert.match(contentTypes, /application\/vnd\.wps-officedocument\.cellimage\+xml/);
});
