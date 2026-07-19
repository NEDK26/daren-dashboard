const ExcelJS = require('exceljs');

async function createAccountWorkbook(rows) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('达人账号');
  sheet.columns = [
    { header: '达人昵称', key: 'display_name', width: 24 },
    { header: '初始化密码', key: 'password', width: 18 }
  ];
  sheet.addRows(rows);
  return workbook.xlsx.writeBuffer();
}

function sendAccountWorkbook(res, filename, buffer) {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  res.end(buffer);
}

module.exports = { createAccountWorkbook, sendAccountWorkbook };
