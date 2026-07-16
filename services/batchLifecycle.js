function publishBatch({ prepare, withTransaction, batchId }) {
  let published;
  withTransaction(() => {
    const draft = prepare("SELECT * FROM batches WHERE id = ? AND status = 'draft'").get(batchId);
    if (!draft) throw new Error('只能发布草稿批次');
    const current = prepare("SELECT id FROM batches WHERE status = 'current' ORDER BY id DESC LIMIT 1").get();
    if (current) prepare("UPDATE batches SET status = 'history' WHERE id = ?").run(current.id);
    prepare("UPDATE batches SET status = 'current', previous_batch_id = ? WHERE id = ?").run(current?.id || null, draft.id);
    published = prepare('SELECT * FROM batches WHERE id = ?').get(draft.id);
  });
  return published;
}

function revokeBatch({ prepare, withTransaction, batchId }) {
  let revoked;
  withTransaction(() => {
    const current = prepare("SELECT * FROM batches WHERE id = ? AND status = 'current'").get(batchId);
    if (!current) throw new Error('只能撤销已发布批次');
    prepare("UPDATE batches SET status = 'draft', previous_batch_id = NULL WHERE id = ?").run(current.id);
    revoked = prepare('SELECT * FROM batches WHERE id = ?').get(current.id);
  });
  return revoked;
}

module.exports = { publishBatch, revokeBatch };
