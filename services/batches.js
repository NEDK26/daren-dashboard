const { prepare } = require('../db');

function buildBatchName(year, month, title) {
  const normalizedTitle = String(title || '').trim();
  const normalizedYear = Number(year);
  const normalizedMonth = Number(month);
  if (!Number.isInteger(normalizedYear) || normalizedYear < 2000) throw new Error('年份不合法');
  if (!Number.isInteger(normalizedMonth) || normalizedMonth < 1 || normalizedMonth > 12) throw new Error('月份不合法');
  if (!normalizedTitle) throw new Error('请输入自定义标题');
  return `${normalizedYear}年${String(normalizedMonth).padStart(2, '0')}月｜ ${normalizedTitle}`;
}

function isMutableBatch(batch) {
  return batch && batch.status === 'draft';
}

function getCurrentBatch() {
  return prepare("SELECT * FROM batches WHERE status = 'current'").get();
}

function getVisibleBatch(req, requestedId) {
  const batchId = Number(requestedId);
  const batch = Number.isInteger(batchId) && batchId > 0
    ? prepare('SELECT * FROM batches WHERE id = ?').get(batchId)
    : getCurrentBatch();
  if (!batch) return { error: '没有可用批次', status: 404 };
  if (batch.status === 'draft') return { error: '草稿批次不可查看', status: 403 };
  if (req.session.user.role === 'admin' || batch.status === 'current') return { batch };
  const ownDaren = prepare('SELECT 1 FROM darens WHERE batch_id = ? AND nickname = ?').get(batch.id, req.session.user.display_name);
  return ownDaren ? { batch } : { error: '无权查看该批次', status: 403 };
}

function getEditableBatchForDaren(darenId) {
  return prepare(`
    SELECT b.* FROM darens d
    JOIN batches b ON b.id = d.batch_id
    WHERE d.id = ?
  `).get(darenId);
}

module.exports = { buildBatchName, isMutableBatch, getCurrentBatch, getVisibleBatch, getEditableBatchForDaren };
