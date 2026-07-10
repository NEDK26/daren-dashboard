const { useState, useEffect, useCallback } = React;
const { Layout, Button, Input, Form, Card, message, Space, Tag } = antd;

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
  return React.createElement('div', null, 'DarenList placeholder');
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
