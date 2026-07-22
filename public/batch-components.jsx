function BatchPicker({
  batches,
  value,
  onChange
}) {
  const selectable = batches.filter(batch => batch.status !== 'draft');
  if (!selectable.length) return <span className="batch-picker-empty">暂无批次</span>;
  return <Select className="batch-picker" value={value?.id} options={selectable.map(batch => ({
    value: batch.id,
    label: batch.name
  }))} onChange={id => onChange(selectable.find(batch => batch.id === id))} />;
}

function BatchSwitchPage({
  batches,
  selectedBatch,
  onSelectBatch,
  onBack
}) {
  const selectable = batches.filter(batch => batch.status !== 'draft');
  return <React.Fragment><div className="video-detail-header"><Button onClick={onBack}>← 返回</Button><h3>切换批次</h3></div><div className="batch-switch-list">{selectable.map(batch => <Card key={batch.id} className={'batch-switch-card ' + (selectedBatch?.id === batch.id ? 'active' : '')} hoverable onClick={() => onSelectBatch(batch)}><strong>{batch.name}</strong><span>{batch.status === 'current' ? '当前批次' : '历史批次'}</span></Card>)}{!selectable.length && <Card>暂无可用批次</Card>}</div></React.Fragment>;
}

