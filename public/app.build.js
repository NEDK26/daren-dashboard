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
function BatchPicker({
  batches,
  value,
  onChange
}) {
  const selectable = batches.filter(batch => batch.status !== 'draft');
  if (!selectable.length) return /*#__PURE__*/React.createElement("span", {
    className: "batch-picker-empty"
  }, "暂无批次");
  return /*#__PURE__*/React.createElement(Select, {
    className: "batch-picker",
    value: value?.id,
    options: selectable.map(batch => ({
      value: batch.id,
      label: batch.name
    })),
    onChange: id => onChange(selectable.find(batch => batch.id === id))
  });
}
function BatchSwitchPage({
  batches,
  selectedBatch,
  onSelectBatch,
  onBack
}) {
  const selectable = batches.filter(batch => batch.status !== 'draft');
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "video-detail-header"
  }, /*#__PURE__*/React.createElement(Button, {
    onClick: onBack
  }, "← 返回"), /*#__PURE__*/React.createElement("h3", null, "切换批次")), /*#__PURE__*/React.createElement("div", {
    className: "batch-switch-list"
  }, selectable.map(batch => /*#__PURE__*/React.createElement(Card, {
    key: batch.id,
    className: 'batch-switch-card ' + (selectedBatch?.id === batch.id ? 'active' : ''),
    hoverable: true,
    onClick: () => onSelectBatch(batch)
  }, /*#__PURE__*/React.createElement("strong", null, batch.name), /*#__PURE__*/React.createElement("span", null, batch.status === 'current' ? '当前批次' : '历史批次'))), !selectable.length && /*#__PURE__*/React.createElement(Card, null, "暂无可用批次")));
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
  return /*#__PURE__*/React.createElement("nav", {
    className: placement === 'desktop' ? 'desktop-nav' : 'mobile-nav'
  }, items.map(item => /*#__PURE__*/React.createElement(Button, {
    key: item.key,
    type: "text",
    className: activeKey === item.key ? 'active' : '',
    onClick: () => onNavigate(item.key)
  }, /*#__PURE__*/React.createElement("span", null, item.icon), item.label)));
}
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
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "video-detail-header"
  }, /*#__PURE__*/React.createElement(Button, {
    onClick: onBack
  }, "← 返回"), /*#__PURE__*/React.createElement("h3", null, "批次管理")), /*#__PURE__*/React.createElement(Card, {
    title: "创建批次",
    className: "batch-manager-card"
  }, /*#__PURE__*/React.createElement(Form, {
    layout: "inline",
    onFinish: createBatch,
    initialValues: {
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1
    }
  }, /*#__PURE__*/React.createElement(Form.Item, {
    label: "年份",
    name: "year",
    rules: [{
      required: true,
      message: '请选择年份'
    }]
  }, /*#__PURE__*/React.createElement(InputNumber, {
    min: 2000,
    max: 2100
  })), /*#__PURE__*/React.createElement(Form.Item, {
    label: "月份",
    name: "month",
    rules: [{
      required: true,
      message: '请选择月份'
    }]
  }, /*#__PURE__*/React.createElement(InputNumber, {
    min: 1,
    max: 12
  })), /*#__PURE__*/React.createElement(Form.Item, {
    label: "批次标题",
    name: "title",
    rules: [{
      required: true,
      whitespace: true,
      message: '请输入自定义标题'
    }]
  }, /*#__PURE__*/React.createElement(Input, {
    placeholder: "如：数据核对"
  })), /*#__PURE__*/React.createElement(Form.Item, null, /*#__PURE__*/React.createElement(Button, {
    type: "primary",
    htmlType: "submit",
    loading: creating,
    disabled: Boolean(draft)
  }, "创建批次")))), draft && /*#__PURE__*/React.createElement(Card, {
    title: "草稿批次",
    className: "batch-manager-card",
    extra: /*#__PURE__*/React.createElement(Tag, {
      color: "blue"
    }, draft.name)
  }, /*#__PURE__*/React.createElement(Space, {
    wrap: true
  }, /*#__PURE__*/React.createElement(Upload, {
    beforeUpload: importDraft,
    showUploadList: false,
    accept: ".xlsx"
  }, /*#__PURE__*/React.createElement(Button, {
    type: "primary",
    loading: importing
  }, "导入 Excel")), /*#__PURE__*/React.createElement(Button, {
    disabled: !draft.imported_at || importing || !draft.pending_accounts,
    onClick: () => initializeAccounts(draft)
  }, "初始化账号（", draft.pending_accounts || 0, "）"), /*#__PURE__*/React.createElement(Button, {
    type: "primary",
    disabled: !draft.imported_at || importing,
    onClick: publishDraft
  }, "发布批次"), /*#__PURE__*/React.createElement(Button, {
    danger: true,
    loading: deleting,
    onClick: deleteDraft
  }, "删除草稿"))), /*#__PURE__*/React.createElement(Table, {
    className: "batch-manager-table",
    rowKey: "id",
    dataSource: batches.filter(batch => batch.status !== 'draft'),
    pagination: false,
    columns: [{
      title: '批次名称',
      dataIndex: 'name'
    }, {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: status => /*#__PURE__*/React.createElement(Tag, {
        color: status === 'current' ? 'green' : 'default'
      }, status === 'current' ? '已发布' : '历史')
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
      render: (_, record) => record.status === 'current' ? /*#__PURE__*/React.createElement(Space, null, /*#__PURE__*/React.createElement(Button, {
        size: "small",
        disabled: !record.pending_accounts,
        onClick: () => initializeAccounts(record)
      }, "初始化账号"), /*#__PURE__*/React.createElement(Button, {
        size: "small",
        onClick: () => revokePublished(record)
      }, "撤销发布")) : null
    }]
  }), /*#__PURE__*/React.createElement(Modal, {
    open: importing,
    footer: null,
    closable: false,
    maskClosable: false,
    keyboard: false,
    centered: true
  }, /*#__PURE__*/React.createElement("div", {
    className: "import-progress-content"
  }, /*#__PURE__*/React.createElement("div", {
    className: "import-progress-spinner",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("div", {
    className: "import-progress-copy"
  }, /*#__PURE__*/React.createElement("div", {
    className: "import-progress-title"
  }, "正在导入 Excel"), /*#__PURE__*/React.createElement("div", {
    className: "import-progress-stage"
  }, importStages[importStage]), /*#__PURE__*/React.createElement("div", {
    className: "import-progress-dots",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", null))))));
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
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "video-detail-header"
  }, /*#__PURE__*/React.createElement(Button, {
    onClick: onBack
  }, "← 返回"), /*#__PURE__*/React.createElement("h3", null, "达人账号管理")), /*#__PURE__*/React.createElement(Card, {
    className: "account-management-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "toolbar"
  }, /*#__PURE__*/React.createElement(Select, {
    style: {
      width: 230
    },
    value: batchId,
    allowClear: true,
    placeholder: "全部批次",
    onChange: setBatchId,
    options: batches.map(batch => ({
      value: batch.id,
      label: batch.name
    }))
  }), /*#__PURE__*/React.createElement(Input.Search, {
    style: {
      width: 200
    },
    placeholder: "搜索达人昵称",
    allowClear: true,
    value: search,
    onChange: event => setSearch(event.target.value),
    onSearch: setSearch
  }), /*#__PURE__*/React.createElement("div", {
    className: "spacer"
  }), /*#__PURE__*/React.createElement(Button, {
    onClick: () => resetBatch(false),
    disabled: !batchId
  }, "批量重置当前批次"), /*#__PURE__*/React.createElement(Button, {
    danger: true,
    onClick: () => resetBatch(true)
  }, "批量重置全部账号")), /*#__PURE__*/React.createElement(Table, {
    rowKey: "id",
    loading: loading,
    dataSource: rows,
    pagination: {
      pageSize: 20
    },
    columns: [{
      title: '达人昵称',
      dataIndex: 'display_name'
    }, {
      title: '账号状态',
      dataIndex: 'status',
      render: status => /*#__PURE__*/React.createElement(Tag, {
        color: status === '正常' ? 'green' : status === '待首次改密' ? 'orange' : 'default'
      }, status)
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
      render: (_, record) => /*#__PURE__*/React.createElement(Button, {
        size: "small",
        onClick: () => resetOne(record)
      }, "重置并下载")
    }],
    locale: TABLE_LOCALE,
    scroll: {
      x: 900
    }
  })));
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
    const content = screenshotUrl ? /*#__PURE__*/React.createElement("div", {
      className: "screenshot-preview"
    }, /*#__PURE__*/React.createElement(Image, {
      src: screenshotUrl,
      width: 60,
      height: 60,
      preview: !canUpload,
      style: {
        objectFit: 'cover'
      }
    }), pending && /*#__PURE__*/React.createElement("span", {
      className: "screenshot-pending-label"
    }, "待保存")) : /*#__PURE__*/React.createElement("div", {
      style: {
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
      }
    }, label);
    return /*#__PURE__*/React.createElement(Tooltip, {
      title: pending ? `${label}（待保存）` : label
    }, canUpload ? /*#__PURE__*/React.createElement(Upload, {
      beforeUpload: file => stageScreenshot(key, file),
      showUploadList: false,
      accept: "image/*"
    }, content) : record[key] ? content : '-');
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
    if (!editable || editingKey !== record.id) return /*#__PURE__*/React.createElement("td", rest, children);
    const inputNode = statusOptions[dataIndex] ? /*#__PURE__*/React.createElement(Select, {
      size: "small",
      options: statusOptions[dataIndex]
    }) : dataIndex === 'publish_time' ? /*#__PURE__*/React.createElement(Input, {
      size: "small",
      placeholder: "YYYY-MM-DD"
    }) : /*#__PURE__*/React.createElement(Input, {
      size: "small"
    });
    return /*#__PURE__*/React.createElement("td", rest, /*#__PURE__*/React.createElement(Form.Item, {
      name: dataIndex,
      style: {
        margin: 0
      }
    }, inputNode));
  };
  const platformTag = p => {
    if (p === '抖音') return /*#__PURE__*/React.createElement(Tag, {
      color: "red"
    }, "抖音");
    if (p === '快手') return /*#__PURE__*/React.createElement(Tag, {
      color: "orange"
    }, "快手");
    if (p === 'B站') return /*#__PURE__*/React.createElement(Tag, {
      color: "blue"
    }, "B站");
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
    render: v => v ? /*#__PURE__*/React.createElement("a", {
      className: "data-link",
      href: v,
      target: "_blank",
      rel: "noreferrer"
    }, "查看") : '-'
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
    render: v => v === '违规' ? /*#__PURE__*/React.createElement(Tag, {
      color: "red"
    }, "违规") : /*#__PURE__*/React.createElement(Tag, {
      color: "green"
    }, "未违规")
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
    render: v => v === '合规' ? /*#__PURE__*/React.createElement(Tag, {
      color: "green"
    }, "合规") : /*#__PURE__*/React.createElement(Tag, {
      color: "orange"
    }, "不合规")
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
        return /*#__PURE__*/React.createElement(Space, null, /*#__PURE__*/React.createElement(Button, {
          size: "small",
          type: "primary",
          onClick: () => save(record.id)
        }, "保存"), /*#__PURE__*/React.createElement(Button, {
          size: "small",
          onClick: cancelEditing
        }, "取消"));
      }
      const canEdit = !isReadOnly && (isAdmin || editableCols.length > 0);
      return !isReadOnly ? /*#__PURE__*/React.createElement(Space, {
        size: 4
      }, canEdit && /*#__PURE__*/React.createElement(Button, {
        size: "small",
        onClick: () => beginEditing(record)
      }, "编辑"), /*#__PURE__*/React.createElement(Button, {
        size: "small",
        onClick: () => openAppeal(record)
      }, "申诉"), isAdmin && /*#__PURE__*/React.createElement(Button, {
        size: "small",
        onClick: () => openAnomalyMarker(record)
      }, "异常")) : null;
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
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: isAdmin ? 'video-detail-header' : 'creator-page-header'
  }, isAdmin && /*#__PURE__*/React.createElement(Button, {
    onClick: onBack
  }, "← 返回"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", null, isAdmin ? `${daren.nickname} — 视频明细` : '达人数据'), !isAdmin && /*#__PURE__*/React.createElement("p", null, "请核对本期达人资料与视频数据；如发现问题，请在对应视频中提交申诉。"))), /*#__PURE__*/React.createElement("div", {
    className: isAdmin ? 'admin-video-layout' : 'creator-review-layout'
  }, /*#__PURE__*/React.createElement("main", {
    className: "creator-data-main"
  }, /*#__PURE__*/React.createElement(Card, {
    title: isAdmin ? '达人详情' : '达人信息',
    className: "daren-detail-card creator-profile-card",
    size: "small"
  }, /*#__PURE__*/React.createElement("div", {
    className: "daren-detail-grid"
  }, detailItems.filter(([label]) => isAdmin || label !== '确认状态').map(([label, value]) => /*#__PURE__*/React.createElement("div", {
    className: "daren-detail-item",
    key: label
  }, /*#__PURE__*/React.createElement("span", null, label), /*#__PURE__*/React.createElement("strong", null, value || '-'))), /*#__PURE__*/React.createElement("div", {
    className: "daren-detail-item"
  }, /*#__PURE__*/React.createElement("span", null, "主页链接"), /*#__PURE__*/React.createElement("strong", null, daren.homepage_url ? /*#__PURE__*/React.createElement("a", {
    href: daren.homepage_url,
    target: "_blank",
    rel: "noreferrer"
  }, "查看主页") : '-')))), isAdmin && /*#__PURE__*/React.createElement("div", {
    className: "anomaly-summary-card status-rail",
    "aria-label": "视频异常统计"
  }, /*#__PURE__*/React.createElement("div", {
    className: "anomaly-summary-item anomaly"
  }, /*#__PURE__*/React.createElement("span", null, "异常数量"), /*#__PURE__*/React.createElement("strong", null, anomalySummary.anomalyCount)), /*#__PURE__*/React.createElement("div", {
    className: "anomaly-summary-item submitted"
  }, /*#__PURE__*/React.createElement("span", null, "已提交异常数量"), /*#__PURE__*/React.createElement("strong", null, anomalySummary.submittedAnomalyCount))), !isAdmin && /*#__PURE__*/React.createElement("div", {
    className: "creator-video-heading",
    ref: videoSectionRef
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, "视频明细"), /*#__PURE__*/React.createElement("small", null, "共 ", total, " 条记录")), /*#__PURE__*/React.createElement("div", {
    className: "creator-anomaly-inline"
  }, /*#__PURE__*/React.createElement("span", null, "异常 ", anomalySummary.anomalyCount), /*#__PURE__*/React.createElement("span", null, "已申诉 ", anomalySummary.submittedAnomalyCount))), /*#__PURE__*/React.createElement("div", {
    className: "toolbar"
  }, /*#__PURE__*/React.createElement(Select, {
    placeholder: "平台",
    allowClear: true,
    style: {
      width: 110
    },
    value: platformFilter,
    onChange: value => {
      setPage(1);
      setPlatformFilter(value);
    },
    options: [{
      label: '抖音',
      value: '抖音'
    }, {
      label: '快手',
      value: '快手'
    }, {
      label: 'B站',
      value: 'B站'
    }]
  }), /*#__PURE__*/React.createElement(Input.Search, {
    placeholder: "搜索标题",
    value: titleInput,
    onChange: e => setTitleInput(e.target.value),
    onSearch: () => {
      setPage(1);
      setTitleSearch(titleInput);
    },
    style: {
      width: 180
    },
    allowClear: true
  }), /*#__PURE__*/React.createElement(Select, {
    placeholder: "违规",
    allowClear: true,
    style: {
      width: 110
    },
    value: violation,
    onChange: value => {
      setPage(1);
      setViolation(value);
    },
    options: [{
      label: '全部',
      value: 'all'
    }, {
      label: '违规',
      value: '违规'
    }, {
      label: '未违规',
      value: '未违规'
    }]
  }), /*#__PURE__*/React.createElement(Select, {
    placeholder: "合规",
    allowClear: true,
    style: {
      width: 110
    },
    value: compliance,
    onChange: value => {
      setPage(1);
      setCompliance(value);
    },
    options: [{
      label: '全部',
      value: 'all'
    }, {
      label: '合规',
      value: '合规'
    }, {
      label: '不合规',
      value: '不合规'
    }]
  })), /*#__PURE__*/React.createElement(Form, {
    form: form,
    component: false
  }, /*#__PURE__*/React.createElement(Table, {
    columns: mergedColumns,
    dataSource: data,
    rowKey: "id",
    loading: loading,
    locale: TABLE_LOCALE,
    scroll: {
      x: 2600
    },
    pagination: {
      total,
      current: page,
      pageSize,
      showSizeChanger: true,
      pageSizeOptions: PAGE_SIZE_OPTIONS,
      onChange: setPage,
      onShowSizeChange: handlePageSizeChange
    },
    bordered: true,
    size: "small",
    components: {
      body: {
        cell: EditableCell
      }
    }
  }))), !isAdmin && /*#__PURE__*/React.createElement("aside", {
    className: "creator-review-rail",
    "aria-label": "本期核对任务"
  }, /*#__PURE__*/React.createElement("div", {
    className: "creator-review-label"
  }, "本期核对任务"), /*#__PURE__*/React.createElement("div", {
    className: "creator-review-current"
  }, /*#__PURE__*/React.createElement("span", null, "当前状态"), confirmationStatusTag(confirmationStatus)), /*#__PURE__*/React.createElement("p", null, creatorStatusHint), /*#__PURE__*/React.createElement("div", {
    className: "creator-review-actions"
  }, /*#__PURE__*/React.createElement(Button, {
    type: "primary",
    block: true,
    disabled: isReadOnly || confirmationStatus !== '待确认',
    onClick: () => submitConfirmation('已确认')
  }, "确认数据无误"), /*#__PURE__*/React.createElement(Button, {
    block: true,
    disabled: isReadOnly,
    onClick: () => videoSectionRef.current?.scrollIntoView({
      block: 'start'
    })
  }, "查看异常并申诉")), /*#__PURE__*/React.createElement("div", {
    className: "creator-review-summary"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, "异常视频"), /*#__PURE__*/React.createElement("strong", null, anomalySummary.anomalyCount)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, "已提交申诉"), /*#__PURE__*/React.createElement("strong", null, anomalySummary.submittedAnomalyCount))))), /*#__PURE__*/React.createElement(Drawer, {
    className: "anomaly-marker-drawer",
    title: "标记截图异常",
    open: Boolean(anomalyTarget),
    onClose: () => setAnomalyTarget(null),
    width: "min(380px, 100vw)",
    destroyOnClose: true,
    footer: /*#__PURE__*/React.createElement(Space, null, /*#__PURE__*/React.createElement(Button, {
      onClick: () => setAnomalyTarget(null)
    }, "取消"), /*#__PURE__*/React.createElement(Button, {
      type: "primary",
      loading: anomalySaving,
      onClick: saveAnomalyMarkers
    }, "确认"))
  }, /*#__PURE__*/React.createElement("p", {
    className: "anomaly-marker-hint"
  }, "请选择需要补充或核查的截图字段"), SCREENSHOT_ANOMALY_FIELDS.map(({
    key,
    label
  }) => {
    const checked = anomalyFields.includes(key);
    return /*#__PURE__*/React.createElement("div", {
      className: "anomaly-marker-field",
      key: key
    }, /*#__PURE__*/React.createElement(Checkbox, {
      checked: checked,
      onChange: event => setAnomalyFields(fields => event.target.checked ? [...fields, key] : fields.filter(field => field !== key))
    }, label), anomalyTarget?.[key] ? /*#__PURE__*/React.createElement(Image, {
      src: anomalyTarget[key],
      width: 64,
      height: 64,
      style: {
        objectFit: 'cover'
      }
    }) : /*#__PURE__*/React.createElement(Tag, null, "未上传"));
  })), /*#__PURE__*/React.createElement(Drawer, {
    className: "appeal-drawer",
    title: "视频申诉",
    open: Boolean(appealTarget),
    onClose: closeAppeal,
    width: "min(520px, 100vw)",
    destroyOnClose: true,
    footer: /*#__PURE__*/React.createElement(Space, null, /*#__PURE__*/React.createElement(Button, {
      onClick: closeAppeal
    }, "取消"), /*#__PURE__*/React.createElement(Button, {
      type: "primary",
      loading: appealSaving,
      disabled: appealLoading,
      onClick: saveAppeals
    }, "保存申诉"))
  }, /*#__PURE__*/React.createElement("p", {
    className: "appeal-drawer-hint"
  }, "每条视频最多提交三组申诉文字和图片，保存后统一提交。"), appealLoading ? /*#__PURE__*/React.createElement("div", {
    className: "appeal-loading"
  }, "正在加载…") : Array.from({
    length: 3
  }, (_, index) => {
    const slot = appealSlots[index] || {
      group_no: index + 1,
      appeal_text: ''
    };
    const imageUrl = slot.previewUrl || !slot.removeImage && slot.image_path;
    return /*#__PURE__*/React.createElement("section", {
      className: "appeal-slot",
      key: slot.group_no
    }, /*#__PURE__*/React.createElement("div", {
      className: "appeal-slot-heading"
    }, /*#__PURE__*/React.createElement("strong", null, "申诉 ", slot.group_no), /*#__PURE__*/React.createElement("span", null, "文字 + 1 张图片")), /*#__PURE__*/React.createElement(Input.TextArea, {
      value: slot.appeal_text,
      onChange: event => updateAppealSlot(slot.group_no, {
        appeal_text: event.target.value
      }),
      placeholder: "填写申诉说明",
      rows: 3,
      maxLength: 1000,
      showCount: true
    }), /*#__PURE__*/React.createElement("div", {
      className: "appeal-image-row"
    }, imageUrl ? /*#__PURE__*/React.createElement(Image, {
      src: imageUrl,
      width: 88,
      height: 88,
      style: {
        objectFit: 'cover'
      }
    }) : /*#__PURE__*/React.createElement("div", {
      className: "appeal-image-empty"
    }, "暂无图片"), /*#__PURE__*/React.createElement(Space, {
      direction: "vertical",
      size: 6
    }, /*#__PURE__*/React.createElement(Upload, {
      beforeUpload: file => stageAppealImage(slot.group_no, file),
      showUploadList: false,
      accept: "image/*"
    }, /*#__PURE__*/React.createElement(Button, {
      size: "small"
    }, imageUrl ? '替换图片' : '选择图片')), imageUrl && /*#__PURE__*/React.createElement(Button, {
      size: "small",
      type: "text",
      danger: true,
      onClick: () => removeAppealImage(slot)
    }, "移除图片"), slot.file && /*#__PURE__*/React.createElement("span", {
      className: "appeal-pending-label"
    }, "待保存"))));
  })));
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
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "video-detail-header"
  }, /*#__PURE__*/React.createElement(Button, {
    onClick: onBack
  }, "← 返回"), /*#__PURE__*/React.createElement("h3", null, "可编辑列权限设置")), /*#__PURE__*/React.createElement(Card, {
    title: "普通用户可编辑权限",
    className: "settings-card"
  }, /*#__PURE__*/React.createElement(Checkbox.Group, {
    value: checked,
    onChange: setChecked,
    className: "editable-column-groups"
  }, EDITABLE_COLUMN_GROUPS.map(group => /*#__PURE__*/React.createElement("section", {
    className: "editable-column-group",
    key: group.title
  }, /*#__PURE__*/React.createElement("h4", null, group.title), /*#__PURE__*/React.createElement("div", {
    className: "editable-column-options"
  }, group.keys.map(key => {
    const column = allColumns.find(item => item.key === key);
    return /*#__PURE__*/React.createElement(Checkbox, {
      key: key,
      value: key
    }, column.label);
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "settings-actions"
  }, /*#__PURE__*/React.createElement(Button, {
    type: "primary",
    onClick: save,
    loading: loading
  }, "保存设置"))));
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
