function DarenList({
  user,
  batch,
  batches,
  onSelectBatch,
  onViewVideos,
  onOpenAudit,
  onOpenBatches,
  onOpenSettings
}) {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [contentType, setContentType] = useState('');
  const [contentTypeOptions, setContentTypeOptions] = useState([]);
  const [confirmationStatus, setConfirmationStatus] = useState('');
  const [hasAnomaly, setHasAnomaly] = useState('');
  const [recentLogs, setRecentLogs] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [statusCounts, setStatusCounts] = useState({
    pending: 0,
    confirmed: 0,
    appealed: 0
  });
  const requestRef = useRef(null);
  const isAdmin = user && user.role === 'admin';
  const isReadOnly = batch?.status === 'history';
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);
  useEffect(() => {
    setCategory('');
    setContentType('');
    setConfirmationStatus('');
    setHasAnomaly('');
    if (!isAdmin || !batch) {
      setCategoryOptions([]);
      setContentTypeOptions([]);
      return;
    }
    let cancelled = false;
    Promise.allSettled([api.get('/api/daren-categories?batchId=' + batch.id), api.get('/api/daren-content-types?batchId=' + batch.id)]).then(([categoryResult, contentTypeResult]) => {
      if (cancelled) return;
      const categories = categoryResult.status === 'fulfilled' ? categoryResult.value : {};
      const contentTypes = contentTypeResult.status === 'fulfilled' ? contentTypeResult.value : {};
      setCategoryOptions((categories.categories || []).map(value => ({
        value,
        label: value
      })));
      setContentTypeOptions((contentTypes.contentTypes || []).map(value => ({
        value,
        label: value
      })));
    }).catch(() => {
      if (cancelled) return;
      setCategoryOptions([]);
      setContentTypeOptions([]);
    });
    return () => {
      cancelled = true;
    };
  }, [isAdmin, batch?.id]);
  useEffect(() => {
    if (!isAdmin || !batch) return setRecentLogs([]);
    let cancelled = false;
    api.get('/api/audit-logs?limit=5&offset=0&batchId=' + batch.id).then(res => {
      if (!cancelled) setRecentLogs(res.rows || []);
    }).catch(() => {
      if (!cancelled) setRecentLogs([]);
    });
    return () => {
      cancelled = true;
    };
  }, [isAdmin, batch?.id]);
  const fetchData = useCallback(async () => {
    if (!batch) {
      setData([]);
      setTotal(0);
      setStatusCounts({
        pending: 0,
        confirmed: 0,
        appealed: 0
      });
      return;
    }
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('pageSize', pageSize);
      params.set('batchId', batch.id);
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      if (contentType) params.set('contentType', contentType);
      if (confirmationStatus) params.set('confirmationStatus', confirmationStatus);
      if (hasAnomaly) params.set('hasAnomaly', hasAnomaly);
      const res = await api.get('/api/darens?' + params.toString(), {
        signal: controller.signal
      });
      const payload = Array.isArray(res) ? {
        rows: res,
        total: res.length
      } : res;
      setData(payload.rows || []);
      setTotal(payload.total || 0);
      setStatusCounts(payload.statusCounts || {
        pending: 0,
        confirmed: 0,
        appealed: 0
      });
    } catch (e) {
      if (e.name !== 'AbortError') message.error('加载失败');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [search, category, contentType, confirmationStatus, hasAnomaly, page, pageSize, batch?.id]);
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  const handleExport = async () => {
    if (!batch || exporting) return;
    const params = new URLSearchParams();
    params.set('batchId', batch.id);
    setExporting(true);
    try {
      const response = await fetch('/api/export?' + params.toString());
      const contentTypeHeader = response.headers.get('content-type') || '';
      if (!response.ok || !contentTypeHeader.includes('spreadsheet')) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || '导出失败');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const filename = (batch.name || '达人数据').replace(/[\\/:*?"<>|]/g, '_') + '.xlsx';
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      message.success('导出完成');
    } catch (e) {
      message.error(e.message || '导出失败，请稍后重试');
    } finally {
      setExporting(false);
    }
  };
  const columns = [{
    title: '达人昵称',
    dataIndex: 'nickname',
    key: 'nickname',
    width: 180,
    fixed: 'left',
    render: (text, record) => /*#__PURE__*/React.createElement("span", {
      className: "daren-name-cell"
    }, /*#__PURE__*/React.createElement(Tooltip, {
      title: text
    }, /*#__PURE__*/React.createElement("a", {
      className: "data-link",
      onClick: () => onViewVideos(record)
    }, text)))
  }, {
    title: '达人分类',
    dataIndex: 'category',
    key: 'category',
    width: 120,
    render: value => value || '-'
  }, {
    title: '内容类型',
    dataIndex: 'content_type',
    key: 'content_type',
    width: 120,
    ellipsis: true
  }, {
    title: '异常情况',
    dataIndex: 'anomaly_count',
    key: 'anomaly_count',
    width: 100,
    render: value => value > 0 ? /*#__PURE__*/React.createElement("span", {
      className: "anomaly-text"
    }, value, " 项异常") : /*#__PURE__*/React.createElement("span", {
      className: "normal-text"
    }, "无异常")
  }, {
    title: '核对状态',
    dataIndex: 'confirmation_status',
    key: 'confirmation_status',
    width: 120,
    render: confirmationStatusTag
  }, {
    title: '粉丝数',
    dataIndex: 'followers',
    key: 'followers',
    width: 100,
    render: v => (v || 0).toLocaleString()
  }, {
    title: '总播放量',
    dataIndex: 'total_plays',
    key: 'total_plays',
    width: 120,
    render: v => /*#__PURE__*/React.createElement("span", {
      style: {
        fontVariantNumeric: 'tabular-nums'
      }
    }, (v || 0).toLocaleString())
  }, {
    title: '操作',
    key: 'actions',
    width: 100,
    fixed: 'right',
    render: (_, record) => /*#__PURE__*/React.createElement(Button, {
      type: "link",
      className: "table-action",
      onClick: () => onViewVideos(record)
    }, "查看核对")
  }];
  const handlePageSizeChange = (_, nextPageSize) => {
    setPage(1);
    setPageSize(nextPageSize);
  };
  const batchTotal = statusCounts.pending + statusCounts.confirmed + statusCounts.appealed;
  const resetFilters = () => {
    setSearchInput('');
    setSearch('');
    setCategory('');
    setContentType('');
    setConfirmationStatus('');
    setHasAnomaly('');
    setPage(1);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "admin-review-page"
  }, /*#__PURE__*/React.createElement("div", {
    className: "admin-review-layout"
  }, /*#__PURE__*/React.createElement("section", {
    className: "admin-review-main"
  }, /*#__PURE__*/React.createElement("header", {
    className: "admin-review-header"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, "数据核对"))), /*#__PURE__*/React.createElement("div", {
    className: "admin-review-batch-picker"
  }, /*#__PURE__*/React.createElement(BatchPicker, {
    batches: batches || [],
    value: batch,
    onChange: onSelectBatch
  }), /*#__PURE__*/React.createElement(Button, {
    type: "text",
    onClick: fetchData,
    loading: loading,
    icon: /*#__PURE__*/React.createElement("span", {
      className: "toolbar-action-icon refresh-icon",
      "aria-hidden": "true"
    }, /*#__PURE__*/React.createElement("svg", {
      viewBox: "0 0 20 20",
      focusable: "false"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M15.5 6.5A6 6 0 1 0 16 12"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M15.5 2.5v4h-4"
    })))
  }, "刷新数据"), /*#__PURE__*/React.createElement(Button, {
    type: "text",
    onClick: onOpenBatches,
    icon: /*#__PURE__*/React.createElement("span", {
      className: "toolbar-action-icon batch-icon",
      "aria-hidden": "true"
    }, /*#__PURE__*/React.createElement("svg", {
      viewBox: "0 0 20 20",
      focusable: "false"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M3 5.5h5l1.5 2H17v9H3z"
    })))
  }, "批次管理"), /*#__PURE__*/React.createElement(Button, {
    type: "text",
    onClick: onOpenSettings,
    icon: /*#__PURE__*/React.createElement("span", {
      className: "toolbar-action-icon settings-icon",
      "aria-hidden": "true"
    }, /*#__PURE__*/React.createElement("svg", {
      viewBox: "0 0 20 20",
      focusable: "false"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M4 5h2m3 0h7M4 10h7m3 0h2M4 15h4m3 0h5"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "7.5",
      cy: "5",
      r: "1.5"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "12.5",
      cy: "10",
      r: "1.5"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "9.5",
      cy: "15",
      r: "1.5"
    })))
  }, "核对设置"), /*#__PURE__*/React.createElement("div", {
    className: "spacer"
  }), /*#__PURE__*/React.createElement(Button, {
    loading: exporting,
    disabled: !batch || isReadOnly,
    onClick: handleExport
  }, /*#__PURE__*/React.createElement("span", {
    className: "export-icon",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 20 20",
    focusable: "false"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M10 2v10m0 0 4-4m-4 4L6 8M3 13v4h14v-4"
  }))), "导出当前批次")), /*#__PURE__*/React.createElement("div", {
    className: "confirmation-summary-card status-rail",
    "aria-label": "达人确认状态统计"
  }, /*#__PURE__*/React.createElement("div", {
    className: "confirmation-summary-item pending"
  }, /*#__PURE__*/React.createElement("div", {
    className: "confirmation-summary-label"
  }, "待确认"), /*#__PURE__*/React.createElement("strong", null, statusCounts.pending)), /*#__PURE__*/React.createElement("div", {
    className: "confirmation-summary-item confirmed"
  }, /*#__PURE__*/React.createElement("div", {
    className: "confirmation-summary-label"
  }, "已确认"), /*#__PURE__*/React.createElement("strong", null, statusCounts.confirmed)), /*#__PURE__*/React.createElement("div", {
    className: "confirmation-summary-item appealed"
  }, /*#__PURE__*/React.createElement("div", {
    className: "confirmation-summary-label"
  }, "已申诉"), /*#__PURE__*/React.createElement("strong", null, statusCounts.appealed))), /*#__PURE__*/React.createElement("div", {
    className: "admin-review-data-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "toolbar admin-review-filters"
  }, /*#__PURE__*/React.createElement(Select, {
    placeholder: "状态",
    value: confirmationStatus || undefined,
    onChange: v => {
      setPage(1);
      setConfirmationStatus(v || '');
    },
    allowClear: true,
    options: [{
      value: '待确认',
      label: '待确认'
    }, {
      value: '已确认',
      label: '已确认'
    }, {
      value: '已提交申诉',
      label: '已提交申诉'
    }]
  }), /*#__PURE__*/React.createElement(Select, {
    placeholder: "异常",
    value: hasAnomaly || undefined,
    onChange: v => {
      setPage(1);
      setHasAnomaly(v || '');
    },
    allowClear: true,
    options: [{
      value: 'yes',
      label: '存在异常'
    }, {
      value: 'no',
      label: '无异常'
    }]
  }), /*#__PURE__*/React.createElement(Input.Search, {
    placeholder: "搜索达人昵称",
    value: searchInput,
    onChange: e => setSearchInput(e.target.value),
    onSearch: () => {
      setPage(1);
      setSearch(searchInput);
    },
    allowClear: true
  }), /*#__PURE__*/React.createElement(Select, {
    placeholder: "内容类型",
    value: contentType || undefined,
    onChange: v => {
      setPage(1);
      setContentType(v || '');
    },
    allowClear: true,
    options: contentTypeOptions
  }), /*#__PURE__*/React.createElement(Select, {
    placeholder: "达人分类",
    value: category || undefined,
    onChange: v => {
      setPage(1);
      setCategory(v || '');
    },
    allowClear: true,
    options: categoryOptions
  }), /*#__PURE__*/React.createElement(Button, {
    onClick: resetFilters
  }, "重置")), /*#__PURE__*/React.createElement(Table, {
    className: "admin-review-table",
    columns: columns,
    dataSource: data,
    rowKey: "id",
    loading: loading,
    locale: TABLE_LOCALE,
    scroll: {
      x: 920
    },
    pagination: false,
    size: "middle"
  }), /*#__PURE__*/React.createElement("div", {
    className: "admin-review-table-footer"
  }, /*#__PURE__*/React.createElement("div", {
    className: "admin-review-total"
  }, /*#__PURE__*/React.createElement("strong", null, "共 ", total.toLocaleString(), " 位达人"), isReadOnly && /*#__PURE__*/React.createElement(Tag, null, "历史批次只读")), /*#__PURE__*/React.createElement(Pagination, {
    total: total,
    current: page,
    pageSize: pageSize,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    showSizeChanger: true,
    showLessItems: true,
    responsive: true,
    onChange: setPage,
    onShowSizeChange: handlePageSizeChange
  })))), /*#__PURE__*/React.createElement("aside", {
    className: "admin-review-rail",
    "aria-label": "批次与操作摘要"
  }, /*#__PURE__*/React.createElement("section", {
    className: "review-rail-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "review-rail-heading"
  }, /*#__PURE__*/React.createElement("h2", null, "当前批次概览")), /*#__PURE__*/React.createElement("strong", {
    className: "current-batch-name"
  }, batch?.name || '暂无批次'), /*#__PURE__*/React.createElement("div", {
    className: "batch-overview-total"
  }, /*#__PURE__*/React.createElement("span", null, "达人总数"), /*#__PURE__*/React.createElement("strong", null, batchTotal.toLocaleString())), /*#__PURE__*/React.createElement("dl", {
    className: "batch-overview-statuses"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, "待确认"), /*#__PURE__*/React.createElement("dd", null, statusCounts.pending)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, "已确认"), /*#__PURE__*/React.createElement("dd", null, statusCounts.confirmed)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("dt", null, "已申诉"), /*#__PURE__*/React.createElement("dd", null, statusCounts.appealed)))), /*#__PURE__*/React.createElement("section", {
    className: "review-rail-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "review-rail-heading"
  }, /*#__PURE__*/React.createElement("h2", null, "最近操作"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onOpenAudit
  }, "查看全部操作")), /*#__PURE__*/React.createElement("div", {
    className: "recent-operation-list"
  }, recentLogs.map(log => /*#__PURE__*/React.createElement("div", {
    key: log.id
  }, /*#__PURE__*/React.createElement("strong", null, log.action_type), /*#__PURE__*/React.createElement("span", null, log.subject_nickname || log.subject_name || '系统', " · ", log.created_at))), !recentLogs.length && /*#__PURE__*/React.createElement("p", {
    className: "rail-empty"
  }, "当前批次暂无操作记录"))))));
}
