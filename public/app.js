const { useState, useEffect, useCallback } = React;
const { Layout, Button, Input, Form, Card, message, Space, Tag, Table, Select, Upload, Tooltip } = antd;

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
  return React.createElement('div', null, 'VideoDetail placeholder');
}

function SettingsPage({ onBack }) {
  return React.createElement('div', null, 'SettingsPage placeholder');
}

function AuditPage({ onBack }) {
  return React.createElement('div', null, 'AuditPage placeholder');
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
