const { useState, useEffect, useCallback } = React;
const { Layout, Button, Input, Form, Card, message, Space, Tag, Table, Select, Upload, Tooltip, DatePicker, Image, Checkbox } = antd;

// ── API helpers ──

const api = {
  get: (url) => fetch(url).then(r => r.json()),
  post: (url, data) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  put: (url, data) => fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  upload: (url, file) => { const fd = new FormData(); fd.append('file', file); return fetch(url, { method: 'POST', body: fd }).then(r => r.json()); }
};

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

// ── Placeholder pages ──

function DarenList({ user, onViewVideos, onSettings, onAudit }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [importing, setImporting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      const res = await api.get('/api/darens?' + params.toString());
      setData(res || []);
    } catch (e) {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  }, [search, category]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleImport = async (file) => {
    setImporting(true);
    const res = await api.upload('/api/import', file);
    setImporting(false);
    if (res.ok) {
      message.success(`导入完成：新增 ${res.imported} 条，跳过 ${res.skipped} 条，新建用户 ${res.newUsers} 人`);
      fetchData();
    } else {
      message.error(res.error || '导入失败');
    }
    return false;
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    window.open('/api/export?' + params.toString());
  };

  const columns = [
    { title: '全网昵称', dataIndex: 'nickname', key: 'nickname', width: 140,
      render: (text) => <span style={{ fontWeight: 600 }}>{text}</span> },
    { title: '机构名称', dataIndex: 'organization', key: 'organization', width: 120 },
    { title: '内容类型', dataIndex: 'content_type', key: 'content_type', width: 100 },
    { title: '达人分类', dataIndex: 'category', key: 'category', width: 130 },
    { title: '总播放量', dataIndex: 'total_plays', key: 'total_plays', width: 120,
      render: (v) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{(v || 0).toLocaleString()}</span> },
    { title: '平台数据', key: 'platforms', width: 210,
      render: (_, record) => {
        const platforms = (record.platforms || '').split(',').filter(Boolean);
        const config = {
          '抖音': { className: 'btn-douyin', color: '#ff2e63' },
          '快手': { className: 'btn-kuaishou', color: '#ff6b00' },
          'B站': { className: 'btn-bilibili', color: '#00aeec' }
        };
        return (
          <div className="platform-btns">
            {['抖音', '快手', 'B站'].map(p => {
              const cfg = config[p];
              const active = platforms.includes(p);
              return (
                <Button key={p} size="small"
                  type={active ? 'primary' : 'default'}
                  ghost={active}
                  disabled={!active}
                  className={cfg.className}
                  style={active ? { background: cfg.color, borderColor: cfg.color } : { borderColor: cfg.color, color: cfg.color }}
                  onClick={() => active && onViewVideos(record, p)}
                >{p}</Button>
              );
            })}
          </div>
        );
      }
    },
  ];

  const categoryOptions = [
    { value: '美食', label: '美食' }, { value: '美妆', label: '美妆' },
    { value: '搞笑', label: '搞笑' }, { value: '游戏', label: '游戏' },
    { value: '音乐', label: '音乐' }, { value: '舞蹈', label: '舞蹈' },
    { value: '知识', label: '知识' }, { value: '时尚', label: '时尚' },
    { value: '旅游', label: '旅游' }, { value: '体育', label: '体育' },
    { value: '科技', label: '科技' }, { value: '生活', label: '生活' },
  ];

  const isAdmin = user && user.role === 'admin';

  return (
    <div>
      <div className="toolbar">
        <Input.Search placeholder="搜索昵称" value={search} onChange={e => setSearch(e.target.value)} onSearch={fetchData} style={{ width: 200 }} allowClear />
        <Select placeholder="达人分类" value={category || undefined} onChange={v => setCategory(v || '')} style={{ width: 150, marginLeft: 12 }} allowClear options={categoryOptions} />
        <div className="spacer" />
        {isAdmin && (
          <>
            <Upload beforeUpload={handleImport} showUploadList={false}>
              <Button loading={importing}>导入Excel</Button>
            </Upload>
            <Button onClick={handleExport} style={{ marginLeft: 8 }}>导出</Button>
            <Button onClick={onSettings} style={{ marginLeft: 8 }}>设置</Button>
            <Button onClick={onAudit} style={{ marginLeft: 8 }}>审核</Button>
          </>
        )}
      </div>
      <Table columns={columns} dataSource={data} rowKey="id" loading={loading} pagination={{ pageSize: 20 }} bordered size="middle" style={{ marginTop: 16 }} />
    </div>
  );
}

function VideoDetail({ daren, platform, user, onBack }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState(null);
  const [violation, setViolation] = useState(undefined);
  const [compliance, setCompliance] = useState(undefined);
  const [editingKey, setEditingKey] = useState('');
  const [editableCols, setEditableCols] = useState([]);
  const [form] = Form.useForm();
  const isAdmin = user.role === 'admin';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (platform) params.set('platform', platform);
      if (dateRange && dateRange[0]) params.set('start', dateRange[0].format('YYYY-MM-DD'));
      if (dateRange && dateRange[1]) params.set('end', dateRange[1].format('YYYY-MM-DD'));
      if (violation) params.set('violation', violation);
      if (compliance) params.set('compliance', compliance);
      const res = await api.get('/api/darens/' + daren.id + '/videos?' + params.toString());
      setData(res || []);
    } catch (e) {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  }, [platform, dateRange, violation, compliance, daren.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (isAdmin) {
      api.get('/api/settings/editable-columns').then(res => {
        if (res.columns) setEditableCols(res.columns);
      }).catch(() => {});
    }
  }, [isAdmin]);

  const save = async (workId) => {
    try {
      const row = await form.validateFields();
      const original = data.find(d => d.work_id === workId);
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
      const res = await api.put('/api/videos/' + workId, changes);
      if (res.ok) {
        message.success('保存成功');
        setEditingKey('');
        fetchData();
      } else {
        message.error(res.error || '保存失败');
      }
    } catch (e) {
      message.error('保存失败');
    }
  };

  const renderScreenshots = (record) => {
    const fields = [
      { key: 'screenshot_plays', label: '播放' },
      { key: 'screenshot_likes', label: '点赞' },
      { key: 'screenshot_7d_plays', label: '7日播放' },
      { key: 'screenshot_7d_likes', label: '7日点赞' },
    ];
    return (
      <div className="screenshot-cell">
        {fields.map(f => (
          <Tooltip key={f.key} title={f.label}>
            {record[f.key] ? (
              <Image src={record[f.key]} width={60} height={60} style={{objectFit:'cover'}} />
            ) : (
              <Upload
                beforeUpload={file => { api.upload('/api/upload/'+record.work_id+'/'+f.key, file).then(r => r.ok ? (message.success('已上传'), fetchData()) : message.error(r.error)); return false; }}
                showUploadList={false}
              >
                <div style={{width:60, height:60, border:'1px dashed rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:11, color:'#8b949e', borderRadius:4}}>
                  {f.label}
                </div>
              </Upload>
            )}
          </Tooltip>
        ))}
      </div>
    );
  };

  const EditableCell = ({ title, dataIndex, children, editable, record, ...rest }) => {
    if (!editable || editingKey !== record.work_id) return <td {...rest}>{children}</td>;
    const inputNode = dataIndex === 'publish_time'
      ? <Input size="small" placeholder="YYYY-MM-DD" />
      : <Input size="small" />;
    return <td {...rest}><Form.Item name={dataIndex} style={{margin:0}}>{inputNode}</Form.Item></td>;
  };

  const columns = [
    { title: '视频标题', dataIndex: 'title', width: 220, ellipsis: true, editable: true },
    { title: '作品标签', dataIndex: 'tags', width: 140, ellipsis: true, editable: true },
    { title: '内容链接', dataIndex: 'content_url', width: 80,
      render: (v) => v ? <a href={v} target="_blank" rel="noreferrer" style={{color:'#58a6ff'}}>查看</a> : '-' },
    { title: '发布时间', dataIndex: 'publish_time', width: 110, editable: true },
    { title: 'DA播放', dataIndex: 'da_plays', width: 90,
      render: v => (v||0).toLocaleString(), editable: true },
    { title: 'DA点赞', dataIndex: 'da_likes', width: 80,
      render: v => (v||0).toLocaleString(), editable: true },
    { title: '7日播放', dataIndex: 'da_7d_plays', width: 90,
      render: v => (v||0).toLocaleString(), editable: true },
    { title: '7日点赞', dataIndex: 'da_7d_likes', width: 80,
      render: v => (v||0).toLocaleString(), editable: true },
    { title: '评论', dataIndex: 'comments', width: 70, editable: true },
    { title: '收藏', dataIndex: 'saves', width: 70, editable: true },
    { title: '转发', dataIndex: 'shares', width: 70, editable: true },
    { title: '违规', dataIndex: 'violation_status', width: 70,
      render: v => v==='违规' ? <Tag color="red">违规</Tag> : <Tag color="green">未违规</Tag> },
    { title: '合规', dataIndex: 'compliance_status', width: 70,
      render: v => v==='合规' ? <Tag color="green">合规</Tag> : <Tag color="orange">不合规</Tag> },
    { title: '截图', key: 'screenshots', width: 270,
      render: (_, record) => renderScreenshots(record) },
    { title: '操作', key: 'actions', width: 80,
      render: (_, record) => {
        if (editingKey === record.work_id) {
          return <Space><Button size="small" type="primary" onClick={() => save(record.work_id)}>保存</Button><Button size="small" onClick={() => setEditingKey('')}>取消</Button></Space>;
        }
        const canEdit = isAdmin || editableCols.length > 0;
        return canEdit ? <Button size="small" onClick={() => { setEditingKey(record.work_id); form.setFieldsValue(record); }}>编辑</Button> : null;
      }
    },
  ];

  const mergedColumns = columns.map(col => ({
    ...col,
    onCell: record => ({ record, dataIndex: col.dataIndex, editable: col.editable })
  }));

  return (
    <>
      <div className="video-detail-header">
        <Button onClick={onBack}>← 返回</Button>
        <h3>{daren.nickname} — {platform} 视频明细</h3>
      </div>
      <div className="toolbar">
        <DatePicker.RangePicker value={dateRange} onChange={setDateRange} placeholder={['开始','结束']} />
        <Select placeholder="违规" allowClear style={{width:110}} value={violation} onChange={setViolation}
          options={[{label:'全部',value:'all'},{label:'违规',value:'违规'},{label:'未违规',value:'未违规'}]} />
        <Select placeholder="合规" allowClear style={{width:110}} value={compliance} onChange={setCompliance}
          options={[{label:'全部',value:'all'},{label:'合规',value:'合规'},{label:'不合规',value:'不合规'}]} />
      </div>
      <Form form={form} component={false}>
        <Table columns={mergedColumns} dataSource={data} rowKey="work_id"
          loading={loading} scroll={{x:1900}} pagination={{pageSize:20}}
          bordered size="small" components={{body:{cell:EditableCell}}} />
      </Form>
    </>
  );
}

const allColumns = [
  { key: 'title', label: '视频标题' },
  { key: 'tags', label: '作品描述标签' },
  { key: 'content_url', label: '内容链接' },
  { key: 'publish_time', label: '发布时间' },
  { key: 'da_plays', label: 'DA播放量' },
  { key: 'da_likes', label: 'DA点赞量' },
  { key: 'da_7d_plays', label: 'DA7日播放' },
  { key: 'da_7d_likes', label: 'DA7日点赞' },
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
  const [page, setPage] = useState('darens');
  const [selectedDaren, setSelectedDaren] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api.get('/api/me')
      .then(res => { if (res.user) setUser(res.user); })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  const navigateToVideos = useCallback((daren, platform) => {
    setSelectedDaren(daren);
    setSelectedPlatform(platform);
    setPage('videos');
  }, []);

  const goBack = useCallback(() => {
    setPage('darens');
  }, []);

  const handleLogout = useCallback(async () => {
    await api.post('/api/logout');
    setUser(null);
    setPage('darens');
  }, []);

  if (checking) return null;

  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  const roleMap = { admin: '管理员', editor: '编辑者', viewer: '查看者' };

  const renderPage = () => {
    switch (page) {
      case 'videos':
        return <VideoDetail daren={selectedDaren} platform={selectedPlatform} user={user} onBack={goBack} />;
      case 'settings':
        return <SettingsPage onBack={goBack} />;
      case 'audit':
        return <AuditPage onBack={goBack} />;
      default:
        return <DarenList user={user} onViewVideos={navigateToVideos} onSettings={() => setPage('settings')} onAudit={() => setPage('audit')} />;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#0a0e14' }}>
      <div className="app-header">
        <h2>达人数据管理</h2>
        <div className="user-info">
          <span>{user.display_name}（{roleMap[user.role] || user.role}）</span>
          <Button type="text" size="small" onClick={handleLogout} style={{ color: '#8b949e' }}>退出</Button>
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
