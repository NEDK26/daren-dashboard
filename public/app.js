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

// ── API helpers ──

const api = {
  get: (url, options = {}) => fetch(url, options).then(r => r.json()),
  post: (url, data) => fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  }).then(r => r.json()),
  put: (url, data) => fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  }).then(r => r.json()),
  delete: (url, data) => fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  }).then(r => r.json()),
  upload: (url, file, fields = {}) => {
    const fd = new FormData();
    if (file) fd.append('file', file);
    Object.entries(fields).forEach(([key, value]) => fd.append(key, value));
    return fetch(url, {
      method: 'POST',
      body: fd
    }).then(r => r.json());
  }
};
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
  return <Tag color={color}>{value}</Tag>;
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
const textTooltip = value => value ? <Tooltip title={value} placement="topRight" overlayClassName="table-text-tooltip"><span className="table-ellipsis-trigger">{value}</span></Tooltip> : '-';
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
function AppNavigation({
  user,
  page,
  onNavigate,
  placement
}) {
  const isAdmin = user.role === 'admin';
  const items = isAdmin ? [{
    key: 'darens',
    label: '达人核对',
    icon: '人'
  }, {
    key: 'batches',
    label: '批次',
    icon: '批'
  }, {
    key: 'settings',
    label: '权限',
    icon: '设'
  }, {
    key: 'audit',
    label: '操作日志',
    icon: '审'
  }] : [{
    key: 'data',
    label: '数据核对',
    icon: '数'
  }, {
    key: 'audit',
    label: '我的日志',
    icon: '记'
  }, {
    key: 'batch-switch',
    label: '切换批次',
    icon: '批'
  }];
  const activeKey = isAdmin ? page === 'videos' || page === 'home' || page === 'empty' ? 'darens' : page : page === 'videos' || page === 'empty' || page === 'home' ? 'data' : page;
  return <nav className={placement === 'desktop' ? 'desktop-nav' : 'mobile-nav'}>{items.map(item => <Button key={item.key} type="text" className={activeKey === item.key ? 'active' : ''} onClick={() => onNavigate(item.key)}><span>{item.icon}</span>{item.label}</Button>)}</nav>;
}
function WorkspaceSidebar({
  user,
  page,
  activeWorkspace,
  onDataCheck,
  onFeeCheck,
  onAccounts,
  onNavigate,
  onPassword,
  onLogout
}) {
  const isAdmin = user.role === 'admin';
  const dataActive = activeWorkspace === 'data' || ['darens', 'videos', 'empty', 'batch-switch', 'batches', 'settings'].includes(page);
  const accountMenu = {
    items: [{
      key: 'password',
      label: '修改密码'
    }, {
      key: 'logout',
      label: '退出登录'
    }],
    onClick: ({
      key
    }) => key === 'password' ? onPassword() : onLogout()
  };
  const navButton = (key, label, onClick, muted = false) => <button key={key} type="button" className={'workspace-nav-item ' + (key === 'data' && dataActive || page === key ? 'active' : '') + (muted ? ' muted' : '')} onClick={onClick}><span>{label}</span></button>;
  return <aside className="workspace-sidebar"><button type="button" className="workspace-brand" onClick={onDataCheck}><img src="/logo.png" alt="" aria-hidden="true" /><span>达人数据管理</span></button><nav className="workspace-navigation" aria-label="工作区导航"><section><div className="workspace-nav-label">{isAdmin ? '本期工作台' : '我的工作台'}</div>{navButton('data', isAdmin ? '数据核对' : '本期数据', onDataCheck)}{isAdmin && navButton('fees', '费用核对', onFeeCheck, true)}</section>{isAdmin && <section><div className="workspace-nav-label">基础工作台</div>{navButton('accounts', '达人账号管理', onAccounts)}{navButton('audit', isAdmin ? '操作记录' : '我的记录', () => onNavigate('audit'))}</section>}{!isAdmin && <section><div className="workspace-nav-label">更多</div>{!isAdmin && navButton('batch-switch', '切换批次', () => onNavigate('batch-switch'))}{navButton('audit', isAdmin ? '操作记录' : '我的记录', () => onNavigate('audit'))}<button type="button" className="workspace-nav-item" onClick={onPassword}><span>账户设置</span></button></section>}</nav><div className="workspace-sidebar-footer"><Dropdown menu={accountMenu} trigger={['click']} placement="topLeft"><button className="workspace-account" type="button" aria-label={`${user.display_name}，打开账户菜单`}><span className="workspace-avatar" aria-hidden="true">{isAdmin ? '管' : '达'}</span><span><strong>{user.display_name}</strong><small>{isAdmin ? '管理员' : '达人账号'}</small></span><span className="account-chevron" aria-hidden="true">⌄</span></button></Dropdown></div></aside>;
}
function MobileWorkspaceHeader({
  user,
  onPassword,
  onLogout
}) {
  return <div className="mobile-workspace-header"><div className="app-brand"><img className="header-logo" src="/logo.png" alt="" aria-hidden="true" /><h2>达人数据管理</h2></div><Dropdown menu={{
      items: [{
        key: 'password',
        label: '修改密码'
      }, {
        key: 'logout',
        label: '退出登录'
      }],
      onClick: ({
        key
      }) => key === 'password' ? onPassword() : onLogout()
    }} trigger={['click']} placement="bottomRight"><button className="account-trigger" type="button"><span className="account-name">{user.display_name}</span><span aria-hidden="true">⌄</span></button></Dropdown></div>;
}

// ── LoginPage ──

function LoginPage({
  onLogin
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
  return <div className="login-page"><div className="login-panel"><div className="login-logo-frame"><img className="login-logo" src="/logo.png" alt="甚杰文化" /></div><Card title="达人数据管理平台" className="login-card"><Form onFinish={handleSubmit} layout="vertical"><Form.Item name="username" rules={[{
            required: true,
            message: '请输入用户名'
          }]}><Input placeholder="用户名" /></Form.Item><Form.Item name="password" rules={[{
            required: true,
            message: '请输入密码'
          }]}><Input.Password placeholder="密码" /></Form.Item><Form.Item><Button type="primary" htmlType="submit" loading={loading} block>登录</Button></Form.Item></Form></Card></div></div>;
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
  return <Form form={form} layout="vertical" onFinish={submit}><Form.Item label="当前密码" name="currentPassword" rules={[{
      required: true,
      message: '请输入当前密码'
    }]}><Input.Password autoComplete="current-password" /></Form.Item><Form.Item label="新密码" name="newPassword" rules={[{
      required: true,
      min: 8,
      message: '密码至少需要 8 位'
    }]}><Input.Password autoComplete="new-password" /></Form.Item><Form.Item label="确认新密码" name="confirmPassword" rules={[{
      required: true,
      message: '请再次输入新密码'
    }]}><Input.Password autoComplete="new-password" /></Form.Item><Button type="primary" htmlType="submit" loading={saving} block>{required ? '完成初始化' : '保存新密码'}</Button></Form>;
}
function PasswordChangePage({
  user,
  onChanged
}) {
  return <div className="workbench-page password-required-page"><Card title="首次登录请修改密码" className="password-change-card"><p>初始化密码仅用于首次登录，请设置新的登录密码后继续使用系统。</p><PasswordChangeForm user={user} required onChanged={onChanged} /></Card></div>;
}
function PasswordChangeModal({
  open,
  user,
  onClose,
  onChanged
}) {
  return <Modal title="修改密码" open={open} onCancel={onClose} footer={null} destroyOnClose><PasswordChangeForm user={user} onChanged={onChanged} /></Modal>;
}
function BatchManagerPage({
  batches,
  onRefresh,
  onSelectBatch,
  onBack
}) {
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importStage, setImportStage] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const draft = batches.find(batch => batch.status === 'draft');
  const importStages = ['正在上传文件…', '正在解析 Excel…', '正在批量写入数据…', '正在切换当前批次…'];
  useEffect(() => {
    if (!importing) {
      setImportStage(0);
      return undefined;
    }
    const timer = setInterval(() => setImportStage(stage => (stage + 1) % importStages.length), 1800);
    return () => clearInterval(timer);
  }, [importing]);
  const createBatch = async values => {
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
  const importDraft = async file => {
    if (!draft) return false;
    setImporting(true);
    try {
      const res = await api.upload('/api/import', file, {
        batchId: draft.id
      });
      if (!res.ok) return message.error(res.error || '导入失败');
      message.success(`导入完成：${res.imported} 条数据，待初始化账号 ${res.pendingAccounts || 0} 个`);
      await onRefresh();
      if (res.pendingAccounts > 0) {
        Modal.confirm({
          title: '是否为本批次达人创建初始化账号？',
          content: `将为 ${res.pendingAccounts} 个尚无账号的达人生成随机初始化密码并下载账号清单。`,
          okText: '现在初始化',
          cancelText: '稍后处理',
          onOk: async () => {
            try {
              await downloadAccountFile('/api/batches/' + draft.id + '/initialize-accounts', {
                method: 'POST'
              }, 'daren-accounts.xlsx');
              message.success('初始化账号已完成，账号清单已下载');
              await onRefresh();
            } catch (e) {
              message.error(e.message || '初始化账号失败');
            }
          }
        });
      }
    } catch (e) {
      message.error('导入失败，请稍后重试');
    } finally {
      setImporting(false);
    }
    return false;
  };
  const initializeAccounts = async batch => {
    if (!batch?.pending_accounts) return message.info('该批次没有待初始化账号');
    try {
      await downloadAccountFile('/api/batches/' + batch.id + '/initialize-accounts', {
        method: 'POST'
      }, 'daren-accounts.xlsx');
      message.success('初始化账号已完成，账号清单已下载');
      await onRefresh();
    } catch (e) {
      message.error(e.message || '初始化账号失败');
    }
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
  const revokePublished = async batch => {
    Modal.confirm({
      title: '撤销当前批次发布？',
      content: '撤销后不会自动发布其他批次，需要时请手动发布。',
      okText: '撤销发布',
      cancelText: '取消',
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
      okText: '删除',
      okButtonProps: {
        danger: true
      },
      cancelText: '取消',
      onOk: async () => {
        setDeleting(true);
        try {
          const res = await api.delete('/api/batches/' + draft.id);
          if (res.ok) {
            message.success('草稿批次已删除');
            await onRefresh();
          } else message.error(res.error || '删除失败');
        } catch (e) {
          message.error('删除失败');
        } finally {
          setDeleting(false);
        }
      }
    });
  };
  return <React.Fragment><div className="video-detail-header"><Button onClick={onBack}>← 返回</Button><h3>批次管理</h3></div><Card title="创建批次" className="batch-manager-card"><Form layout="inline" onFinish={createBatch} initialValues={{
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1
      }}><Form.Item label="年份" name="year" rules={[{
          required: true,
          message: '请选择年份'
        }]}><InputNumber min={2000} max={2100} /></Form.Item><Form.Item label="月份" name="month" rules={[{
          required: true,
          message: '请选择月份'
        }]}><InputNumber min={1} max={12} /></Form.Item><Form.Item label="批次标题" name="title" rules={[{
          required: true,
          whitespace: true,
          message: '请输入自定义标题'
        }]}><Input placeholder="如：数据核对" /></Form.Item><Form.Item><Button type="primary" htmlType="submit" loading={creating} disabled={Boolean(draft)}>创建批次</Button></Form.Item></Form></Card>{draft && <Card title="草稿批次" className="batch-manager-card" extra={<Tag color="blue">{draft.name}</Tag>}><Space wrap><Upload beforeUpload={importDraft} showUploadList={false} accept=".xlsx"><Button type="primary" loading={importing}>导入 Excel</Button></Upload><Button disabled={!draft.imported_at || importing || !draft.pending_accounts} onClick={() => initializeAccounts(draft)}>初始化账号（{draft.pending_accounts || 0}）</Button><Button type="primary" disabled={!draft.imported_at || importing} onClick={publishDraft}>发布批次</Button><Button danger loading={deleting} onClick={deleteDraft}>删除草稿</Button></Space></Card>}<Table className="batch-manager-table" rowKey="id" dataSource={batches.filter(batch => batch.status !== 'draft')} pagination={false} columns={[{
      title: '批次名称',
      dataIndex: 'name'
    }, {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: status => <Tag color={status === 'current' ? 'green' : 'default'}>{status === 'current' ? '已发布' : '历史'}</Tag>
    }, {
      title: '导入时间',
      dataIndex: 'imported_at',
      width: 180,
      render: value => value || '-'
    }, {
      title: '待初始化账号',
      dataIndex: 'pending_accounts',
      width: 130,
      render: value => value || 0
    }, {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_, record) => record.status === 'current' ? <Space><Button size="small" disabled={!record.pending_accounts} onClick={() => initializeAccounts(record)}>初始化账号</Button><Button size="small" onClick={() => revokePublished(record)}>撤销发布</Button></Space> : null
    }]} /><Modal open={importing} footer={null} closable={false} maskClosable={false} keyboard={false} centered><div className="import-progress-content"><div className="import-progress-spinner" aria-hidden="true" /><div className="import-progress-copy"><div className="import-progress-title">正在导入 Excel</div><div className="import-progress-stage">{importStages[importStage]}</div><div className="import-progress-dots" aria-hidden="true"><span /><span /><span /></div></div></div></Modal></React.Fragment>;
}
function AccountManagementPage({
  batches,
  onBack
}) {
  const [batchId, setBatchId] = useState(() => batches.find(batch => batch.status === 'current')?.id);
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!batchId) setBatchId(batches.find(batch => batch.status === 'current')?.id);
  }, [batches, batchId]);
  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (batchId) params.set('batchId', batchId);
      if (search) params.set('search', search);
      const res = await api.get('/api/user-accounts?' + params.toString());
      setRows(res.rows || []);
    } catch (e) {
      message.error('账号列表加载失败');
    } finally {
      setLoading(false);
    }
  }, [batchId, search]);
  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);
  const resetOne = record => Modal.confirm({
    title: `重置 ${record.display_name} 的密码？`,
    content: '旧密码和已有登录会话会立即失效，新的随机码将下载到本地。',
    okText: '重置并下载',
    cancelText: '取消',
    onOk: async () => {
      await downloadAccountFile('/api/user-accounts/' + record.id + '/reset-password', {
        method: 'POST'
      }, 'daren-account-reset.xlsx');
      message.success('密码已重置，账号清单已下载');
      fetchAccounts();
    }
  });
  const resetBatch = all => Modal.confirm({
    title: all ? '重置全部普通账号？' : '重置当前批次账号？',
    content: all ? '所有达人旧密码和已有会话都会失效，请确认影响范围。' : '当前批次达人旧密码和已有会话都会失效。',
    okText: '重置并下载',
    okButtonProps: {
      danger: true
    },
    cancelText: '取消',
    onOk: async () => {
      const body = all ? {
        all: true
      } : {
        batchId
      };
      await downloadAccountFile('/api/user-accounts/reset-passwords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }, 'daren-account-reset.xlsx');
      message.success('密码已批量重置，账号清单已下载');
      fetchAccounts();
    }
  });
  return <React.Fragment><div className="video-detail-header"><Button onClick={onBack}>← 返回</Button><h3>达人账号管理</h3></div><Card className="account-management-card"><div className="toolbar"><Select style={{
          width: 230
        }} value={batchId} allowClear placeholder="全部批次" onChange={setBatchId} options={batches.map(batch => ({
          value: batch.id,
          label: batch.name
        }))} /><Input.Search style={{
          width: 200
        }} placeholder="搜索达人昵称" allowClear value={search} onChange={event => setSearch(event.target.value)} onSearch={setSearch} /><div className="spacer" /><Button onClick={() => resetBatch(false)} disabled={!batchId}>批量重置当前批次</Button><Button danger onClick={() => resetBatch(true)}>批量重置全部账号</Button></div><Table rowKey="id" loading={loading} dataSource={rows} pagination={{
        pageSize: 20
      }} columns={[{
        title: '达人昵称',
        dataIndex: 'display_name'
      }, {
        title: '账号状态',
        dataIndex: 'status',
        render: status => <Tag color={status === '正常' ? 'green' : status === '待首次改密' ? 'orange' : 'default'}>{status}</Tag>
      }, {
        title: '关联批次',
        dataIndex: 'batch_names',
        ellipsis: true,
        render: value => value || '-'
      }, {
        title: '密码更新时间',
        dataIndex: 'password_changed_at',
        render: value => value || '-'
      }, {
        title: '操作',
        key: 'actions',
        render: (_, record) => <Button size="small" onClick={() => resetOne(record)}>重置并下载</Button>
      }]} locale={TABLE_LOCALE} scroll={{
        x: 900
      }} /></Card></React.Fragment>;
}

// ── DarenList ──

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
  const [platform, setPlatform] = useState('');
  const [platformOptions, setPlatformOptions] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
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
    setPlatform('');
    if (!isAdmin || !batch) {
      setCategoryOptions([]);
      setContentTypeOptions([]);
      return setPlatformOptions([]);
    }
    let cancelled = false;
    Promise.all([api.get('/api/daren-categories?batchId=' + batch.id), api.get('/api/daren-content-types?batchId=' + batch.id), api.get('/api/daren-platforms?batchId=' + batch.id)]).then(([categories, contentTypes, platforms]) => {
      if (cancelled) return;
      setCategoryOptions((categories.categories || []).map(value => ({
        value,
        label: value
      })));
      setContentTypeOptions((contentTypes.contentTypes || []).map(value => ({
        value,
        label: value
      })));
      setPlatformOptions((platforms.platforms || []).map(value => ({
        value,
        label: value
      })));
    }).catch(() => {
      if (cancelled) return;
      setCategoryOptions([]);
      setContentTypeOptions([]);
      setPlatformOptions([]);
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
      if (platform) params.set('platform', platform);
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
      setSelectedRowKeys([]);
    } catch (e) {
      if (e.name !== 'AbortError') message.error('加载失败');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [search, category, contentType, confirmationStatus, hasAnomaly, platform, page, pageSize, batch?.id]);
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
  const handleDelete = records => {
    if (!records.length) return;
    const names = records.slice(0, 5).map(r => r.nickname).join('、');
    const more = records.length > 5 ? ` 等 ${records.length} 个达人` : '';
    Modal.confirm({
      title: `确认删除 ${records.length} 个达人？`,
      content: `将删除 ${names}${more} 在当前批次内的视频和本地截图；仅当用户没有其他批次数据时才删除其账号。`,
      okText: '删除',
      okButtonProps: {
        danger: true
      },
      cancelText: '取消',
      onOk: async () => {
        setDeleting(true);
        try {
          const res = await api.delete('/api/darens', {
            ids: records.map(r => r.id),
            batchId: batch?.id
          });
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
  const columns = [{
    title: '达人昵称',
    dataIndex: 'nickname',
    key: 'nickname',
    width: 180,
    fixed: 'left',
    render: (text, record) => <span className="daren-name-cell"><Tooltip title={text}><a className="data-link" onClick={() => onViewVideos(record)}>{text}</a></Tooltip></span>
  }, {
    title: '平台',
    dataIndex: 'platform',
    key: 'platform',
    width: 90,
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
  const selectedKeySet = new Set(selectedRowKeys.map(String));
  const selectedRows = data.filter(row => selectedKeySet.has(String(row.id)));
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
    setPlatform('');
    setPage(1);
  };
  return <div className="admin-review-page"><div className="admin-review-layout"><section className="admin-review-main"><header className="admin-review-header"><div><h1>数据核对</h1></div></header><div className="admin-review-batch-picker"><BatchPicker batches={batches || []} value={batch} onChange={onSelectBatch} /><Button type="text" onClick={fetchData} loading={loading} icon={<span className="toolbar-action-icon refresh-icon" aria-hidden="true"><svg viewBox="0 0 20 20" focusable="false"><path d="M15.5 6.5A6 6 0 1 0 16 12" /><path d="M15.5 2.5v4h-4" /></svg></span>}>刷新数据</Button><Button type="text" onClick={onOpenBatches} icon={<span className="toolbar-action-icon batch-icon" aria-hidden="true"><svg viewBox="0 0 20 20" focusable="false"><path d="M3 5.5h5l1.5 2H17v9H3z" /></svg></span>}>批次管理</Button><Button type="text" onClick={onOpenSettings} icon={<span className="toolbar-action-icon settings-icon" aria-hidden="true"><svg viewBox="0 0 20 20" focusable="false"><path d="M4 5h2m3 0h7M4 10h7m3 0h2M4 15h4m3 0h5" /><circle cx="7.5" cy="5" r="1.5" /><circle cx="12.5" cy="10" r="1.5" /><circle cx="9.5" cy="15" r="1.5" /></svg></span>}>核对设置</Button><div className="spacer" /><Button loading={exporting} disabled={!batch || isReadOnly} onClick={handleExport}><span className="export-icon" aria-hidden="true"><svg viewBox="0 0 20 20" focusable="false"><path d="M10 2v10m0 0 4-4m-4 4L6 8M3 13v4h14v-4" /></svg></span>导出当前批次</Button></div><div className="confirmation-summary-card status-rail" aria-label="达人确认状态统计"><div className="confirmation-summary-item pending"><div className="confirmation-summary-label">待确认</div><strong>{statusCounts.pending}</strong></div><div className="confirmation-summary-item confirmed"><div className="confirmation-summary-label">已确认</div><strong>{statusCounts.confirmed}</strong></div><div className="confirmation-summary-item appealed"><div className="confirmation-summary-label">已申诉</div><strong>{statusCounts.appealed}</strong></div></div><div className="admin-review-data-card"><div className="toolbar admin-review-filters"><Select placeholder="全部状态" value={confirmationStatus || undefined} onChange={v => {
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
            }]} /><Select placeholder="全部异常" value={hasAnomaly || undefined} onChange={v => {
              setPage(1);
              setHasAnomaly(v || '');
            }} allowClear options={[{
              value: 'yes',
              label: '存在异常'
            }, {
              value: 'no',
              label: '无异常'
            }]} /><Select placeholder="全部平台" value={platform || undefined} onChange={v => {
              setPage(1);
              setPlatform(v || '');
            }} allowClear options={platformOptions} /><Input.Search placeholder="搜索达人昵称" value={searchInput} onChange={e => setSearchInput(e.target.value)} onSearch={() => {
              setPage(1);
              setSearch(searchInput);
            }} allowClear /><Select placeholder="内容类型" value={contentType || undefined} onChange={v => {
              setPage(1);
              setContentType(v || '');
            }} allowClear options={contentTypeOptions} /><Select placeholder="达人分类" value={category || undefined} onChange={v => {
              setPage(1);
              setCategory(v || '');
            }} allowClear options={categoryOptions} /><Button onClick={resetFilters}>重置</Button><div className="spacer" /><Button danger loading={deleting} disabled={isReadOnly || !selectedRowKeys.length} onClick={() => handleDelete(selectedRows)}>删除选中</Button></div><Table className="admin-review-table" columns={columns} dataSource={data} rowKey="id" loading={loading} locale={TABLE_LOCALE} scroll={{
            x: 920
          }} pagination={false} rowSelection={!isReadOnly ? {
            selectedRowKeys,
            onChange: setSelectedRowKeys
          } : undefined} size="middle" /><div className="admin-review-table-footer"><div className="admin-review-total"><strong>共 {total.toLocaleString()} 位达人</strong>{isReadOnly && <Tag>历史批次只读</Tag>}</div><Pagination total={total} current={page} pageSize={pageSize} pageSizeOptions={PAGE_SIZE_OPTIONS} showSizeChanger showLessItems responsive onChange={setPage} onShowSizeChange={handlePageSizeChange} /></div></div></section><aside className="admin-review-rail" aria-label="批次与操作摘要"><section className="review-rail-card"><div className="review-rail-heading"><h2>当前批次概览</h2></div><strong className="current-batch-name">{batch?.name || '暂无批次'}</strong><div className="batch-overview-total"><span>达人总数</span><strong>{batchTotal.toLocaleString()}</strong></div><dl className="batch-overview-statuses"><div><dt>待确认</dt><dd>{statusCounts.pending}</dd></div><div><dt>已确认</dt><dd>{statusCounts.confirmed}</dd></div><div><dt>已申诉</dt><dd>{statusCounts.appealed}</dd></div></dl></section><section className="review-rail-card"><div className="review-rail-heading"><h2>最近操作</h2><button type="button" onClick={onOpenAudit}>查看全部操作</button></div><div className="recent-operation-list">{recentLogs.map(log => <div key={log.id}><strong>{log.action_type}</strong><span>{log.subject_nickname || log.subject_name || '系统'} · {log.created_at}</span></div>)}{!recentLogs.length && <p className="rail-empty">当前批次暂无操作记录</p>}</div></section></aside></div></div>;
}
function VideoDetail({
  daren,
  user,
  batch,
  onBack
}) {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [platformFilter, setPlatformFilter] = useState(undefined);
  const [violation, setViolation] = useState(undefined);
  const [compliance, setCompliance] = useState(undefined);
  const [titleInput, setTitleInput] = useState('');
  const [titleSearch, setTitleSearch] = useState('');
  const [editingKey, setEditingKey] = useState('');
  const [pendingScreenshots, setPendingScreenshots] = useState({});
  const [editableCols, setEditableCols] = useState([]);
  const [anomalySummary, setAnomalySummary] = useState({
    anomalyCount: 0,
    submittedAnomalyCount: 0
  });
  const [anomalyTarget, setAnomalyTarget] = useState(null);
  const [anomalyFields, setAnomalyFields] = useState([]);
  const [anomalySaving, setAnomalySaving] = useState(false);
  const [appealTarget, setAppealTarget] = useState(null);
  const [appealSlots, setAppealSlots] = useState([]);
  const [appealLoading, setAppealLoading] = useState(false);
  const [appealSaving, setAppealSaving] = useState(false);
  const [form] = Form.useForm();
  const [confirmationStatus, setConfirmationStatus] = useState(daren.confirmation_status || '待确认');
  const requestRef = useRef(null);
  const pendingScreenshotsRef = useRef({});
  const videoSectionRef = useRef(null);
  const isAdmin = user.role === 'admin';
  const isReadOnly = batch?.status === 'history';
  const detailItems = [['全网昵称', daren.nickname], ['机构名称', daren.organization], ['内容类型', daren.content_type], ['达人分类', daren.category], ['平台', daren.platform], ['平台昵称', daren.platform_nickname], ['账号', daren.account], ['粉丝数', (daren.followers || 0).toLocaleString()], ['总播放量', (daren.total_plays || 0).toLocaleString()], ['确认状态', confirmationStatus]];
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
      setAnomalySummary({
        anomalyCount: 0,
        submittedAnomalyCount: 0
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
      if (platformFilter) params.set('platform', platformFilter);
      if (violation) params.set('violation', violation);
      if (compliance) params.set('compliance', compliance);
      if (titleSearch) params.set('title', titleSearch);
      const res = await api.get('/api/darens/' + daren.id + '/videos?' + params.toString(), {
        signal: controller.signal
      });
      const payload = Array.isArray(res) ? {
        rows: res,
        total: res.length
      } : res;
      setData(payload.rows || []);
      setTotal(payload.total || 0);
      setAnomalySummary(payload.anomalySummary || {
        anomalyCount: 0,
        submittedAnomalyCount: 0
      });
    } catch (e) {
      if (e.name !== 'AbortError') message.error('加载失败');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [platformFilter, violation, compliance, titleSearch, page, pageSize, daren.id, batch?.id]);
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  useEffect(() => {
    api.get('/api/settings/editable-columns').then(res => {
      if (res.columns) setEditableCols(res.columns);
    }).catch(() => {});
  }, []);
  useEffect(() => () => {
    Object.values(pendingScreenshotsRef.current).forEach(({
      previewUrl
    }) => URL.revokeObjectURL(previewUrl));
  }, []);
  const submitConfirmation = async status => {
    try {
      const res = await api.put('/api/darens/' + daren.id + '/confirmation', {
        status
      });
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
  const clearPendingScreenshots = () => {
    Object.values(pendingScreenshotsRef.current).forEach(({
      previewUrl
    }) => URL.revokeObjectURL(previewUrl));
    pendingScreenshotsRef.current = {};
    setPendingScreenshots({});
  };
  const stageScreenshot = (key, file) => {
    setPendingScreenshots(current => {
      if (current[key]) URL.revokeObjectURL(current[key].previewUrl);
      const next = {
        ...current,
        [key]: {
          file,
          previewUrl: URL.createObjectURL(file)
        }
      };
      pendingScreenshotsRef.current = next;
      return next;
    });
    return false;
  };
  const beginEditing = record => {
    clearPendingScreenshots();
    setEditingKey(record.id);
    form.setFieldsValue(record);
  };
  const cancelEditing = () => {
    clearPendingScreenshots();
    form.resetFields();
    setEditingKey('');
  };
  const openAnomalyMarker = record => {
    let anomalies = {};
    try {
      anomalies = JSON.parse(record.anomaly_data || '{}');
    } catch {}
    setAnomalyTarget(record);
    setAnomalyFields(SCREENSHOT_ANOMALY_FIELDS.filter(({
      key
    }) => anomalies[key]).map(({
      key
    }) => key));
  };
  const saveAnomalyMarkers = async () => {
    if (!anomalyTarget) return;
    setAnomalySaving(true);
    try {
      const res = await api.put('/api/videos/' + anomalyTarget.id + '/anomaly-markers', {
        fields: anomalyFields
      });
      if (!res.ok) return message.error(res.error || '异常标记保存失败');
      setAnomalyTarget(null);
      await fetchData();
      message.success('异常标记已保存');
    } catch (e) {
      message.error('异常标记保存失败');
    } finally {
      setAnomalySaving(false);
    }
  };
  const clearAppealPreviews = (slots = appealSlots) => {
    slots.forEach(slot => {
      if (slot.previewUrl) URL.revokeObjectURL(slot.previewUrl);
    });
  };
  const closeAppeal = () => {
    clearAppealPreviews();
    setAppealTarget(null);
    setAppealSlots([]);
  };
  const openAppeal = async record => {
    clearAppealPreviews();
    setAppealTarget(record);
    setAppealLoading(true);
    try {
      const res = await api.get('/api/videos/' + record.id + '/appeals');
      if (res.error) throw new Error(res.error);
      const existing = new Map((res.appeals || []).map(item => [Number(item.group_no), item]));
      setAppealSlots(Array.from({
        length: 3
      }, (_, index) => ({
        group_no: index + 1,
        appeal_text: existing.get(index + 1)?.appeal_text || '',
        image_path: existing.get(index + 1)?.image_path || null,
        file: null,
        previewUrl: null,
        removeImage: false
      })));
    } catch (error) {
      message.error(error.message || '申诉加载失败');
      setAppealTarget(null);
    } finally {
      setAppealLoading(false);
    }
  };
  const updateAppealSlot = (groupNo, patch) => {
    setAppealSlots(slots => slots.map(slot => slot.group_no === groupNo ? {
      ...slot,
      ...patch
    } : slot));
  };
  const stageAppealImage = (groupNo, file) => {
    const current = appealSlots.find(slot => slot.group_no === groupNo);
    if (current?.previewUrl) URL.revokeObjectURL(current.previewUrl);
    updateAppealSlot(groupNo, {
      file,
      previewUrl: URL.createObjectURL(file),
      removeImage: false
    });
    return false;
  };
  const removeAppealImage = slot => {
    if (slot.previewUrl) URL.revokeObjectURL(slot.previewUrl);
    updateAppealSlot(slot.group_no, {
      file: null,
      previewUrl: null,
      removeImage: true
    });
  };
  const saveAppeals = async () => {
    if (!appealTarget) return;
    setAppealSaving(true);
    try {
      const fields = {};
      appealSlots.forEach(slot => {
        fields[`appeal_text_${slot.group_no}`] = slot.appeal_text || '';
        if (slot.file) fields[`appeal_image_${slot.group_no}`] = slot.file;
        if (slot.removeImage) fields[`remove_image_${slot.group_no}`] = '1';
      });
      const res = await api.upload('/api/videos/' + appealTarget.id + '/appeals', null, fields);
      if (!res.ok) throw new Error(res.error || '申诉保存失败');
      const changed = res.changed;
      closeAppeal();
      await fetchData();
      message.success('申诉已保存');
      if (!isAdmin && changed) confirmModification();
    } catch (error) {
      message.error(error.message || '申诉保存失败');
    } finally {
      setAppealSaving(false);
    }
  };
  const save = async videoId => {
    try {
      const row = await form.validateFields();
      const original = data.find(d => d.id === videoId);
      const changes = {};
      const pendingUploads = Object.entries(pendingScreenshots);
      Object.keys(row).forEach(key => {
        if (row[key] !== undefined && row[key] !== original[key]) {
          changes[key] = row[key];
        }
      });
      if (Object.keys(changes).length === 0 && pendingUploads.length === 0) {
        cancelEditing();
        return;
      }
      let savedFieldChanges = 0;
      if (Object.keys(changes).length > 0) {
        const res = await api.put('/api/videos/' + videoId, changes);
        if (!res.ok) return message.error(res.error || '保存失败');
        savedFieldChanges = res.changes?.length || 0;
      }
      for (const [key, pending] of pendingUploads) {
        const res = await api.upload('/api/upload/' + videoId + '/' + key, pending.file);
        if (!res.ok) throw new Error(res.error || '截图上传失败');
      }
      message.success('保存成功');
      clearPendingScreenshots();
      setEditingKey('');
      await fetchData();
      if (!isAdmin && (savedFieldChanges > 0 || pendingUploads.length > 0)) confirmModification();
    } catch (e) {
      message.error(e.message || '保存失败');
    }
  };
  const renderScreenshot = (record, key, label) => {
    const canUpload = !isReadOnly && editingKey === record.id && (isAdmin || editableCols.includes(key));
    const pending = canUpload ? pendingScreenshots[key] : null;
    const screenshotUrl = pending?.previewUrl || record[key];
    const content = screenshotUrl ? <div className="screenshot-preview"><Image src={screenshotUrl} width={60} height={60} preview={!canUpload} style={{
        objectFit: 'cover'
      }} />{pending && <span className="screenshot-pending-label">待保存</span>}</div> : <div style={{
      width: 60,
      height: 60,
      border: '1px dashed var(--border-em)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      fontSize: 11,
      color: 'var(--ink-muted)',
      borderRadius: 4
    }}>{label}</div>;
    return <Tooltip title={pending ? `${label}（待保存）` : label}>{canUpload ? <Upload beforeUpload={file => stageScreenshot(key, file)} showUploadList={false} accept="image/*">{content}</Upload> : record[key] ? content : '-'}</Tooltip>;
  };
  const statusOptions = {
    violation_status: [{
      label: '未违规',
      value: '未违规'
    }, {
      label: '违规',
      value: '违规'
    }],
    compliance_status: [{
      label: '不合规',
      value: '不合规'
    }, {
      label: '合规',
      value: '合规'
    }]
  };
  const EditableCell = ({
    title,
    dataIndex,
    children,
    editable,
    record,
    ...rest
  }) => {
    if (!editable || editingKey !== record.id) return <td {...rest}>{children}</td>;
    const inputNode = statusOptions[dataIndex] ? <Select size="small" options={statusOptions[dataIndex]} /> : dataIndex === 'publish_time' ? <Input size="small" placeholder="YYYY-MM-DD" /> : <Input size="small" />;
    return <td {...rest}><Form.Item name={dataIndex} style={{
        margin: 0
      }}>{inputNode}</Form.Item></td>;
  };
  const platformTag = p => {
    if (p === '抖音') return <Tag color="red">抖音</Tag>;
    if (p === '快手') return <Tag color="orange">快手</Tag>;
    if (p === 'B站') return <Tag color="blue">B站</Tag>;
    return p || '-';
  };
  const columns = [{
    title: '平台',
    dataIndex: 'platform',
    width: 65,
    render: platformTag
  }, {
    title: '是否主平台',
    dataIndex: 'is_main_platform',
    width: 90,
    render: value => value || '-'
  }, {
    title: '视频标题',
    dataIndex: 'title',
    width: 200,
    ellipsis: true,
    editable: true,
    render: textTooltip
  }, {
    title: '作品标签',
    dataIndex: 'tags',
    width: 120,
    ellipsis: true,
    editable: true,
    render: textTooltip
  }, {
    title: '内容链接',
    dataIndex: 'content_url',
    width: 70,
    render: v => v ? <a className="data-link" href={v} target="_blank" rel="noreferrer">查看</a> : '-'
  }, {
    title: '时长',
    dataIndex: 'duration',
    width: 65,
    editable: true
  }, {
    title: '发布时间',
    dataIndex: 'publish_time',
    width: 105,
    editable: true
  }, {
    title: 'DA播放',
    dataIndex: 'da_plays',
    width: 85,
    render: v => (v || 0).toLocaleString(),
    editable: true
  }, {
    title: '播放截图',
    key: 'screenshot_plays',
    dataIndex: 'screenshot_plays',
    width: 80,
    render: (_, record) => renderScreenshot(record, 'screenshot_plays', '播放')
  }, {
    title: 'DA点赞',
    dataIndex: 'da_likes',
    width: 75,
    render: v => (v || 0).toLocaleString(),
    editable: true
  }, {
    title: '点赞截图',
    key: 'screenshot_likes',
    dataIndex: 'screenshot_likes',
    width: 80,
    render: (_, record) => renderScreenshot(record, 'screenshot_likes', '点赞')
  }, {
    title: '7日播放',
    dataIndex: 'da_7d_plays',
    width: 85,
    render: v => (v || 0).toLocaleString(),
    editable: true
  }, {
    title: '7日播放截图',
    key: 'screenshot_7d_plays',
    dataIndex: 'screenshot_7d_plays',
    width: 95,
    render: (_, record) => renderScreenshot(record, 'screenshot_7d_plays', '7日播放')
  }, {
    title: '7日点赞',
    dataIndex: 'da_7d_likes',
    width: 75,
    render: v => (v || 0).toLocaleString(),
    editable: true
  }, {
    title: '7日点赞截图',
    key: 'screenshot_7d_likes',
    dataIndex: 'screenshot_7d_likes',
    width: 95,
    render: (_, record) => renderScreenshot(record, 'screenshot_7d_likes', '7日点赞')
  }, {
    title: '评论',
    dataIndex: 'comments',
    width: 65,
    editable: true
  }, {
    title: '收藏',
    dataIndex: 'saves',
    width: 65,
    editable: true
  }, {
    title: '转发',
    dataIndex: 'shares',
    width: 65,
    editable: true
  }, {
    title: '违规',
    dataIndex: 'violation_status',
    width: 65,
    editable: true,
    render: v => v === '违规' ? <Tag color="red">违规</Tag> : <Tag color="green">未违规</Tag>
  }, {
    title: '违规描述',
    dataIndex: 'violation_desc',
    width: 130,
    ellipsis: true,
    editable: true,
    render: textTooltip
  }, {
    title: '合规',
    dataIndex: 'compliance_status',
    width: 65,
    editable: true,
    render: v => v === '合规' ? <Tag color="green">合规</Tag> : <Tag color="orange">不合规</Tag>
  }, {
    title: '合规描述',
    dataIndex: 'compliance_desc',
    width: 130,
    ellipsis: true,
    editable: true,
    render: textTooltip
  }, {
    title: '节点',
    dataIndex: 'is_node',
    width: 60,
    editable: true
  }, {
    title: '节点名称',
    dataIndex: 'node_name',
    width: 110,
    ellipsis: true,
    editable: true,
    render: textTooltip
  }, {
    title: '爆款',
    dataIndex: 'is_hot',
    width: 60,
    editable: true
  }, {
    title: '操作',
    key: 'actions',
    width: 200,
    fixed: 'right',
    render: (_, record) => {
      if (editingKey === record.id) {
        return <Space><Button size="small" type="primary" onClick={() => save(record.id)}>保存</Button><Button size="small" onClick={cancelEditing}>取消</Button></Space>;
      }
      const canEdit = !isReadOnly && (isAdmin || editableCols.length > 0);
      return !isReadOnly ? <Space size={4}>{canEdit && <Button size="small" onClick={() => beginEditing(record)}>编辑</Button>}<Button size="small" onClick={() => openAppeal(record)}>申诉</Button>{isAdmin && <Button size="small" onClick={() => openAnomalyMarker(record)}>异常</Button>}</Space> : null;
    }
  }];
  const anomalyMap = useMemo(() => {
    const map = new Map();
    for (const record of data) {
      if (!record.anomaly_data) continue;
      try {
        map.set(record.id, new Set(Object.keys(JSON.parse(record.anomaly_data))));
      } catch {}
    }
    return map;
  }, [data]);
  const isAnomaly = (record, key) => anomalyMap.get(record.id)?.has(key) || false;
  const mergedColumns = columns.map(col => ({
    ...col,
    onCell: record => ({
      record,
      dataIndex: col.dataIndex,
      editable: col.editable && (isAdmin || editableCols.includes(col.dataIndex)),
      className: isAnomaly(record, col.dataIndex) ? 'cell-anomaly' : undefined
    })
  }));
  const handlePageSizeChange = (_, nextPageSize) => {
    setPage(1);
    setPageSize(nextPageSize);
  };
  const creatorStatusHint = confirmationStatus === '已确认' ? '本期数据已确认，无需继续操作。' : confirmationStatus === '已提交申诉' ? '申诉已经提交，可在我的记录中查看处理进度。' : '请核对达人信息和视频数据，确认无误后完成本期核对。';
  return <React.Fragment><div className={isAdmin ? 'video-detail-header' : 'creator-page-header'}>{isAdmin && <Button onClick={onBack}>← 返回</Button>}<div><h3>{isAdmin ? `${daren.nickname} — 视频明细` : '达人数据'}</h3>{!isAdmin && <p>请核对本期达人资料与视频数据；如发现问题，请在对应视频中提交申诉。</p>}</div></div><div className={isAdmin ? 'admin-video-layout' : 'creator-review-layout'}><main className="creator-data-main"><Card title={isAdmin ? '达人详情' : '达人信息'} className="daren-detail-card creator-profile-card" size="small"><div className="daren-detail-grid">{detailItems.filter(([label]) => isAdmin || label !== '确认状态').map(([label, value]) => <div className="daren-detail-item" key={label}><span>{label}</span><strong>{value || '-'}</strong></div>)}<div className="daren-detail-item"><span>主页链接</span><strong>{daren.homepage_url ? <a href={daren.homepage_url} target="_blank" rel="noreferrer">查看主页</a> : '-'}</strong></div></div></Card>{isAdmin && <div className="anomaly-summary-card status-rail" aria-label="视频异常统计"><div className="anomaly-summary-item anomaly"><span>异常数量</span><strong>{anomalySummary.anomalyCount}</strong></div><div className="anomaly-summary-item submitted"><span>已提交异常数量</span><strong>{anomalySummary.submittedAnomalyCount}</strong></div></div>}{!isAdmin && <div className="creator-video-heading" ref={videoSectionRef}><div><span>视频明细</span><small>共 {total} 条记录</small></div><div className="creator-anomaly-inline"><span>异常 {anomalySummary.anomalyCount}</span><span>已申诉 {anomalySummary.submittedAnomalyCount}</span></div></div>}<div className="toolbar"><Select placeholder="平台" allowClear style={{
            width: 110
          }} value={platformFilter} onChange={value => {
            setPage(1);
            setPlatformFilter(value);
          }} options={[{
            label: '抖音',
            value: '抖音'
          }, {
            label: '快手',
            value: '快手'
          }, {
            label: 'B站',
            value: 'B站'
          }]} /><Input.Search placeholder="搜索标题" value={titleInput} onChange={e => setTitleInput(e.target.value)} onSearch={() => {
            setPage(1);
            setTitleSearch(titleInput);
          }} style={{
            width: 180
          }} allowClear /><Select placeholder="违规" allowClear style={{
            width: 110
          }} value={violation} onChange={value => {
            setPage(1);
            setViolation(value);
          }} options={[{
            label: '全部',
            value: 'all'
          }, {
            label: '违规',
            value: '违规'
          }, {
            label: '未违规',
            value: '未违规'
          }]} /><Select placeholder="合规" allowClear style={{
            width: 110
          }} value={compliance} onChange={value => {
            setPage(1);
            setCompliance(value);
          }} options={[{
            label: '全部',
            value: 'all'
          }, {
            label: '合规',
            value: '合规'
          }, {
            label: '不合规',
            value: '不合规'
          }]} /></div><Form form={form} component={false}><Table columns={mergedColumns} dataSource={data} rowKey="id" loading={loading} locale={TABLE_LOCALE} scroll={{
            x: 2600
          }} pagination={{
            total,
            current: page,
            pageSize,
            showSizeChanger: true,
            pageSizeOptions: PAGE_SIZE_OPTIONS,
            onChange: setPage,
            onShowSizeChange: handlePageSizeChange
          }} bordered size="small" components={{
            body: {
              cell: EditableCell
            }
          }} /></Form></main>{!isAdmin && <aside className="creator-review-rail" aria-label="本期核对任务"><div className="creator-review-label">本期核对任务</div><div className="creator-review-current"><span>当前状态</span>{confirmationStatusTag(confirmationStatus)}</div><p>{creatorStatusHint}</p><div className="creator-review-actions"><Button type="primary" block disabled={isReadOnly || confirmationStatus !== '待确认'} onClick={() => submitConfirmation('已确认')}>确认数据无误</Button><Button block disabled={isReadOnly} onClick={() => videoSectionRef.current?.scrollIntoView({
            block: 'start'
          })}>查看异常并申诉</Button></div><div className="creator-review-summary"><div><span>异常视频</span><strong>{anomalySummary.anomalyCount}</strong></div><div><span>已提交申诉</span><strong>{anomalySummary.submittedAnomalyCount}</strong></div></div></aside>}</div><Drawer className="anomaly-marker-drawer" title="标记截图异常" open={Boolean(anomalyTarget)} onClose={() => setAnomalyTarget(null)} width="min(380px, 100vw)" destroyOnClose footer={<Space><Button onClick={() => setAnomalyTarget(null)}>取消</Button><Button type="primary" loading={anomalySaving} onClick={saveAnomalyMarkers}>确认</Button></Space>}><p className="anomaly-marker-hint">请选择需要补充或核查的截图字段</p>{SCREENSHOT_ANOMALY_FIELDS.map(({
        key,
        label
      }) => {
        const checked = anomalyFields.includes(key);
        return <div className="anomaly-marker-field" key={key}><Checkbox checked={checked} onChange={event => setAnomalyFields(fields => event.target.checked ? [...fields, key] : fields.filter(field => field !== key))}>{label}</Checkbox>{anomalyTarget?.[key] ? <Image src={anomalyTarget[key]} width={64} height={64} style={{
            objectFit: 'cover'
          }} /> : <Tag>未上传</Tag>}</div>;
      })}</Drawer><Drawer className="appeal-drawer" title="视频申诉" open={Boolean(appealTarget)} onClose={closeAppeal} width="min(520px, 100vw)" destroyOnClose footer={<Space><Button onClick={closeAppeal}>取消</Button><Button type="primary" loading={appealSaving} disabled={appealLoading} onClick={saveAppeals}>保存申诉</Button></Space>}><p className="appeal-drawer-hint">每条视频最多提交三组申诉文字和图片，保存后统一提交。</p>{appealLoading ? <div className="appeal-loading">正在加载…</div> : Array.from({
        length: 3
      }, (_, index) => {
        const slot = appealSlots[index] || {
          group_no: index + 1,
          appeal_text: ''
        };
        const imageUrl = slot.previewUrl || !slot.removeImage && slot.image_path;
        return <section className="appeal-slot" key={slot.group_no}><div className="appeal-slot-heading"><strong>申诉 {slot.group_no}</strong><span>文字 + 1 张图片</span></div><Input.TextArea value={slot.appeal_text} onChange={event => updateAppealSlot(slot.group_no, {
            appeal_text: event.target.value
          })} placeholder="填写申诉说明" rows={3} maxLength={1000} showCount /><div className="appeal-image-row">{imageUrl ? <Image src={imageUrl} width={88} height={88} style={{
              objectFit: 'cover'
            }} /> : <div className="appeal-image-empty">暂无图片</div>}<Space direction="vertical" size={6}><Upload beforeUpload={file => stageAppealImage(slot.group_no, file)} showUploadList={false} accept="image/*"><Button size="small">{imageUrl ? '替换图片' : '选择图片'}</Button></Upload>{imageUrl && <Button size="small" type="text" danger onClick={() => removeAppealImage(slot)}>移除图片</Button>}{slot.file && <span className="appeal-pending-label">待保存</span>}</Space></div></section>;
      })}</Drawer></React.Fragment>;
}
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
function SettingsPage({
  onBack
}) {
  const [checked, setChecked] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    api.get('/api/settings/editable-columns').then(res => setChecked(res.columns || []));
  }, []);
  const save = async () => {
    setLoading(true);
    const res = await api.put('/api/settings/editable-columns', {
      columns: checked
    });
    setLoading(false);
    if (res.ok) message.success('权限设置已保存');
  };
  return <React.Fragment><div className="video-detail-header"><Button onClick={onBack}>← 返回</Button><h3>可编辑列权限设置</h3></div><Card title="普通用户可编辑权限" className="settings-card"><Checkbox.Group value={checked} onChange={setChecked} className="editable-column-groups">{EDITABLE_COLUMN_GROUPS.map(group => <section className="editable-column-group" key={group.title}><h4>{group.title}</h4><div className="editable-column-options">{group.keys.map(key => {
              const column = allColumns.find(item => item.key === key);
              return <Checkbox key={key} value={key}>{column.label}</Checkbox>;
            })}</div></section>)}</Checkbox.Group><div className="settings-actions"><Button type="primary" onClick={save} loading={loading}>保存设置</Button></div></Card></React.Fragment>;
}
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

// ── App ──

function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('home');
  const [selectedDaren, setSelectedDaren] = useState(null);
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchesLoaded, setBatchesLoaded] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    api.get('/api/me').then(res => {
      if (res.user) setUser(res.user);
    }).catch(() => {}).finally(() => setChecking(false));
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
  }, [user, selectedBatch]);
  useEffect(() => {
    if (page !== 'home' || !batchesLoaded) return;
    if (selectedBatch) return void enterDataCheck();
    setActiveWorkspace('data');
    setPage(user.role === 'admin' ? 'batches' : 'empty');
  }, [page, batchesLoaded, selectedBatch, user, enterDataCheck]);
  const enterFeeCheck = useCallback(() => {
    message.info('费用核对暂未开启');
  }, []);
  const enterAccountManagement = useCallback(() => {
    setActiveWorkspace('basic');
    setPage('accounts');
  }, []);
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
    setPage(key);
  }, [enterDataCheck]);
  if (checking) return null;
  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }
  if (Number(user.must_change_password)) {
    return <PasswordChangePage user={user} onChanged={setUser} />;
  }
  const renderPage = () => {
    switch (page) {
      case 'home':
        return null;
      case 'videos':
        return selectedDaren ? <VideoDetail daren={selectedDaren} user={user} batch={selectedBatch} onBack={goBack} /> : <Card>本期暂无数据</Card>;
      case 'settings':
        return <SettingsPage onBack={goBack} />;
      case 'audit':
        return <AuditPage onBack={goBack} />;
      case 'accounts':
        return <AccountManagementPage batches={batches} onBack={goHome} />;
      case 'batches':
        return <BatchManagerPage batches={batches} onRefresh={loadBatches} onSelectBatch={chooseBatch} onBack={goHome} />;
      case 'batch-switch':
        return <BatchSwitchPage batches={batches} selectedBatch={selectedBatch} onSelectBatch={chooseBatch} onBack={goHome} />;
      case 'empty':
        return <Card>本期暂无数据</Card>;
      default:
        return <DarenList user={user} batch={selectedBatch} batches={batches} onSelectBatch={chooseBatch} onViewVideos={navigateToVideos} onOpenAudit={() => setPage('audit')} onOpenBatches={() => {
          setActiveWorkspace('data');
          setPage('batches');
        }} onOpenSettings={() => {
          setActiveWorkspace('data');
          setPage('settings');
        }} />;
    }
  };
  return <Layout style={{
    minHeight: '100vh',
    background: 'var(--paper)'
  }}><div className="workspace-shell"><WorkspaceSidebar user={user} page={page} activeWorkspace={activeWorkspace} onDataCheck={enterDataCheck} onFeeCheck={enterFeeCheck} onAccounts={enterAccountManagement} onNavigate={navigatePrimary} onPassword={() => setPasswordModalOpen(true)} onLogout={handleLogout} /><main className="workspace-main"><MobileWorkspaceHeader user={user} onPassword={() => setPasswordModalOpen(true)} onLogout={handleLogout} /><div className="app-content">{renderPage()}</div></main></div><PasswordChangeModal open={passwordModalOpen} user={user} onClose={() => setPasswordModalOpen(false)} onChanged={nextUser => {
      setUser(nextUser);
      setPasswordModalOpen(false);
    }} /></Layout>;
}

// ── Render ──

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
