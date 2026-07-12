function resetDarenConfirmation({ prepare, auditLog, req, darenId, changes }) {
  const daren = prepare('SELECT confirmation_status FROM darens WHERE id = ?').get(darenId);
  if (!daren || daren.confirmation_status === '待确认') return false;

  prepare("UPDATE darens SET confirmation_status = '待确认' WHERE id = ?").run(darenId);
  const confirmationChange = { old: daren.confirmation_status, new: '待确认' };
  if (changes) changes.confirmation_status = confirmationChange;
  else if (auditLog) auditLog(req, 'darens', darenId, { confirmation_status: confirmationChange });
  return true;
}

module.exports = { resetDarenConfirmation };
