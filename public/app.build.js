const {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef
} = React;
const {
  Layout,
  Button,
  Input,
  InputNumber,
  Form,
  Card,
  message,
  Space,
  Tag,
  Table,
  Select,
  Upload,
  Tooltip,
  Image,
  Checkbox,
  Modal,
  Drawer,
  Dropdown,
  Pagination
} = antd;
const PAGE_CAPABILITIES = window.DAREN_MODULES?.pageCapabilities || Object.freeze({
  fees: 'feeCheck',
  accounts: 'accountManagement',
  audit: 'auditLogs',
  'batch-switch': 'batchManagement',
  settings: 'accountManagement'
});

// ── Shared API client ──

const api = window.DAREN_API;
async function downloadAccountFile(url, options, fallbackName) {
  const response = await fetch(url, options);
  const contentType = response.headers.get('content-type') || '';
  if (!response.ok || !contentType.includes('spreadsheet')) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || '账号清单下载失败');
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fallbackName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
const confirmationStatusTag = status => {
  const value = status || '待确认';
  const color = value === '已确认' ? 'green' : value === '已提交申诉' ? 'orange' : 'default';
  return /*#__PURE__*/React.createElement(Tag, {
    color: color
  }, value);
};
const PAGE_SIZE_OPTIONS = ['20', '50', '100'];
const TABLE_LOCALE = {
  emptyText: '当前批次暂无数据'
};
const SCREENSHOT_ANOMALY_FIELDS = [{
  key: 'screenshot_plays',
  label: '播放截图'
}, {
  key: 'screenshot_likes',
  label: '点赞截图'
}, {
  key: 'screenshot_7d_plays',
  label: '7日播放截图'
}, {
  key: 'screenshot_7d_likes',
  label: '7日点赞截图'
}];
const textTooltip = value => value ? /*#__PURE__*/React.createElement(Tooltip, {
  title: value,
  placement: "topRight",
  overlayClassName: "table-text-tooltip"
}, /*#__PURE__*/React.createElement("span", {
  className: "table-ellipsis-trigger"
}, value)) : '-';
// ── LoginPage ──

function LoginPage({
  onLogin,
  deploymentConfig
}) {
  const [loading, setLoading] = useState(false);
  const handleSubmit = useCallback(async values => {
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
  return /*#__PURE__*/React.createElement("div", {
    className: "login-page"
  }, /*#__PURE__*/React.createElement("div", {
    className: "login-panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "login-logo-frame"
  }, /*#__PURE__*/React.createElement("img", {
    className: "login-logo",
    src: deploymentConfig.branding.logo,
    alt: deploymentConfig.branding.title
  })), /*#__PURE__*/React.createElement(Card, {
    title: deploymentConfig.branding.title,
    className: "login-card"
  }, /*#__PURE__*/React.createElement(Form, {
    onFinish: handleSubmit,
    layout: "vertical"
  }, /*#__PURE__*/React.createElement(Form.Item, {
    name: "username",
    rules: [{
      required: true,
      message: '请输入用户名'
    }]
  }, /*#__PURE__*/React.createElement(Input, {
    placeholder: "用户名"
  })), /*#__PURE__*/React.createElement(Form.Item, {
    name: "password",
    rules: [{
      required: true,
      message: '请输入密码'
    }]
  }, /*#__PURE__*/React.createElement(Input.Password, {
    placeholder: "密码"
  })), /*#__PURE__*/React.createElement(Form.Item, null, /*#__PURE__*/React.createElement(Button, {
    type: "primary",
    htmlType: "submit",
    loading: loading,
    block: true
  }, "登录"))))));
}
function PasswordChangeForm({
  user,
  required,
  onChanged
}) {
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const submit = async values => {
    if (values.newPassword !== values.confirmPassword) return message.error('两次输入的新密码不一致');
    setSaving(true);
    try {
      const res = await api.post('/api/account/password', values);
      if (!res.ok) return message.error(res.error || '密码修改失败');
      form.resetFields();
      message.success('密码已修改');
      onChanged(res.user);
    } catch (error) {
      message.error(error.message || '密码修改失败');
    } finally {
      setSaving(false);
    }
  };
  return /*#__PURE__*/React.createElement(Form, {
    form: form,
    layout: "vertical",
    onFinish: submit
  }, /*#__PURE__*/React.createElement(Form.Item, {
    label: "当前密码",
    name: "currentPassword",
    rules: [{
      required: true,
      message: '请输入当前密码'
    }]
  }, /*#__PURE__*/React.createElement(Input.Password, {
    autoComplete: "current-password"
  })), /*#__PURE__*/React.createElement(Form.Item, {
    label: "新密码",
    name: "newPassword",
    rules: [{
      required: true,
      min: 8,
      message: '密码至少需要 8 位'
    }]
  }, /*#__PURE__*/React.createElement(Input.Password, {
    autoComplete: "new-password"
  })), /*#__PURE__*/React.createElement(Form.Item, {
    label: "确认新密码",
    name: "confirmPassword",
    rules: [{
      required: true,
      message: '请再次输入新密码'
    }]
  }, /*#__PURE__*/React.createElement(Input.Password, {
    autoComplete: "new-password"
  })), /*#__PURE__*/React.createElement(Button, {
    type: "primary",
    htmlType: "submit",
    loading: saving,
    block: true
  }, required ? '完成初始化' : '保存新密码'));
}
function PasswordChangePage({
  user,
  onChanged
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "workbench-page password-required-page"
  }, /*#__PURE__*/React.createElement(Card, {
    title: "首次登录请修改密码",
    className: "password-change-card"
  }, /*#__PURE__*/React.createElement("p", null, "初始化密码仅用于首次登录，请设置新的登录密码后继续使用系统。"), /*#__PURE__*/React.createElement(PasswordChangeForm, {
    user: user,
    required: true,
    onChanged: onChanged
  })));
}
function PasswordChangeModal({
  open,
  user,
  onClose,
  onChanged
}) {
  return /*#__PURE__*/React.createElement(Modal, {
    title: "修改密码",
    open: open,
    onCancel: onClose,
    footer: null,
    destroyOnClose: true
  }, /*#__PURE__*/React.createElement(PasswordChangeForm, {
    user: user,
    onChanged: onChanged
  }));
}
// ── DarenList ──

const allColumns = [{
  key: 'title',
  label: '视频标题'
}, {
  key: 'tags',
  label: '作品描述标签'
}, {
  key: 'content_url',
  label: '内容链接'
}, {
  key: 'duration',
  label: '时长'
}, {
  key: 'publish_time',
  label: '发布时间'
}, {
  key: 'da_plays',
  label: 'DA播放量'
}, {
  key: 'screenshot_plays',
  label: '播放量截图'
}, {
  key: 'da_likes',
  label: 'DA点赞量'
}, {
  key: 'screenshot_likes',
  label: '点赞量截图'
}, {
  key: 'da_7d_plays',
  label: 'DA7日播放'
}, {
  key: 'screenshot_7d_plays',
  label: '7日播放量截图'
}, {
  key: 'da_7d_likes',
  label: 'DA7日点赞'
}, {
  key: 'screenshot_7d_likes',
  label: '7日点赞量截图'
}, {
  key: 'comments',
  label: '评论量'
}, {
  key: 'saves',
  label: '收藏量'
}, {
  key: 'shares',
  label: '转发量'
}, {
  key: 'violation_status',
  label: '违规状态'
}, {
  key: 'violation_desc',
  label: '违规描述'
}, {
  key: 'compliance_status',
  label: '合规状态'
}, {
  key: 'compliance_desc',
  label: '合规异常描述'
}, {
  key: 'is_node',
  label: '是否是节点'
}, {
  key: 'node_name',
  label: '参与节点名称'
}, {
  key: 'is_hot',
  label: '是否是爆款'
}];
const EDITABLE_COLUMN_GROUPS = [{
  title: '基础内容',
  keys: ['title', 'tags', 'content_url', 'duration', 'publish_time']
}, {
  title: '数据指标',
  keys: ['da_plays', 'da_likes', 'da_7d_plays', 'da_7d_likes', 'comments', 'saves', 'shares']
}, {
  title: '截图凭证',
  keys: ['screenshot_plays', 'screenshot_likes', 'screenshot_7d_plays', 'screenshot_7d_likes']
}, {
  title: '合规与申诉',
  keys: ['violation_status', 'violation_desc', 'compliance_status', 'compliance_desc', 'is_node', 'node_name', 'is_hot']
}];
// ── App ──

function App() {
  const [user, setUser] = useState(null);
  const [deploymentConfig, setDeploymentConfig] = useState(null);
  const [page, setPage] = useState('home');
  const [selectedDaren, setSelectedDaren] = useState(null);
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchesLoaded, setBatchesLoaded] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [checking, setChecking] = useState(true);
  const [configError, setConfigError] = useState(false);
  useEffect(() => {
    Promise.all([window.DAREN_DEPLOYMENT.load(), api.get('/api/me')]).then(([config, meRes]) => {
      setDeploymentConfig(window.DAREN_DEPLOYMENT.applyBranding(config));
      if (meRes.user) setUser(meRes.user);
    }).catch(() => setConfigError(true)).finally(() => setChecking(false));
  }, []);
  const loadBatches = useCallback(async () => {
    const res = await api.get('/api/batches');
    const list = res.batches || [];
    setBatches(list);
    setSelectedBatch(current => list.find(batch => batch.id === current?.id) || res.current || list.find(batch => batch.status === 'current') || null);
    setBatchesLoaded(true);
    return res;
  }, []);
  useEffect(() => {
    if (!user || Number(user.must_change_password)) {
      setBatches([]);
      setSelectedBatch(null);
      setBatchesLoaded(false);
      return;
    }
    setBatchesLoaded(false);
    loadBatches().catch(() => message.error('加载批次失败'));
  }, [user, loadBatches]);
  const enterDataCheck = useCallback(async () => {
    if (!deploymentConfig.capabilities.dataCheck) return message.info('当前部署未启用数据核对');
    setActiveWorkspace('data');
    if (!selectedBatch) {
      if (user.role === 'admin') return setPage('batches');
      return message.info('暂无可核对的批次');
    }
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
  }, [user, selectedBatch, deploymentConfig]);
  useEffect(() => {
    if (!user || page !== 'home' || !batchesLoaded) return;
    if (selectedBatch) return void enterDataCheck();
    setActiveWorkspace('data');
    setPage(user.role === 'admin' ? 'batches' : 'empty');
  }, [page, batchesLoaded, selectedBatch, user, enterDataCheck]);
  const enterFeeCheck = useCallback(() => {
    if (!deploymentConfig.capabilities.feeCheck) return message.info('当前部署未启用费用核对');
    message.info('费用核对暂未开启');
  }, [deploymentConfig]);
  const enterAccountManagement = useCallback(() => {
    if (!deploymentConfig.capabilities.accountManagement) return message.info('当前部署未启用达人账号管理');
    setActiveWorkspace('basic');
    setPage('accounts');
  }, [deploymentConfig]);
  const navigateToVideos = useCallback(daren => {
    setSelectedDaren(daren);
    setPage('videos');
  }, []);
  const goBack = useCallback(() => {
    setPage('darens');
  }, []);
  const goHome = useCallback(() => {
    setSelectedDaren(null);
    setActiveWorkspace(null);
    setPage('home');
  }, []);
  const handleLogout = useCallback(async () => {
    await api.post('/api/logout');
    setUser(null);
    setSelectedDaren(null);
    setSelectedBatch(null);
    setBatches([]);
    setActiveWorkspace(null);
    setPage('home');
  }, []);
  const chooseBatch = useCallback(batch => {
    if (!batch) return;
    setSelectedBatch(batch);
    setSelectedDaren(null);
    setPage(user.role === 'admin' ? 'darens' : 'home');
  }, [user]);
  const navigatePrimary = useCallback(key => {
    if (key === 'data' || key === 'darens') return enterDataCheck();
    const capability = PAGE_CAPABILITIES[key];
    if (capability && !deploymentConfig.capabilities[capability]) return message.info('当前部署未启用该功能');
    setPage(key);
  }, [enterDataCheck, deploymentConfig]);
  if (checking) return null;
  if (configError || !deploymentConfig) return /*#__PURE__*/React.createElement(Card, null, "部署配置加载失败，请刷新重试");
  if (!user) {
    return /*#__PURE__*/React.createElement(LoginPage, {
      deploymentConfig: deploymentConfig,
      onLogin: setUser
    });
  }
  if (Number(user.must_change_password)) {
    return /*#__PURE__*/React.createElement(PasswordChangePage, {
      user: user,
      onChanged: setUser
    });
  }
  const renderPage = () => {
    const pageCapability = PAGE_CAPABILITIES[page];
    if (pageCapability && !deploymentConfig.capabilities[pageCapability]) return /*#__PURE__*/React.createElement(Card, null, "当前部署未启用该功能");
    switch (page) {
      case 'home':
        return null;
      case 'videos':
        return selectedDaren ? /*#__PURE__*/React.createElement(VideoDetail, {
          daren: selectedDaren,
          user: user,
          batch: selectedBatch,
          onBack: goBack
        }) : /*#__PURE__*/React.createElement(Card, null, "本期暂无数据");
      case 'settings':
        return /*#__PURE__*/React.createElement(SettingsPage, {
          onBack: goBack
        });
      case 'audit':
        return /*#__PURE__*/React.createElement(AuditPage, {
          onBack: goBack
        });
      case 'accounts':
        return /*#__PURE__*/React.createElement(AccountManagementPage, {
          batches: batches,
          onBack: goHome
        });
      case 'batches':
        return /*#__PURE__*/React.createElement(BatchManagerPage, {
          batches: batches,
          onRefresh: loadBatches,
          onSelectBatch: chooseBatch,
          onBack: goHome
        });
      case 'batch-switch':
        return /*#__PURE__*/React.createElement(BatchSwitchPage, {
          batches: batches,
          selectedBatch: selectedBatch,
          onSelectBatch: chooseBatch,
          onBack: goHome
        });
      case 'empty':
        return /*#__PURE__*/React.createElement(Card, null, "本期暂无数据");
      default:
        return /*#__PURE__*/React.createElement(DarenList, {
          user: user,
          batch: selectedBatch,
          batches: batches,
          onSelectBatch: chooseBatch,
          onViewVideos: navigateToVideos,
          onOpenAudit: () => setPage('audit'),
          onOpenBatches: () => {
            setActiveWorkspace('data');
            setPage('batches');
          },
          onOpenSettings: () => {
            setActiveWorkspace('data');
            setPage('settings');
          }
        });
    }
  };
  return /*#__PURE__*/React.createElement(Layout, {
    style: {
      minHeight: '100vh',
      background: 'var(--paper)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "workspace-shell"
  }, /*#__PURE__*/React.createElement(WorkspaceSidebar, {
    deploymentConfig: deploymentConfig,
    user: user,
    page: page,
    activeWorkspace: activeWorkspace,
    onDataCheck: enterDataCheck,
    onFeeCheck: enterFeeCheck,
    onAccounts: enterAccountManagement,
    onNavigate: navigatePrimary,
    onPassword: () => setPasswordModalOpen(true),
    onLogout: handleLogout
  }), /*#__PURE__*/React.createElement("main", {
    className: "workspace-main"
  }, /*#__PURE__*/React.createElement(MobileWorkspaceHeader, {
    deploymentConfig: deploymentConfig,
    user: user,
    onPassword: () => setPasswordModalOpen(true),
    onLogout: handleLogout
  }), /*#__PURE__*/React.createElement("div", {
    className: "app-content"
  }, renderPage()))), /*#__PURE__*/React.createElement(PasswordChangeModal, {
    open: passwordModalOpen,
    user: user,
    onClose: () => setPasswordModalOpen(false),
    onChanged: nextUser => {
      setUser(nextUser);
      setPasswordModalOpen(false);
    }
  }));
}

// ── Render ──

ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
