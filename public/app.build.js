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
  Modal
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
  upload: (url, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return fetch(url, {
      method: 'POST',
      body: fd
    }).then(r => r.json());
  }
};
const confirmationStatusTag = status => {
  const value = status || '待确认';
  const color = value === '已确认' ? 'green' : value === '已提交申诉' ? 'orange' : 'default';
  return /*#__PURE__*/React.createElement(Tag, {
    color: color
  }, value);
};

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
  return /*#__PURE__*/React.createElement("div", {
    className: "login-page"
  }, /*#__PURE__*/React.createElement(Card, {
    title: "达人数据管理平台",
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
  }, "登录")))));
}
function HomePage({
  onDataCheck
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "workbench-page"
  }, /*#__PURE__*/React.createElement("div", {
    className: "workbench-heading"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "workbench-eyebrow"
  }, "本期工作台"), /*#__PURE__*/React.createElement("h3", null, "请选择要核对的内容"))), /*#__PURE__*/React.createElement("div", {
    className: "workbench-cards"
  }, /*#__PURE__*/React.createElement(Card, {
    className: "workbench-card workbench-card-primary",
    hoverable: true,
    onClick: onDataCheck
  }, /*#__PURE__*/React.createElement("div", {
    className: "workbench-card-icon"
  }, "数"), /*#__PURE__*/React.createElement("div", {
    className: "workbench-card-title"
  }, "本期数据核对"), /*#__PURE__*/React.createElement("div", {
    className: "workbench-card-desc"
  }, "查看和核对本期达人视频数据"), /*#__PURE__*/React.createElement("div", {
    className: "workbench-card-action"
  }, "进入核对 →")), /*#__PURE__*/React.createElement(Card, {
    className: "workbench-card workbench-card-disabled",
    hoverable: true,
    onClick: () => message.info('功能正在开发中')
  }, /*#__PURE__*/React.createElement("div", {
    className: "workbench-card-icon"
  }, "费"), /*#__PURE__*/React.createElement("div", {
    className: "workbench-card-title"
  }, "本期费用核对"), /*#__PURE__*/React.createElement("div", {
    className: "workbench-card-desc"
  }, "费用数据核对功能"), /*#__PURE__*/React.createElement("div", {
    className: "workbench-card-action"
  }, "功能正在开发中"))));
}

// ── DarenList ──

function DarenList({
  user,
  onViewVideos,
  onSettings,
  onAudit,
  onHome
}) {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [importing, setImporting] = useState(false);
  const [importStage, setImportStage] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const requestRef = useRef(null);
  const isAdmin = user && user.role === 'admin';
  const importStages = ['正在上传文件…', '正在解析 Excel…', '正在批量写入数据…', '正在整理导入结果…'];
  useEffect(() => {
    if (!importing) {
      setImportStage(0);
      return undefined;
    }
    const timer = setInterval(() => setImportStage(stage => (stage + 1) % importStages.length), 1800);
    return () => clearInterval(timer);
  }, [importing]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);
  const fetchData = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('pageSize', 20);
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      const res = await api.get('/api/darens?' + params.toString(), {
        signal: controller.signal
      });
      const payload = Array.isArray(res) ? {
        rows: res,
        total: res.length
      } : res;
      setData(payload.rows || []);
      setTotal(payload.total || 0);
      setSelectedRowKeys([]);
    } catch (e) {
      if (e.name !== 'AbortError') message.error('加载失败');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [search, category, page]);
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  const handleImport = async file => {
    setImporting(true);
    try {
      const res = await api.upload('/api/import', file);
      if (res.ok) {
        message.success(`导入完成：新增 ${res.imported} 条，跳过 ${res.skipped} 条，新建用户 ${res.newUsers} 人`);
        fetchData();
      } else {
        message.error(res.error || '导入失败');
      }
    } catch (e) {
      message.error('导入失败，请稍后重试');
    } finally {
      setImporting(false);
    }
    return false;
  };
  const handleExport = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    window.open('/api/export?' + params.toString());
  };
  const handleDelete = records => {
    if (!records.length) return;
    const names = records.slice(0, 5).map(r => r.nickname).join('、');
    const more = records.length > 5 ? ` 等 ${records.length} 个达人` : '';
    Modal.confirm({
      title: `确认删除 ${records.length} 个达人？`,
      content: `将永久删除 ${names}${more}、其全部视频、同名普通用户账号和本地截图文件。`,
      okText: '删除',
      okButtonProps: {
        danger: true
      },
      cancelText: '取消',
      onOk: async () => {
        setDeleting(true);
        try {
          const res = await api.delete('/api/darens', {
            ids: records.map(r => r.id)
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
    title: '全网昵称',
    dataIndex: 'nickname',
    key: 'nickname',
    width: 140,
    render: (text, record) => /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("a", {
      style: {
        fontWeight: 600,
        cursor: 'pointer',
        color: '#8b5e3c'
      },
      onClick: () => onViewVideos(record)
    }, text), record.anomaly_count > 0 && /*#__PURE__*/React.createElement(Tag, {
      color: "red",
      style: {
        marginLeft: 6,
        fontSize: 11
      }
    }, record.anomaly_count))
  }, {
    title: '机构名称',
    dataIndex: 'organization',
    key: 'organization',
    width: 120
  }, {
    title: '内容类型',
    dataIndex: 'content_type',
    key: 'content_type',
    width: 100
  }, {
    title: '达人分类',
    dataIndex: 'category',
    key: 'category',
    width: 130
  }, {
    title: '平台昵称',
    dataIndex: 'platform_nickname',
    key: 'platform_nickname',
    width: 120
  }, {
    title: '主页链接',
    dataIndex: 'homepage_url',
    key: 'homepage_url',
    width: 100,
    ellipsis: true,
    render: v => v ? /*#__PURE__*/React.createElement("a", {
      href: v,
      target: "_blank",
      rel: "noreferrer"
    }, "查看") : '-'
  }, {
    title: '账号',
    dataIndex: 'account',
    key: 'account',
    width: 110
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
  }];
  if (isAdmin) {
    columns.push({
      title: '状态',
      dataIndex: 'confirmation_status',
      key: 'confirmation_status',
      width: 105,
      render: confirmationStatusTag
    });
  }
  const categoryOptions = [{
    value: '美食',
    label: '美食'
  }, {
    value: '美妆',
    label: '美妆'
  }, {
    value: '搞笑',
    label: '搞笑'
  }, {
    value: '游戏',
    label: '游戏'
  }, {
    value: '音乐',
    label: '音乐'
  }, {
    value: '舞蹈',
    label: '舞蹈'
  }, {
    value: '知识',
    label: '知识'
  }, {
    value: '时尚',
    label: '时尚'
  }, {
    value: '旅游',
    label: '旅游'
  }, {
    value: '体育',
    label: '体育'
  }, {
    value: '科技',
    label: '科技'
  }, {
    value: '生活',
    label: '生活'
  }];
  const selectedKeySet = new Set(selectedRowKeys.map(String));
  const selectedRows = data.filter(row => selectedKeySet.has(String(row.id)));
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "toolbar"
  }, /*#__PURE__*/React.createElement(Button, {
    onClick: onHome
  }, "功能首页"), /*#__PURE__*/React.createElement(Input.Search, {
    placeholder: "搜索昵称",
    value: searchInput,
    onChange: e => setSearchInput(e.target.value),
    onSearch: () => {
      setPage(1);
      setSearch(searchInput);
    },
    style: {
      width: 200
    },
    allowClear: true
  }), /*#__PURE__*/React.createElement(Select, {
    placeholder: "达人分类",
    value: category || undefined,
    onChange: v => {
      setPage(1);
      setCategory(v || '');
    },
    style: {
      width: 150,
      marginLeft: 12
    },
    allowClear: true,
    options: categoryOptions
  }), /*#__PURE__*/React.createElement("div", {
    className: "spacer"
  }), isAdmin && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Upload, {
    beforeUpload: handleImport,
    showUploadList: false
  }, /*#__PURE__*/React.createElement(Button, {
    loading: importing
  }, "导入Excel")), /*#__PURE__*/React.createElement(Button, {
    onClick: handleExport,
    style: {
      marginLeft: 8
    }
  }, "导出"), /*#__PURE__*/React.createElement(Button, {
    danger: true,
    loading: deleting,
    disabled: !selectedRowKeys.length,
    onClick: () => handleDelete(selectedRows),
    style: {
      marginLeft: 8
    }
  }, "删除选中"), /*#__PURE__*/React.createElement(Button, {
    onClick: onSettings,
    style: {
      marginLeft: 8
    }
  }, "设置"), /*#__PURE__*/React.createElement(Button, {
    onClick: onAudit,
    style: {
      marginLeft: 8
    }
  }, "审核"))), /*#__PURE__*/React.createElement(Modal, {
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
  }, /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", null))))), /*#__PURE__*/React.createElement(Table, {
    columns: columns,
    dataSource: data,
    rowKey: "id",
    loading: loading,
    pagination: {
      total,
      current: page,
      pageSize: 20,
      onChange: setPage
    },
    rowSelection: isAdmin ? {
      selectedRowKeys,
      onChange: setSelectedRowKeys
    } : undefined,
    bordered: true,
    size: "middle",
    style: {
      marginTop: 16
    }
  }));
}
function VideoDetail({
  daren,
  user,
  onBack,
  onHome
}) {
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
  const [form] = Form.useForm();
  const [confirmationStatus, setConfirmationStatus] = useState(daren.confirmation_status || '待确认');
  const requestRef = useRef(null);
  const isAdmin = user.role === 'admin';
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setTitleSearch(titleInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [titleInput]);
  const fetchData = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('pageSize', 20);
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
    } catch (e) {
      if (e.name !== 'AbortError') message.error('加载失败');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [platformFilter, violation, compliance, titleSearch, page, daren.id]);
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  useEffect(() => {
    api.get('/api/settings/editable-columns').then(res => {
      if (res.columns) setEditableCols(res.columns);
    }).catch(() => {});
  }, []);
  const submitConfirmation = async status => {
    try {
      const res = await api.put('/api/darens/' + daren.id + '/confirmation', {
        status
      });
      if (res.ok) {
        setConfirmationStatus(res.status);
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
  const save = async videoId => {
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
    const canUpload = isAdmin || editingKey === record.id && editableCols.includes(key);
    const content = record[key] ? /*#__PURE__*/React.createElement(Image, {
      src: record[key],
      width: 60,
      height: 60,
      style: {
        objectFit: 'cover'
      }
    }) : /*#__PURE__*/React.createElement("div", {
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
      title: label
    }, canUpload ? /*#__PURE__*/React.createElement(Upload, {
      beforeUpload: file => {
        api.upload('/api/upload/' + record.id + '/' + key, file).then(r => r.ok ? handleUploadSuccess() : message.error(r.error));
        return false;
      },
      showUploadList: false
    }, content) : record[key] ? content : '-');
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
    const inputNode = dataIndex === 'publish_time' ? /*#__PURE__*/React.createElement(Input, {
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
    title: '视频标题',
    dataIndex: 'title',
    width: 200,
    ellipsis: true,
    editable: true
  }, {
    title: '作品标签',
    dataIndex: 'tags',
    width: 120,
    ellipsis: true,
    editable: true
  }, {
    title: '内容链接',
    dataIndex: 'content_url',
    width: 70,
    render: v => v ? /*#__PURE__*/React.createElement("a", {
      href: v,
      target: "_blank",
      rel: "noreferrer",
      style: {
        color: '#5a6e8a'
      }
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
    editable: true
  }, {
    title: '合规',
    dataIndex: 'compliance_status',
    width: 65,
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
    editable: true
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
    editable: true
  }, {
    title: '爆款',
    dataIndex: 'is_hot',
    width: 60,
    editable: true
  }, {
    title: '申诉',
    dataIndex: 'appeal',
    width: 100,
    editable: true,
    ellipsis: true
  }, {
    title: '操作',
    key: 'actions',
    width: 80,
    render: (_, record) => {
      if (editingKey === record.id) {
        return /*#__PURE__*/React.createElement(Space, null, /*#__PURE__*/React.createElement(Button, {
          size: "small",
          type: "primary",
          onClick: () => save(record.id)
        }, "保存"), /*#__PURE__*/React.createElement(Button, {
          size: "small",
          onClick: () => setEditingKey('')
        }, "取消"));
      }
      const canEdit = isAdmin || editableCols.length > 0;
      return canEdit ? /*#__PURE__*/React.createElement(Button, {
        size: "small",
        onClick: () => {
          setEditingKey(record.id);
          form.setFieldsValue(record);
        }
      }, "编辑") : null;
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
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "video-detail-header"
  }, /*#__PURE__*/React.createElement(Button, {
    onClick: onHome
  }, "功能首页"), isAdmin && /*#__PURE__*/React.createElement(Button, {
    onClick: onBack
  }, "← 返回"), /*#__PURE__*/React.createElement("h3", null, isAdmin ? `${daren.nickname} — 视频明细` : '达人数据'), !isAdmin && /*#__PURE__*/React.createElement(Space, null, "当前状态：", confirmationStatusTag(confirmationStatus), confirmationStatus === '待确认' && /*#__PURE__*/React.createElement(Button, {
    size: "small",
    type: "primary",
    onClick: () => submitConfirmation('已确认')
  }, "确认数据无误"))), /*#__PURE__*/React.createElement("div", {
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
    scroll: {
      x: 2600
    },
    pagination: {
      total,
      current: page,
      pageSize: 20,
      onChange: setPage
    },
    bordered: true,
    size: "small",
    components: {
      body: {
        cell: EditableCell
      }
    }
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
}, {
  key: 'appeal',
  label: '申诉'
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
    title: "勾选普通用户可编辑的列",
    style: {
      maxWidth: 500
    }
  }, /*#__PURE__*/React.createElement(Checkbox.Group, {
    value: checked,
    onChange: setChecked,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, allColumns.map(c => /*#__PURE__*/React.createElement(Checkbox, {
    key: c.key,
    value: c.key
  }, c.label))), /*#__PURE__*/React.createElement(Button, {
    type: "primary",
    onClick: save,
    loading: loading,
    style: {
      marginTop: 16
    }
  }, "保存设置")));
}
function AuditPage({
  onBack
}) {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const res = await api.get('/api/audit-logs?limit=50&offset=' + (page - 1) * 50);
    setLogs(res.rows || []);
    setTotal(res.total || 0);
    setLoading(false);
  }, [page]);
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);
  const columns = [{
    title: '操作人',
    dataIndex: 'user_nickname',
    width: 130
  }, {
    title: '表名',
    dataIndex: 'table_name',
    width: 80
  }, {
    title: '记录ID',
    dataIndex: 'record_id',
    width: 200,
    ellipsis: true
  }, {
    title: '字段',
    dataIndex: 'column_name',
    width: 130
  }, {
    title: '旧值',
    dataIndex: 'old_value',
    width: 160,
    ellipsis: true
  }, {
    title: '新值',
    dataIndex: 'new_value',
    width: 160,
    ellipsis: true
  }, {
    title: '时间',
    dataIndex: 'changed_at',
    width: 160
  }];
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "video-detail-header"
  }, /*#__PURE__*/React.createElement(Button, {
    onClick: onBack
  }, "← 返回"), /*#__PURE__*/React.createElement("h3", null, "操作日志")), /*#__PURE__*/React.createElement(Table, {
    columns: columns,
    dataSource: logs,
    rowKey: "id",
    loading: loading,
    scroll: {
      x: 1000
    },
    pagination: {
      total,
      pageSize: 50,
      current: page,
      onChange: setPage
    },
    bordered: true,
    size: "small"
  }));
}

// ── App ──

function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('home');
  const [selectedDaren, setSelectedDaren] = useState(null);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    api.get('/api/me').then(res => {
      if (res.user) setUser(res.user);
    }).catch(() => {}).finally(() => setChecking(false));
  }, []);
  const enterDataCheck = useCallback(async () => {
    if (user.role === 'admin') {
      setPage('darens');
      return;
    }
    try {
      const darens = await api.get('/api/darens');
      const daren = darens && darens[0];
      if (!daren) return message.info('暂无可核对的数据');
      setSelectedDaren(daren);
      setPage('videos');
    } catch (e) {
      message.error('加载数据失败');
    }
  }, [user]);
  const navigateToVideos = useCallback(daren => {
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
    setPage('home');
  }, []);
  if (checking) return null;
  if (!user) {
    return /*#__PURE__*/React.createElement(LoginPage, {
      onLogin: setUser
    });
  }
  const roleMap = {
    admin: '管理员',
    editor: '编辑者',
    viewer: '查看者'
  };
  const renderPage = () => {
    switch (page) {
      case 'home':
        return /*#__PURE__*/React.createElement(HomePage, {
          onDataCheck: enterDataCheck
        });
      case 'videos':
        return /*#__PURE__*/React.createElement(VideoDetail, {
          daren: selectedDaren,
          user: user,
          onBack: goBack,
          onHome: goHome
        });
      case 'settings':
        return /*#__PURE__*/React.createElement(SettingsPage, {
          onBack: goBack
        });
      case 'audit':
        return /*#__PURE__*/React.createElement(AuditPage, {
          onBack: goBack
        });
      default:
        return /*#__PURE__*/React.createElement(DarenList, {
          user: user,
          onViewVideos: navigateToVideos,
          onSettings: () => setPage('settings'),
          onAudit: () => setPage('audit'),
          onHome: goHome
        });
    }
  };
  return /*#__PURE__*/React.createElement(Layout, {
    style: {
      minHeight: '100vh',
      background: 'var(--paper)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "app-header"
  }, /*#__PURE__*/React.createElement("h2", null, user.role === 'admin' ? '达人数据管理' : '达人数据'), /*#__PURE__*/React.createElement("div", {
    className: "user-info"
  }, /*#__PURE__*/React.createElement("span", null, user.display_name, "（", roleMap[user.role] || user.role, "）"), /*#__PURE__*/React.createElement(Button, {
    type: "text",
    size: "small",
    onClick: handleLogout,
    style: {
      color: 'var(--ink-secondary)'
    }
  }, "退出"))), /*#__PURE__*/React.createElement("div", {
    className: "app-content"
  }, renderPage()));
}

// ── Render ──

ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
