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
    render: (text, record) => <span className="daren-name-cell"><Tooltip title={text}><a className="data-link" onClick={() => onViewVideos(record)}>{text}</a></Tooltip></span>
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
    render: value => value > 0 ? <span className="anomaly-text">{value} 项异常</span> : <span className="normal-text">无异常</span>
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
    render: v => <span style={{
      fontVariantNumeric: 'tabular-nums'
    }}>{(v || 0).toLocaleString()}</span>
  }, {
    title: '操作',
    key: 'actions',
    width: 100,
    fixed: 'right',
    render: (_, record) => <Button type="link" className="table-action" onClick={() => onViewVideos(record)}>查看核对</Button>
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
  return <div className="admin-review-page"><div className="admin-review-layout"><section className="admin-review-main"><header className="admin-review-header"><div><h1>数据核对</h1></div></header><div className="admin-review-batch-picker"><BatchPicker batches={batches || []} value={batch} onChange={onSelectBatch} /><Button type="text" onClick={fetchData} loading={loading} icon={<span className="toolbar-action-icon refresh-icon" aria-hidden="true"><svg viewBox="0 0 20 20" focusable="false"><path d="M15.5 6.5A6 6 0 1 0 16 12" /><path d="M15.5 2.5v4h-4" /></svg></span>}>刷新数据</Button><Button type="text" onClick={onOpenBatches} icon={<span className="toolbar-action-icon batch-icon" aria-hidden="true"><svg viewBox="0 0 20 20" focusable="false"><path d="M3 5.5h5l1.5 2H17v9H3z" /></svg></span>}>批次管理</Button><Button type="text" onClick={onOpenSettings} icon={<span className="toolbar-action-icon settings-icon" aria-hidden="true"><svg viewBox="0 0 20 20" focusable="false"><path d="M4 5h2m3 0h7M4 10h7m3 0h2M4 15h4m3 0h5" /><circle cx="7.5" cy="5" r="1.5" /><circle cx="12.5" cy="10" r="1.5" /><circle cx="9.5" cy="15" r="1.5" /></svg></span>}>核对设置</Button><div className="spacer" /><Button loading={exporting} disabled={!batch || isReadOnly} onClick={handleExport}><span className="export-icon" aria-hidden="true"><svg viewBox="0 0 20 20" focusable="false"><path d="M10 2v10m0 0 4-4m-4 4L6 8M3 13v4h14v-4" /></svg></span>导出当前批次</Button></div><div className="confirmation-summary-card status-rail" aria-label="达人确认状态统计"><div className="confirmation-summary-item pending"><div className="confirmation-summary-label">待确认</div><strong>{statusCounts.pending}</strong></div><div className="confirmation-summary-item confirmed"><div className="confirmation-summary-label">已确认</div><strong>{statusCounts.confirmed}</strong></div><div className="confirmation-summary-item appealed"><div className="confirmation-summary-label">已申诉</div><strong>{statusCounts.appealed}</strong></div></div><div className="admin-review-data-card"><div className="toolbar admin-review-filters"><Select placeholder="状态" value={confirmationStatus || undefined} onChange={v => {
              setPage(1);
              setConfirmationStatus(v || '');
            }} allowClear options={[{
              value: '待确认',
              label: '待确认'
            }, {
              value: '已确认',
              label: '已确认'
            }, {
              value: '已提交申诉',
              label: '已提交申诉'
            }]} /><Select placeholder="异常" value={hasAnomaly || undefined} onChange={v => {
              setPage(1);
              setHasAnomaly(v || '');
            }} allowClear options={[{
              value: 'yes',
              label: '存在异常'
            }, {
              value: 'no',
              label: '无异常'
            }]} /><Input.Search placeholder="搜索达人昵称" value={searchInput} onChange={e => setSearchInput(e.target.value)} onSearch={() => {
              setPage(1);
              setSearch(searchInput);
            }} allowClear /><Select placeholder="内容类型" value={contentType || undefined} onChange={v => {
              setPage(1);
              setContentType(v || '');
            }} allowClear options={contentTypeOptions} /><Select placeholder="达人分类" value={category || undefined} onChange={v => {
              setPage(1);
              setCategory(v || '');
            }} allowClear options={categoryOptions} /><Button onClick={resetFilters}>重置</Button></div><Table className="admin-review-table" columns={columns} dataSource={data} rowKey="id" loading={loading} locale={TABLE_LOCALE} scroll={{
            x: 920
          }} pagination={false} size="middle" /><div className="admin-review-table-footer"><div className="admin-review-total"><strong>共 {total.toLocaleString()} 位达人</strong>{isReadOnly && <Tag>历史批次只读</Tag>}</div><Pagination total={total} current={page} pageSize={pageSize} pageSizeOptions={PAGE_SIZE_OPTIONS} showSizeChanger showLessItems responsive onChange={setPage} onShowSizeChange={handlePageSizeChange} /></div></div></section><aside className="admin-review-rail" aria-label="批次与操作摘要"><section className="review-rail-card"><div className="review-rail-heading"><h2>当前批次概览</h2></div><strong className="current-batch-name">{batch?.name || '暂无批次'}</strong><div className="batch-overview-total"><span>达人总数</span><strong>{batchTotal.toLocaleString()}</strong></div><dl className="batch-overview-statuses"><div><dt>待确认</dt><dd>{statusCounts.pending}</dd></div><div><dt>已确认</dt><dd>{statusCounts.confirmed}</dd></div><div><dt>已申诉</dt><dd>{statusCounts.appealed}</dd></div></dl></section><section className="review-rail-card"><div className="review-rail-heading"><h2>最近操作</h2><button type="button" onClick={onOpenAudit}>查看全部操作</button></div><div className="recent-operation-list">{recentLogs.map(log => <div key={log.id}><strong>{log.action_type}</strong><span>{log.subject_nickname || log.subject_name || '系统'} · {log.created_at}</span></div>)}{!recentLogs.length && <p className="rail-empty">当前批次暂无操作记录</p>}</div></section></aside></div></div>;
}

