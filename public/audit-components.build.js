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
    title: '时间',
    dataIndex: 'created_at',
    width: 170
  }, {
    title: '操作人',
    dataIndex: 'operator_name',
    width: 120
  }, {
    title: '达人',
    dataIndex: 'subject_nickname',
    width: 140,
    ellipsis: true,
    render: textTooltip
  }, {
    title: '操作类型',
    dataIndex: 'action_type',
    width: 120
  }, {
    title: '操作对象',
    width: 220,
    ellipsis: true,
    render: (_, log) => textTooltip(`${log.subject_type}：${log.subject_name}`)
  }, {
    title: '变更详情',
    width: 360,
    ellipsis: true,
    render: (_, log) => textTooltip(changeSummary(log))
  }, {
    title: '批次',
    dataIndex: 'batch_name',
    width: 190,
    ellipsis: true,
    render: textTooltip
  }];
  const handlePageSizeChange = (_, nextPageSize) => {
    setPage(1);
    setPageSize(nextPageSize);
  };
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "video-detail-header"
  }, /*#__PURE__*/React.createElement(Button, {
    onClick: onBack
  }, "← 返回"), /*#__PURE__*/React.createElement("h3", null, "操作日志")), /*#__PURE__*/React.createElement(Table, {
    className: "audit-table",
    columns: columns,
    dataSource: logs,
    rowKey: "id",
    loading: loading,
    scroll: {
      x: 1140
    },
    pagination: {
      total,
      pageSize,
      current: page,
      showSizeChanger: true,
      pageSizeOptions: PAGE_SIZE_OPTIONS,
      onChange: setPage,
      onShowSizeChange: handlePageSizeChange
    },
    onRow: log => ({
      onClick: () => setSelectedLog(log),
      className: 'audit-table-row'
    }),
    bordered: true,
    size: "small"
  }), /*#__PURE__*/React.createElement("div", {
    className: "audit-mobile-list"
  }, logs.map(log => /*#__PURE__*/React.createElement("button", {
    type: "button",
    key: log.id,
    className: "audit-mobile-row",
    onClick: () => setSelectedLog(log)
  }, /*#__PURE__*/React.createElement("span", {
    className: "audit-mobile-meta"
  }, log.created_at, " · ", log.operator_name), /*#__PURE__*/React.createElement("strong", null, log.subject_nickname ? `达人：${log.subject_nickname} · ` : '', log.action_type, " · ", log.subject_type, "：", log.subject_name), /*#__PURE__*/React.createElement("span", null, changeSummary(log)))), !loading && !logs.length && /*#__PURE__*/React.createElement("div", {
    className: "audit-mobile-empty"
  }, "暂无操作记录")), total > pageSize && /*#__PURE__*/React.createElement(Pagination, {
    className: "audit-mobile-pagination",
    size: "small",
    total: total,
    pageSize: pageSize,
    current: page,
    showSizeChanger: true,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    onChange: (nextPage, nextPageSize) => {
      setPage(nextPage);
      if (nextPageSize !== pageSize) setPageSize(nextPageSize);
    }
  }), /*#__PURE__*/React.createElement(Drawer, {
    title: "操作详情",
    open: !!selectedLog,
    onClose: () => setSelectedLog(null),
    width: 480
  }, selectedLog && /*#__PURE__*/React.createElement("div", {
    className: "audit-detail"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, "时间"), /*#__PURE__*/React.createElement("strong", null, selectedLog.created_at)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, "操作人"), /*#__PURE__*/React.createElement("strong", null, selectedLog.operator_name)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, "达人"), /*#__PURE__*/React.createElement("strong", null, selectedLog.subject_nickname || '-')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, "操作类型"), /*#__PURE__*/React.createElement("strong", null, selectedLog.action_type)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, "操作对象"), /*#__PURE__*/React.createElement("strong", null, selectedLog.subject_type, "：", selectedLog.subject_name)), selectedLog.batch_name && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, "所属批次"), /*#__PURE__*/React.createElement("strong", null, selectedLog.batch_name)), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("span", null, "变更详情"), getChanges(selectedLog).map((change, index) => /*#__PURE__*/React.createElement("div", {
    className: "audit-change",
    key: index
  }, /*#__PURE__*/React.createElement("strong", null, change.field), /*#__PURE__*/React.createElement("p", null, change.old || '未填写', /*#__PURE__*/React.createElement("b", null, "→"), change.new || '未填写')))))));
}
