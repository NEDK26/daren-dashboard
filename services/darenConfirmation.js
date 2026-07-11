function resetDarenConfirmation({ prepare, auditLog, req, darenId }) {
  const daren = prepare('SELECT confirmation_status FROM darens WHERE id = ?').get(darenId);
  if (!daren || daren.confirmation_status === '待确认') return false;

  prepare("UPDATE darens SET confirmation_status = '待确认' WHERE id = ?").run(darenId);
  auditLog(req, 'darens', darenId, {
    confirmation_status: { old: daren.confirmation_status, new: '待确认' }
  });
  return true;
}

module.exports = { resetDarenConfirmation };
