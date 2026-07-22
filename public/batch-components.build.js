function BatchPicker({
  batches,
  value,
  onChange
}) {
  const selectable = batches.filter(batch => batch.status !== 'draft');
  if (!selectable.length) return /*#__PURE__*/React.createElement("span", {
    className: "batch-picker-empty"
  }, "暂无批次");
  return /*#__PURE__*/React.createElement(Select, {
    className: "batch-picker",
    value: value?.id,
    options: selectable.map(batch => ({
      value: batch.id,
      label: batch.name
    })),
    onChange: id => onChange(selectable.find(batch => batch.id === id))
  });
}
function BatchSwitchPage({
  batches,
  selectedBatch,
  onSelectBatch,
  onBack
}) {
  const selectable = batches.filter(batch => batch.status !== 'draft');
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "video-detail-header"
  }, /*#__PURE__*/React.createElement(Button, {
    onClick: onBack
  }, "← 返回"), /*#__PURE__*/React.createElement("h3", null, "切换批次")), /*#__PURE__*/React.createElement("div", {
    className: "batch-switch-list"
  }, selectable.map(batch => /*#__PURE__*/React.createElement(Card, {
    key: batch.id,
    className: 'batch-switch-card ' + (selectedBatch?.id === batch.id ? 'active' : ''),
    hoverable: true,
    onClick: () => onSelectBatch(batch)
  }, /*#__PURE__*/React.createElement("strong", null, batch.name), /*#__PURE__*/React.createElement("span", null, batch.status === 'current' ? '当前批次' : '历史批次'))), !selectable.length && /*#__PURE__*/React.createElement(Card, null, "暂无可用批次")));
}
