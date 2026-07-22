function AuditPage({
  onBack
}) {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedLog, setSelectedLog] = useState(null);
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const res = await api.get('/api/audit-logs?limit=' + pageSize + '&offset=' + (page - 1) * pageSize);
    setLogs(res.rows || []);
    setTotal(res.total || 0);
    setLoading(false);
  }, [page, pageSize]);
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);
  const getChanges = log => {
    try {
      const value = JSON.parse(log.changes_json || '[]');
      return Array.isArray(value) ? value : [];
    } catch (_) {
      return [];
    }
  };
  const changeSummary = log => {
    const changes = getChanges(log);
    if (!changes.length) return log.result || '操作成功';
    return changes.map(change => `${change.field}：${change.old || '未填写'} → ${change.new || '未填写'}`).join('；');
  };
  const columns = [{
    title: '时间', dataIndex: 'created_at', width: 170
  }, {
    title: '操作人', dataIndex: 'operator_name', width: 120
  }, {
    title: '达人', dataIndex: 'subject_nickname', width: 140, ellipsis: true, render: textTooltip
  }, {
    title: '操作类型', dataIndex: 'action_type', width: 120
  }, {
    title: '操作对象', width: 220, ellipsis: true, render: (_, log) => textTooltip(`${log.subject_type}：${log.subject_name}`)
  }, {
    title: '变更详情', width: 360, ellipsis: true, render: (_, log) => textTooltip(changeSummary(log))
  }, {
    title: '批次', dataIndex: 'batch_name', width: 190, ellipsis: true, render: textTooltip
  }];
  const handlePageSizeChange = (_, nextPageSize) => {
    setPage(1);
    setPageSize(nextPageSize);
  };
  return <React.Fragment><div className="video-detail-header"><Button onClick={onBack}>← 返回</Button><h3>操作日志</h3></div><Table className="audit-table" columns={columns} dataSource={logs} rowKey="id" loading={loading} scroll={{
      x: 1140
    }} pagination={{
      total,
      pageSize,
      current: page,
      showSizeChanger: true,
      pageSizeOptions: PAGE_SIZE_OPTIONS,
      onChange: setPage,
      onShowSizeChange: handlePageSizeChange
    }} onRow={log => ({
      onClick: () => setSelectedLog(log),
      className: 'audit-table-row'
    })} bordered size="small" /><div className="audit-mobile-list">{logs.map(log => <button type="button" key={log.id} className="audit-mobile-row" onClick={() => setSelectedLog(log)}><span className="audit-mobile-meta">{log.created_at} · {log.operator_name}</span><strong>{log.subject_nickname ? `达人：${log.subject_nickname} · ` : ''}{log.action_type} · {log.subject_type}：{log.subject_name}</strong><span>{changeSummary(log)}</span></button>)}{!loading && !logs.length && <div className="audit-mobile-empty">暂无操作记录</div>}</div>{total > pageSize && <Pagination className="audit-mobile-pagination" size="small" total={total} pageSize={pageSize} current={page} showSizeChanger pageSizeOptions={PAGE_SIZE_OPTIONS} onChange={(nextPage, nextPageSize) => {
      setPage(nextPage);
      if (nextPageSize !== pageSize) setPageSize(nextPageSize);
    }} />}<Drawer title="操作详情" open={!!selectedLog} onClose={() => setSelectedLog(null)} width={480}>{selectedLog && <div className="audit-detail"><div><span>时间</span><strong>{selectedLog.created_at}</strong></div><div><span>操作人</span><strong>{selectedLog.operator_name}</strong></div><div><span>达人</span><strong>{selectedLog.subject_nickname || '-'}</strong></div><div><span>操作类型</span><strong>{selectedLog.action_type}</strong></div><div><span>操作对象</span><strong>{selectedLog.subject_type}：{selectedLog.subject_name}</strong></div>{selectedLog.batch_name && <div><span>所属批次</span><strong>{selectedLog.batch_name}</strong></div>}<section><span>变更详情</span>{getChanges(selectedLog).map((change, index) => <div className="audit-change" key={index}><strong>{change.field}</strong><p>{change.old || '未填写'}<b>→</b>{change.new || '未填写'}</p></div>)}</section></div>}</Drawer></React.Fragment>;
}

