const fs = require('fs');
const path = require('path');
const XlsxTemplate = require('xlsx-template');

const supportedExtensions = new Set(['png', 'jpeg', 'gif']);

function resolveUpload(filePath, uploadsDir) {
  if (typeof filePath !== 'string' || !filePath.startsWith('/uploads/')) return null;
  const filename = filePath.slice('/uploads/'.length);
  if (!filename || filename !== path.basename(filename)) return null;

  const fullPath = path.resolve(uploadsDir, filename);
  return fs.existsSync(fullPath) ? fullPath : null;
}

function addScreenshotImages({ sheet, rows, uploadsDir, screenshotColumns }) {
  const images = {};
  for (let index = 0; index < rows.length; index++) {
    const excelRow = sheet.getRow(index + 2);
    for (const [field, column] of Object.entries(screenshotColumns)) {
      excelRow.getCell(column).value = '';
      const filePath = resolveUpload(rows[index][field], uploadsDir);
      if (!filePath) continue;

      const extension = path.extname(filePath).slice(1).toLowerCase().replace('jpg', 'jpeg');
      if (!supportedExtensions.has(extension)) continue;

      const key = `screenshot_${index}_${field}`;
      excelRow.getCell(column).value = '${imageincell:' + key + '}';
      images[key] = fs.readFileSync(filePath);
      excelRow.height = Math.max(excelRow.height || 15, 45);
      sheet.getColumn(column).width = Math.max(sheet.getColumn(column).width || 9, 12);
    }
  }
  return images;
}

function renderCellImages(workbookBuffer, images) {
  if (!Object.keys(images).length) return Buffer.from(workbookBuffer);
  const template = new XlsxTemplate(Buffer.from(workbookBuffer));
  template.substitute(1, images);
  return template.generate({ type: 'nodebuffer' });
}

module.exports = { addScreenshotImages, renderCellImages };
