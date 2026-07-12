const { useState, useEffect, useCallback, useMemo, useRef } = React;
const { Layout, Button, Input, InputNumber, Form, Card, message, Space, Tag, Table, Select, Upload, Tooltip, Image, Checkbox, Modal } = antd;

// ── API helpers ──

const api = {
  get: (url, options = {}) => fetch(url, options).then(r => r.json()),
  post: (url, data) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  put: (url, data) => fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  delete: (url, data) => fetch(url, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  upload: (url, file, fields = {}) => { const fd = new FormData(); fd.append('file', file); Object.entries(fields).forEach(([key, value]) => fd.append(key, value)); return fetch(url, { method: 'POST', body: fd }).then(r => r.json()); }
};

const confirmationStatusTag = (status) => {
  const value = status || '待确认';
  const color = value === '已确认' ? 'green' : value === '已提交申诉' ? 'orange' : 'default';
  return <Tag color={color}>{value}</Tag>;
};

function BatchPicker({ batches, value, onChange }) {
  const selectable = batches.filter(batch => batch.status !== 'draft');
  if (!selectable.length) return <span className="batch-picker-empty">暂无批次</span>;
  return <Select
    className="batch-picker"
    value={value?.id}
    options={selectable.map(batch => ({ value: batch.id, label: batch.name }))}
    onChange={id => onChange(selectable.find(batch => batch.id === id))}
  />;
}

// ── LoginPage ──

function LoginPage({ onLogin }) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async (values) => {
    setLoading(true);
    try {
      const res = await api.post('/api/login', values);
      if (res.ok) {
        message.success('登录成功');
        onLogin(res.user);
      } else {
        message.error(res.error || '登录失败');
      }
    } catch (e) {
      message.error('网络错误');
    } finally {
      setLoading(false);
    }
  }, [onLogin]);

  return (
    <div className="login-page">
      <Card title="达人数据管理平台" className="login-card">
        <Form onFinish={handleSubmit} layout="vertical">
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input placeholder="用户名" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

function HomePage({ onDataCheck }) {
  return (
    <div className="workbench-page">
      <div className="workbench-heading">
        <div>
          <div className="workbench-eyebrow">本期工作台</div>
          <h3>请选择要核对的内容</h3>
        </div>
      </div>
      <div className="workbench-cards">
        <Card className="workbench-card workbench-card-primary" hoverable onClick={onDataCheck}>
          <div className="workbench-card-icon">数</div>
          <div className="workbench-card-title">本期数据核对</div>
          <div className="workbench-card-desc">查看和核对本期达人视频数据</div>
          <div className="workbench-card-action">进入核对 →</div>
        </Card>
        <Card className="workbench-card workbench-card-disabled" hoverable onClick={() => message.info('功能正在开发中')}>
          <div className="workbench-card-icon">费</div>
          <div className="workbench-card-title">本期费用核对</div>
          <div className="workbench-card-desc">费用数据核对功能</div>
          <div className="workbench-card-action">功能正在开发中</div>
        </Card>
      </div>
    </div>
  );
}

function BatchManagerPage({ batches, onRefresh, onSelectBatch, onBack }) {
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importStage, setImportStage] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const draft = batches.find(batch => batch.status === 'draft');
  const importStages = ['正在上传文件…', '正在解析 Excel…', '正在批量写入数据…', '正在切换当前批次…'];

  useEffect(() => {
    if (!importing) { setImportStage(0); return undefined; }
    const timer = setInterval(() => setImportStage(stage => (stage + 1) % importStages.length), 1800);
    return () => clearInterval(timer);
  }, [importing]);

  const createBatch = async (values) => {
    setCreating(true);
    try {
      const res = await api.post('/api/batches', values);
      if (!res.ok) return message.error(res.error || '创建批次失败');
      message.success('草稿批次已创建');
      await onRefresh();
    } catch (e) {
      message.error('创建批次失败');
    } finally {
      setCreating(false);
    }
  };

  const importDraft = async (file) => {
    if (!draft) return false;
    setImporting(true);
    try {
      const res = await api.upload('/api/import', file, { batchId: draft.id });
      if (!res.ok) return message.error(res.error || '导入失败');
      message.success(`导入完成：${res.imported} 条数据，新建用户 ${res.newUsers} 人，请发布批次后让用户查看`);
      await onRefresh();
    } catch (e) {
      message.error('导入失败，请稍后重试');
    } finally {
      setImporting(false);
    }
    return false;
  };

  const publishDraft = async () => {
    if (!draft || !draft.imported_at) return;
    try {
      const res = await api.post('/api/batches/' + draft.id + '/publish', {});
      if (!res.ok) return message.error(res.error || '发布失败');
      message.success('批次已发布');
      const latest = await onRefresh();
      if (latest?.current) onSelectBatch(latest.current);
    } catch (e) {
      message.error('发布失败');
    }
  };

  const revokePublished = async (batch) => {
    Modal.confirm({
      title: '撤销当前批次发布？',
      content: '撤销后用户将恢复查看上一个已发布批次。',
      okText: '撤销发布', cancelText: '取消',
      onOk: async () => {
        const res = await api.post('/api/batches/' + batch.id + '/revoke', {});
        if (!res.ok) return message.error(res.error || '撤销失败');
        message.success('已撤销发布');
        const latest = await onRefresh();
        if (latest?.current) onSelectBatch(latest.current);
      }
    });
  };

  const deleteDraft = () => {
    if (!draft) return;
    Modal.confirm({
      title: '删除草稿批次？',
      content: '草稿批次及其未完成导入将被删除。',
      okText: '删除', okButtonProps: { danger: true }, cancelText: '取消',
      onOk: async () => {
        setDeleting(true);
        try {
          const res = await api.delete('/api/batches/' + draft.id);
          if (res.ok) { message.success('草稿批次已删除'); await onRefresh(); }
          else message.error(res.error || '删除失败');
        } catch (e) {
          message.error('删除失败');
        } finally {
          setDeleting(false);
        }
      }
    });
  };

  return (
    <>
      <div className="video-detail-header">
        <Button onClick={onBack}>← 返回</Button>
        <h3>批次管理</h3>
      </div>
      <Card title="创建批次" className="batch-manager-card">
        <Form layout="inline" onFinish={createBatch} initialValues={{ year: new Date().getFullYear(), month: new Date().getMonth() + 1 }}>
          <Form.Item name="year" rules={[{ required: true, message: '请选择年份' }]}><InputNumber min={2000} max={2100} placeholder="年份" /></Form.Item>
          <Form.Item name="month" rules={[{ required: true, message: '请选择月份' }]}><InputNumber min={1} max={12} placeholder="月份" /></Form.Item>
          <Form.Item name="title" rules={[{ required: true, whitespace: true, message: '请输入自定义标题' }]}><Input placeholder="自定义标题" /></Form.Item>
          <Form.Item><Button type="primary" htmlType="submit" loading={creating} disabled={Boolean(draft)}>创建批次</Button></Form.Item>
        </Form>
      </Card>
      {draft && (
        <Card title="草稿批次" className="batch-manager-card" extra={<Tag color="blue">{draft.name}</Tag>}>
          <Space wrap>
            <Upload beforeUpload={importDraft} showUploadList={false} accept=".xlsx">
              <Button type="primary" loading={importing}>导入 Excel</Button>
            </Upload>
            <Button type="primary" disabled={!draft.imported_at || importing} onClick={publishDraft}>发布批次</Button>
            <Button danger loading={deleting} onClick={deleteDraft}>删除草稿</Button>
          </Space>
        </Card>
      )}
      <Table
        className="batch-manager-table"
        rowKey="id"
        dataSource={batches.filter(batch => batch.status !== 'draft')}
        pagination={false}
        columns={[
          { title: '批次名称', dataIndex: 'name' },
          { title: '状态', dataIndex: 'status', width: 100, render: status => <Tag color={status === 'current' ? 'green' : 'default'}>{status === 'current' ? '已发布' : '历史'}</Tag> },
          { title: '导入时间', dataIndex: 'imported_at', width: 180, render: value => value || '-' },
          { title: '操作', key: 'actions', width: 120, render: (_, record) => record.status === 'current'
            ? <Button size="small" onClick={() => revokePublished(record)}>撤销发布</Button>
            : null }
        ]}
      />
      <Modal open={importing} footer={null} closable={false} maskClosable={false} keyboard={false} centered>
        <div className="import-progress-content">
          <div className="import-progress-spinner" aria-hidden="true" />
          <div className="import-progress-copy">
            <div className="import-progress-title">正在导入 Excel</div>
            <div className="import-progress-stage">{importStages[importStage]}</div>
            <div className="import-progress-dots" aria-hidden="true"><span /><span /><span /></div>
          </div>
        </div>
      </Modal>
    </>
  );
}

// ── DarenList ──

function DarenList({ user, batch, onViewVideos, onSettings, onAudit, onBatchManagement, onHome }) {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [statusCounts, setStatusCounts] = useState({ pending: 0, confirmed: 0, appealed: 0 });
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

  const fetchData = useCallback(async () => {
    if (!batch) {
      setData([]);
      setTotal(0);
      setStatusCounts({ pending: 0, confirmed: 0, appealed: 0 });
      return;
    }
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('pageSize', 20);
      params.set('batchId', batch.id);
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      const res = await api.get('/api/darens?' + params.toString(), { signal: controller.signal });
      const payload = Array.isArray(res) ? { rows: res, total: res.length } : res;
      setData(payload.rows || []);
      setTotal(payload.total || 0);
      setStatusCounts(payload.statusCounts || { pending: 0, confirmed: 0, appealed: 0 });
      setSelectedRowKeys([]);
    } catch (e) {
      if (e.name !== 'AbortError') message.error('加载失败');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [search, category, page, batch?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = () => {
    const params = new URLSearchParams();
    if (batch) params.set('batchId', batch.id);
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    window.open('/api/export?' + params.toString());
  };

  const handleDelete = (records) => {
    if (!records.length) return;
    const names = records.slice(0, 5).map(r => r.nickname).join('、');
    const more = records.length > 5 ? ` 等 ${records.length} 个达人` : '';
    Modal.confirm({
      title: `确认删除 ${records.length} 个达人？`,
      content: `将删除 ${names}${more} 在当前批次内的视频和本地截图；仅当用户没有其他批次数据时才删除其账号。`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        setDeleting(true);
        try {
          const res = await api.delete('/api/darens', { ids: records.map(r => r.id), batchId: batch?.id });
          if (res.ok) {
            message.success(`已删除 ${res.deletedDarens} 个达人`);
            fetchData();
          } else {
            message.error(res.error || '删除失败');
          }
        } catch (e) {
          message.error('删除失败');
        } finally {
          setDeleting(false);
        }
      }
    });
  };

  const columns = [
    { title: '全网昵称', dataIndex: 'nickname', key: 'nickname', width: 140,
      render: (text, record) => <span><a style={{ fontWeight: 600, cursor: 'pointer', color: '#8b5e3c' }} onClick={() => onViewVideos(record)}>{text}</a>{record.anomaly_count > 0 && <Tag color="red" style={{ marginLeft: 6, fontSize: 11 }}>{record.anomaly_count}</Tag>}</span> },
    { title: '机构名称', dataIndex: 'organization', key: 'organization', width: 120 },
    { title: '内容类型', dataIndex: 'content_type', key: 'content_type', width: 100 },
    { title: '达人分类', dataIndex: 'category', key: 'category', width: 130 },
    { title: '平台昵称', dataIndex: 'platform_nickname', key: 'platform_nickname', width: 120 },
    { title: '主页链接', dataIndex: 'homepage_url', key: 'homepage_url', width: 100, ellipsis: true,
      render: (v) => v ? <a href={v} target="_blank" rel="noreferrer">查看</a> : '-' },
    { title: '账号', dataIndex: 'account', key: 'account', width: 110 },
    { title: '粉丝数', dataIndex: 'followers', key: 'followers', width: 100,
      render: (v) => (v || 0).toLocaleString() },
    { title: '总播放量', dataIndex: 'total_plays', key: 'total_plays', width: 120,
      render: (v) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{(v || 0).toLocaleString()}</span> },
  ];

  if (isAdmin) {
    columns.push({
      title: '状态', dataIndex: 'confirmation_status', key: 'confirmation_status', width: 105,
      render: confirmationStatusTag
    });
  }

  const categoryOptions = [
    { value: '美食', label: '美食' }, { value: '美妆', label: '美妆' },
    { value: '搞笑', label: '搞笑' }, { value: '游戏', label: '游戏' },
    { value: '音乐', label: '音乐' }, { value: '舞蹈', label: '舞蹈' },
    { value: '知识', label: '知识' }, { value: '时尚', label: '时尚' },
    { value: '旅游', label: '旅游' }, { value: '体育', label: '体育' },
    { value: '科技', label: '科技' }, { value: '生活', label: '生活' },
  ];

  const selectedKeySet = new Set(selectedRowKeys.map(String));
  const selectedRows = data.filter(row => selectedKeySet.has(String(row.id)));

  return (
    <div>
      {isAdmin && (
        <div className="confirmation-summary-card" aria-label="达人确认状态统计">
          <div className="confirmation-summary-item pending">
            <span>待确认</span>
            <strong>{statusCounts.pending}</strong>
          </div>
          <div className="confirmation-summary-item confirmed">
            <span>已确认</span>
            <strong>{statusCounts.confirmed}</strong>
          </div>
          <div className="confirmation-summary-item appealed">
            <span>已申诉</span>
            <strong>{statusCounts.appealed}</strong>
          </div>
        </div>
      )}
      <div className="toolbar">
        <Button onClick={onHome}>功能首页</Button>
        <Input.Search placeholder="搜索昵称" value={searchInput} onChange={e => setSearchInput(e.target.value)} onSearch={() => { setPage(1); setSearch(searchInput); }} style={{ width: 200 }} allowClear />
        <Select placeholder="达人分类" value={category || undefined} onChange={v => { setPage(1); setCategory(v || ''); }} style={{ width: 150, marginLeft: 12 }} allowClear options={categoryOptions} />
        <div className="spacer" />
        {isAdmin && (
          <>
            <Button onClick={handleExport} style={{ marginLeft: 8 }}>导出</Button>
            <Button danger loading={deleting} disabled={isReadOnly || !selectedRowKeys.length} onClick={() => handleDelete(selectedRows)} style={{ marginLeft: 8 }}>删除选中</Button>
            <Button onClick={onBatchManagement} style={{ marginLeft: 8 }}>批次管理</Button>
            <Button onClick={onSettings} style={{ marginLeft: 8 }}>设置</Button>
            <Button onClick={onAudit} style={{ marginLeft: 8 }}>审核</Button>
          </>
        )}
      </div>
      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{ total, current: page, pageSize: 20, onChange: setPage }}
        rowSelection={isAdmin && !isReadOnly ? { selectedRowKeys, onChange: setSelectedRowKeys } : undefined}
        bordered
        size="middle"
        style={{ marginTop: 16 }}
      />
    </div>
  );
}

function VideoDetail({ daren, user, batch, onBack, onHome }) {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [platformFilter, setPlatformFilter] = useState(undefined);
  const [violation, setViolation] = useState(undefined);
  const [compliance, setCompliance] = useState(undefined);
  const [titleInput, setTitleInput] = useState('');
  const [titleSearch, setTitleSearch] = useState('');
  const [editingKey, setEditingKey] = useState('');
  const [editableCols, setEditableCols] = useState([]);
  const [anomalySummary, setAnomalySummary] = useState({ anomalyCount: 0, submittedAnomalyCount: 0 });
  const [form] = Form.useForm();
  const [confirmationStatus, setConfirmationStatus] = useState(daren.confirmation_status || '待确认');
  const requestRef = useRef(null);
  const isAdmin = user.role === 'admin';
  const isReadOnly = batch?.status === 'history';

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setTitleSearch(titleInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [titleInput]);

  const fetchData = useCallback(async () => {
    if (!batch) {
      setData([]);
      setTotal(0);
      setAnomalySummary({ anomalyCount: 0, submittedAnomalyCount: 0 });
      return;
    }
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('pageSize', 20);
      params.set('batchId', batch.id);
      if (platformFilter) params.set('platform', platformFilter);
      if (violation) params.set('violation', violation);
      if (compliance) params.set('compliance', compliance);
      if (titleSearch) params.set('title', titleSearch);
      const res = await api.get('/api/darens/' + daren.id + '/videos?' + params.toString(), { signal: controller.signal });
      const payload = Array.isArray(res) ? { rows: res, total: res.length } : res;
      setData(payload.rows || []);
      setTotal(payload.total || 0);
      setAnomalySummary(payload.anomalySummary || { anomalyCount: 0, submittedAnomalyCount: 0 });
    } catch (e) {
      if (e.name !== 'AbortError') message.error('加载失败');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [platformFilter, violation, compliance, titleSearch, page, daren.id, batch?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    api.get('/api/settings/editable-columns').then(res => {
      if (res.columns) setEditableCols(res.columns);
    }).catch(() => {});
  }, []);

  const submitConfirmation = async (status) => {
    try {
      const res = await api.put('/api/darens/' + daren.id + '/confirmation', { status });
      if (res.ok) {
        setConfirmationStatus(res.status);
        await fetchData();
        message.success(status === '已确认' ? '已确认数据无误' : '修改已提交');
      } else {
        message.error(res.error || '提交失败');
      }
    } catch (e) {
      message.error('提交失败');
    }
  };

  const confirmModification = () => {
    if (isAdmin) return;
    setConfirmationStatus('待确认');
    Modal.confirm({
      content: '是否确认提交修改',
      okText: '确认提交',
      cancelText: '暂不提交',
      onOk: () => submitConfirmation('已提交申诉')
    });
  };

  const handleUploadSuccess = async () => {
    message.success('已上传');
    await fetchData();
    confirmModification();
  };

  const save = async (videoId) => {
    try {
      const row = await form.validateFields();
      const original = data.find(d => d.id === videoId);
      const changes = {};
      Object.keys(row).forEach(key => {
        if (row[key] !== undefined && row[key] !== original[key]) {
          changes[key] = row[key];
        }
      });
      if (Object.keys(changes).length === 0) {
        setEditingKey('');
        return;
      }
      const res = await api.put('/api/videos/' + videoId, changes);
      if (res.ok) {
        message.success('保存成功');
        setEditingKey('');
        await fetchData();
        if (!isAdmin && res.changes && res.changes.length > 0) confirmModification();
      } else {
        message.error(res.error || '保存失败');
      }
    } catch (e) {
      message.error('保存失败');
    }
  };

  const renderScreenshot = (record, key, label) => {
    const canUpload = !isReadOnly && (isAdmin || (editingKey === record.id && editableCols.includes(key)));
    const content = record[key] ? (
      <Image src={record[key]} width={60} height={60} style={{objectFit:'cover'}} />
    ) : (
      <div style={{width:60, height:60, border:'1px dashed var(--border-em)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:11, color:'var(--ink-muted)', borderRadius:4}}>
        {label}
      </div>
    );
    return (
      <Tooltip title={label}>
        {canUpload ? (
          <Upload
            beforeUpload={file => { api.upload('/api/upload/'+record.id+'/'+key, file).then(r => r.ok ? handleUploadSuccess() : message.error(r.error)); return false; }}
            showUploadList={false}
          >
            {content}
          </Upload>
        ) : (
          record[key] ? content : '-'
        )}
      </Tooltip>
    );
  };

  const EditableCell = ({ title, dataIndex, children, editable, record, ...rest }) => {
    if (!editable || editingKey !== record.id) return <td {...rest}>{children}</td>;
    const inputNode = dataIndex === 'publish_time'
      ? <Input size="small" placeholder="YYYY-MM-DD" />
      : <Input size="small" />;
    return <td {...rest}><Form.Item name={dataIndex} style={{margin:0}}>{inputNode}</Form.Item></td>;
  };

  const platformTag = (p) => {
    if (p === '抖音') return <Tag color="red">抖音</Tag>;
    if (p === '快手') return <Tag color="orange">快手</Tag>;
    if (p === 'B站') return <Tag color="blue">B站</Tag>;
    return p || '-';
  };

  const columns = [
    { title: '平台', dataIndex: 'platform', width: 65, render: platformTag },
    { title: '视频标题', dataIndex: 'title', width: 200, ellipsis: true, editable: true },
    { title: '作品标签', dataIndex: 'tags', width: 120, ellipsis: true, editable: true },
    { title: '内容链接', dataIndex: 'content_url', width: 70,
      render: (v) => v ? <a href={v} target="_blank" rel="noreferrer" style={{color:'#5a6e8a'}}>查看</a> : '-' },
    { title: '时长', dataIndex: 'duration', width: 65, editable: true },
    { title: '发布时间', dataIndex: 'publish_time', width: 105, editable: true },
    { title: 'DA播放', dataIndex: 'da_plays', width: 85,
      render: v => (v||0).toLocaleString(), editable: true },
    { title: '播放截图', key: 'screenshot_plays', width: 80,
      render: (_, record) => renderScreenshot(record, 'screenshot_plays', '播放') },
    { title: 'DA点赞', dataIndex: 'da_likes', width: 75,
      render: v => (v||0).toLocaleString(), editable: true },
    { title: '点赞截图', key: 'screenshot_likes', width: 80,
      render: (_, record) => renderScreenshot(record, 'screenshot_likes', '点赞') },
    { title: '7日播放', dataIndex: 'da_7d_plays', width: 85,
      render: v => (v||0).toLocaleString(), editable: true },
    { title: '7日播放截图', key: 'screenshot_7d_plays', width: 95,
      render: (_, record) => renderScreenshot(record, 'screenshot_7d_plays', '7日播放') },
    { title: '7日点赞', dataIndex: 'da_7d_likes', width: 75,
      render: v => (v||0).toLocaleString(), editable: true },
    { title: '7日点赞截图', key: 'screenshot_7d_likes', width: 95,
      render: (_, record) => renderScreenshot(record, 'screenshot_7d_likes', '7日点赞') },
    { title: '评论', dataIndex: 'comments', width: 65, editable: true },
    { title: '收藏', dataIndex: 'saves', width: 65, editable: true },
    { title: '转发', dataIndex: 'shares', width: 65, editable: true },
    { title: '违规', dataIndex: 'violation_status', width: 65,
      render: v => v==='违规' ? <Tag color="red">违规</Tag> : <Tag color="green">未违规</Tag> },
    { title: '违规描述', dataIndex: 'violation_desc', width: 130, ellipsis: true, editable: true },
    { title: '合规', dataIndex: 'compliance_status', width: 65,
      render: v => v==='合规' ? <Tag color="green">合规</Tag> : <Tag color="orange">不合规</Tag> },
    { title: '合规描述', dataIndex: 'compliance_desc', width: 130, ellipsis: true, editable: true },
    { title: '节点', dataIndex: 'is_node', width: 60, editable: true },
    { title: '节点名称', dataIndex: 'node_name', width: 110, ellipsis: true, editable: true },
    { title: '爆款', dataIndex: 'is_hot', width: 60, editable: true },
    { title: '申诉', dataIndex: 'appeal', width: 100, editable: true, ellipsis: true },
    { title: '操作', key: 'actions', width: 80,
      render: (_, record) => {
        if (editingKey === record.id) {
          return <Space><Button size="small" type="primary" onClick={() => save(record.id)}>保存</Button><Button size="small" onClick={() => setEditingKey('')}>取消</Button></Space>;
        }
        const canEdit = !isReadOnly && (isAdmin || editableCols.length > 0);
        return canEdit ? <Button size="small" onClick={() => { setEditingKey(record.id); form.setFieldsValue(record); }}>编辑</Button> : null;
      }
    },
  ];

  const anomalyMap = useMemo(() => {
    const map = new Map();
    for (const record of data) {
      if (!record.anomaly_data) continue;
      try { map.set(record.id, new Set(Object.keys(JSON.parse(record.anomaly_data)))); } catch {}
    }
    return map;
  }, [data]);
  const isAnomaly = (record, key) => anomalyMap.get(record.id)?.has(key) || false;

  const mergedColumns = columns.map(col => ({
    ...col,
    onCell: record => ({ record, dataIndex: col.dataIndex, editable: col.editable && (isAdmin || editableCols.includes(col.dataIndex)), className: isAnomaly(record, col.dataIndex) ? 'cell-anomaly' : undefined })
  }));

  return (
    <>
      <div className="video-detail-header">
        <Button onClick={onHome}>功能首页</Button>
        {isAdmin && <Button onClick={onBack}>← 返回</Button>}
        <h3>{isAdmin ? `${daren.nickname} — 视频明细` : '达人数据'}</h3>
        {!isAdmin && <Space>当前状态：{confirmationStatusTag(confirmationStatus)}{!isReadOnly && confirmationStatus === '待确认' && <Button size="small" type="primary" onClick={() => submitConfirmation('已确认')}>确认数据无误</Button>}</Space>}
      </div>
      <div className="anomaly-summary-card" aria-label="视频异常统计">
        <div className="anomaly-summary-item anomaly">
          <span>异常数量</span>
          <strong>{anomalySummary.anomalyCount}</strong>
        </div>
        <div className="anomaly-summary-item submitted">
          <span>已提交异常数量</span>
          <strong>{anomalySummary.submittedAnomalyCount}</strong>
        </div>
      </div>
      <div className="toolbar">
        <Select placeholder="平台" allowClear style={{width:110}} value={platformFilter} onChange={value => { setPage(1); setPlatformFilter(value); }}
          options={[{label:'抖音',value:'抖音'},{label:'快手',value:'快手'},{label:'B站',value:'B站'}]} />
        <Input.Search placeholder="搜索标题" value={titleInput} onChange={e => setTitleInput(e.target.value)} onSearch={() => { setPage(1); setTitleSearch(titleInput); }} style={{ width: 180 }} allowClear />
        <Select placeholder="违规" allowClear style={{width:110}} value={violation} onChange={value => { setPage(1); setViolation(value); }}
          options={[{label:'全部',value:'all'},{label:'违规',value:'违规'},{label:'未违规',value:'未违规'}]} />
        <Select placeholder="合规" allowClear style={{width:110}} value={compliance} onChange={value => { setPage(1); setCompliance(value); }}
          options={[{label:'全部',value:'all'},{label:'合规',value:'合规'},{label:'不合规',value:'不合规'}]} />
      </div>
      <Form form={form} component={false}>
        <Table columns={mergedColumns} dataSource={data} rowKey="id"
          loading={loading} scroll={{x:2600}} pagination={{total, current:page, pageSize:20, onChange:setPage}}
          bordered size="small" components={{body:{cell:EditableCell}}} />
      </Form>
    </>
  );
}

const allColumns = [
  { key: 'title', label: '视频标题' },
  { key: 'tags', label: '作品描述标签' },
  { key: 'content_url', label: '内容链接' },
  { key: 'duration', label: '时长' },
  { key: 'publish_time', label: '发布时间' },
  { key: 'da_plays', label: 'DA播放量' },
  { key: 'screenshot_plays', label: '播放量截图' },
  { key: 'da_likes', label: 'DA点赞量' },
  { key: 'screenshot_likes', label: '点赞量截图' },
  { key: 'da_7d_plays', label: 'DA7日播放' },
  { key: 'screenshot_7d_plays', label: '7日播放量截图' },
  { key: 'da_7d_likes', label: 'DA7日点赞' },
  { key: 'screenshot_7d_likes', label: '7日点赞量截图' },
  { key: 'comments', label: '评论量' },
  { key: 'saves', label: '收藏量' },
  { key: 'shares', label: '转发量' },
  { key: 'violation_status', label: '违规状态' },
  { key: 'violation_desc', label: '违规描述' },
  { key: 'compliance_status', label: '合规状态' },
  { key: 'compliance_desc', label: '合规异常描述' },
  { key: 'is_node', label: '是否是节点' },
  { key: 'node_name', label: '参与节点名称' },
  { key: 'is_hot', label: '是否是爆款' },
  { key: 'appeal', label: '申诉' },
];

function SettingsPage({ onBack }) {
  const [checked, setChecked] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/api/settings/editable-columns').then(res => setChecked(res.columns || []));
  }, []);

  const save = async () => {
    setLoading(true);
    const res = await api.put('/api/settings/editable-columns', { columns: checked });
    setLoading(false);
    if (res.ok) message.success('权限设置已保存');
  };

  return (
    <>
      <div className="video-detail-header">
        <Button onClick={onBack}>← 返回</Button>
        <h3>可编辑列权限设置</h3>
      </div>
      <Card title="勾选普通用户可编辑的列" style={{ maxWidth: 500 }}>
        <Checkbox.Group value={checked} onChange={setChecked}
          style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {allColumns.map(c => (
            <Checkbox key={c.key} value={c.key}>{c.label}</Checkbox>
          ))}
        </Checkbox.Group>
        <Button type="primary" onClick={save} loading={loading} style={{ marginTop: 16 }}>
          保存设置
        </Button>
      </Card>
    </>
  );
}

function AuditPage({ onBack }) {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const res = await api.get('/api/audit-logs?limit=50&offset=' + ((page - 1) * 50));
    setLogs(res.rows || []);
    setTotal(res.total || 0);
    setLoading(false);
  }, [page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const columns = [
    { title: '操作人', dataIndex: 'user_nickname', width: 130 },
    { title: '表名', dataIndex: 'table_name', width: 80 },
    { title: '记录ID', dataIndex: 'record_id', width: 200, ellipsis: true },
    { title: '字段', dataIndex: 'column_name', width: 130 },
    { title: '旧值', dataIndex: 'old_value', width: 160, ellipsis: true },
    { title: '新值', dataIndex: 'new_value', width: 160, ellipsis: true },
    { title: '时间', dataIndex: 'changed_at', width: 160 },
  ];

  return (
    <>
      <div className="video-detail-header">
        <Button onClick={onBack}>← 返回</Button>
        <h3>操作日志</h3>
      </div>
      <Table columns={columns} dataSource={logs} rowKey="id"
        loading={loading} scroll={{x:1000}}
        pagination={{ total, pageSize: 50, current: page, onChange: setPage }}
        bordered size="small" />
    </>
  );
}

// ── App ──

function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('home');
  const [selectedDaren, setSelectedDaren] = useState(null);
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api.get('/api/me')
      .then(res => { if (res.user) setUser(res.user); })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  const loadBatches = useCallback(async () => {
    const res = await api.get('/api/batches');
    const list = res.batches || [];
    setBatches(list);
    setSelectedBatch(current => list.find(batch => batch.id === current?.id) || res.current || list.find(batch => batch.status === 'current') || null);
    return res;
  }, []);

  useEffect(() => {
    if (!user) {
      setBatches([]);
      setSelectedBatch(null);
      return;
    }
    loadBatches().catch(() => message.error('加载批次失败'));
  }, [user, loadBatches]);

  const enterDataCheck = useCallback(async () => {
    if (!selectedBatch) return message.info('暂无可核对的批次');
    if (user.role === 'admin') {
      setPage('darens');
      return;
    }
    try {
      const darens = await api.get('/api/darens?batchId=' + selectedBatch.id);
      const daren = darens && darens[0];
      if (!daren) return setPage('empty');
      setSelectedDaren(daren);
      setPage('videos');
    } catch (e) {
      message.error('加载数据失败');
    }
  }, [user, selectedBatch]);

  const navigateToVideos = useCallback((daren) => {
    setSelectedDaren(daren);
    setPage('videos');
  }, []);

  const goBack = useCallback(() => {
    setPage('darens');
  }, []);

  const goHome = useCallback(() => {
    setSelectedDaren(null);
    setPage('home');
  }, []);

  const handleLogout = useCallback(async () => {
    await api.post('/api/logout');
    setUser(null);
    setSelectedDaren(null);
    setSelectedBatch(null);
    setBatches([]);
    setPage('home');
  }, []);

  const chooseBatch = useCallback((batch) => {
    if (!batch) return;
    setSelectedBatch(batch);
    setSelectedDaren(null);
    setPage(user.role === 'admin' ? 'darens' : 'home');
  }, [user]);

  if (checking) return null;

  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  const roleMap = { admin: '管理员', editor: '编辑者', viewer: '查看者' };

  const renderPage = () => {
    switch (page) {
      case 'home':
        return <HomePage onDataCheck={enterDataCheck} />;
      case 'videos':
        return selectedDaren
          ? <VideoDetail daren={selectedDaren} user={user} batch={selectedBatch} onBack={goBack} onHome={goHome} />
          : <Card>本期暂无数据</Card>;
      case 'settings':
        return <SettingsPage onBack={goBack} />;
      case 'audit':
        return <AuditPage onBack={goBack} />;
      case 'batches':
        return <BatchManagerPage batches={batches} onRefresh={loadBatches} onSelectBatch={chooseBatch} onBack={() => setPage('darens')} />;
      case 'empty':
        return <Card>本期暂无数据</Card>;
      default:
        return <DarenList user={user} batch={selectedBatch} onViewVideos={navigateToVideos} onSettings={() => setPage('settings')} onAudit={() => setPage('audit')} onBatchManagement={() => setPage('batches')} onHome={goHome} />;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      <div className="app-header">
        <h2>{user.role === 'admin' ? '达人数据管理' : '达人数据'}</h2>
        <div className="user-info">
          <BatchPicker batches={batches} value={selectedBatch} onChange={chooseBatch} />
          <span>{user.display_name}（{roleMap[user.role] || user.role}）</span>
          <Button type="text" size="small" onClick={handleLogout} style={{ color: 'var(--ink-secondary)' }}>退出</Button>
        </div>
      </div>
      <div className="app-content">
        {renderPage()}
      </div>
    </Layout>
  );
}

// ── Render ──

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
