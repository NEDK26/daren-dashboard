const fs = require('fs');
const path = require('path');

const supportedExtensions = new Set(['png', 'jpeg', 'gif']);

function resolveUpload(filePath, uploadsDir) {
  if (typeof filePath !== 'string' || !filePath.startsWith('/uploads/')) return null;
  const filename = filePath.slice('/uploads/'.length);
  if (!filename || filename !== path.basename(filename)) return null;

  const fullPath = path.resolve(uploadsDir, filename);
  return fs.existsSync(fullPath) ? fullPath : null;
}

function addScreenshotImages({ workbook, sheet, rows, uploadsDir, screenshotColumns }) {
  for (let index = 0; index < rows.length; index++) {
    const excelRow = sheet.getRow(index + 2);
    for (const [field, column] of Object.entries(screenshotColumns)) {
      excelRow.getCell(column).value = '';
      const filePath = resolveUpload(rows[index][field], uploadsDir);
      if (!filePath) continue;

      const extension = path.extname(filePath).slice(1).toLowerCase().replace('jpg', 'jpeg');
      if (!supportedExtensions.has(extension)) continue;

      const imageId = workbook.addImage({ buffer: fs.readFileSync(filePath), extension });
      sheet.addImage(imageId, { tl: { col: column - 1, row: index + 1 }, ext: { width: 60, height: 60 } });
      excelRow.height = Math.max(excelRow.height || 15, 45);
      sheet.getColumn(column).width = Math.max(sheet.getColumn(column).width || 9, 12);
    }
  }
}

module.exports = { addScreenshotImages };
