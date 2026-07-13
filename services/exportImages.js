const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const JSZip = require('jszip');

const supportedExtensions = new Set(['png', 'jpeg', 'gif']);
const contentTypes = { png: 'image/png', jpeg: 'image/jpeg', gif: 'image/gif' };

function resolveUpload(filePath, uploadsDir) {
  if (typeof filePath !== 'string' || !filePath.startsWith('/uploads/')) return null;
  const filename = filePath.slice('/uploads/'.length);
  if (!filename || filename !== path.basename(filename)) return null;

  const fullPath = path.resolve(uploadsDir, filename);
  return fs.existsSync(fullPath) ? fullPath : null;
}

function addScreenshotImages({ sheet, rows, uploadsDir, screenshotColumns }) {
  const images = [];
  for (let index = 0; index < rows.length; index++) {
    const excelRow = sheet.getRow(index + 2);
    for (const [field, column] of Object.entries(screenshotColumns)) {
      excelRow.getCell(column).value = '';
      const filePath = resolveUpload(rows[index][field], uploadsDir);
      if (!filePath) continue;

      const extension = path.extname(filePath).slice(1).toLowerCase().replace('jpg', 'jpeg');
      if (!supportedExtensions.has(extension)) continue;

      const buffer = fs.readFileSync(filePath);
      const cell = excelRow.getCell(column);
      const id = 'ID_' + crypto.createHash('sha256')
        .update(`${cell.address}:${field}:`)
        .update(buffer)
        .digest('hex').slice(0, 32).toUpperCase();
      cell.value = {
        formula: `_xlfn.DISPIMG("${id}",1)`,
        result: `=DISPIMG("${id}",1)`
      };
      images.push({ id, buffer, extension });
      excelRow.height = Math.max(excelRow.height || 15, 45);
      sheet.getColumn(column).width = Math.max(sheet.getColumn(column).width || 9, 12);
    }
  }
  return images;
}

function appendXml(xml, closingTag, fragment) {
  return xml.replace(closingTag, fragment + closingTag);
}

async function renderCellImages(workbookBuffer, images) {
  if (!images.length) return Buffer.from(workbookBuffer);

  const zip = await JSZip.loadAsync(Buffer.from(workbookBuffer));
  let workbookRels = await zip.file('xl/_rels/workbook.xml.rels').async('string');
  const relIds = [...workbookRels.matchAll(/Id="rId(\d+)"/g)].map(match => Number(match[1]));
  const relationshipId = `rId${Math.max(0, ...relIds) + 1}`;
  workbookRels = appendXml(
    workbookRels,
    '</Relationships>',
    `<Relationship Id="${relationshipId}" Type="http://www.wps.cn/officeDocument/2020/cellImage" Target="cellimages.xml"/>`
  );
  zip.file('xl/_rels/workbook.xml.rels', workbookRels);

  let typesXml = await zip.file('[Content_Types].xml').async('string');
  const extensions = new Set(images.map(image => image.extension));
  for (const extension of extensions) {
    if (!new RegExp(`Extension="${extension}"`, 'i').test(typesXml)) {
      typesXml = appendXml(typesXml, '</Types>', `<Default Extension="${extension}" ContentType="${contentTypes[extension]}"/>`);
    }
  }
  typesXml = appendXml(
    typesXml,
    '</Types>',
    '<Override PartName="/xl/cellimages.xml" ContentType="application/vnd.wps-officedocument.cellimage+xml"/>'
  );
  zip.file('[Content_Types].xml', typesXml);

  const pictures = [];
  const relationships = [];
  images.forEach((image, index) => {
    const relId = `rId${index + 1}`;
    const filename = `wps-cell-image-${index + 1}.${image.extension}`;
    zip.file(`xl/media/${filename}`, image.buffer);
    relationships.push(`<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${filename}"/>`);
    pictures.push(`<etc:cellImage><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${index + 2}" name="${image.id}" descr="unnamed"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="${relId}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="914400" cy="914400"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic></etc:cellImage>`);
  });

  zip.file(
    'xl/cellimages.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><etc:cellImages xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:etc="http://www.wps.cn/officeDocument/2017/etCustomData">${pictures.join('')}</etc:cellImages>`
  );
  zip.file(
    'xl/_rels/cellimages.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationships.join('')}</Relationships>`
  );

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

module.exports = { addScreenshotImages, renderCellImages };
