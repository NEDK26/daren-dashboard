const {
  useState,
  useEffect,
  useCallback
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
  get: url => fetch(url).then(r => r.json()),
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

// ── DarenList ──

function DarenList({
  user,
  onViewVideos,
  onSettings,
  onAudit
}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const isAdmin = user && user.role === 'admin';
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      const res = await api.get('/api/darens?' + params.toString());
      setData(res || []);
      setSelectedRowKeys([]);
    } catch (e) {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  }, [search, category]);
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  const handleImport = async file => {
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
      title: '操作',
      key: 'actions',
      width: 90,
      render: (_, record) => /*#__PURE__*/React.createElement(Button, {
        danger: true,
        size: "small",
        onClick: () => handleDelete([record])
      }, "删除")
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
  }, /*#__PURE__*/React.createElement(Input.Search, {
    placeholder: "搜索昵称",
    value: search,
    onChange: e => setSearch(e.target.value),
    onSearch: fetchData,
    style: {
      width: 200
    },
    allowClear: true
  }), /*#__PURE__*/React.createElement(Select, {
    placeholder: "达人分类",
    value: category || undefined,
    onChange: v => setCategory(v || ''),
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
  }, "审核"))), /*#__PURE__*/React.createElement(Table, {
    columns: columns,
    dataSource: data,
    rowKey: "id",
    loading: loading,
    pagination: {
      pageSize: 20
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
  onBack
}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [platformFilter, setPlatformFilter] = useState(undefined);
  const [violation, setViolation] = useState(undefined);
  const [compliance, setCompliance] = useState(undefined);
  const [titleSearch, setTitleSearch] = useState('');
  const [editingKey, setEditingKey] = useState('');
  const [editableCols, setEditableCols] = useState([]);
  const [form] = Form.useForm();
  const isAdmin = user.role === 'admin';
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (platformFilter) params.set('platform', platformFilter);
      if (violation) params.set('violation', violation);
      if (compliance) params.set('compliance', compliance);
      if (titleSearch) params.set('title', titleSearch);
      const res = await api.get('/api/darens/' + daren.id + '/videos?' + params.toString());
      setData(res || []);
    } catch (e) {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  }, [platformFilter, violation, compliance, titleSearch, daren.id]);
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  useEffect(() => {
    if (isAdmin) {
      api.get('/api/settings/editable-columns').then(res => {
        if (res.columns) setEditableCols(res.columns);
      }).catch(() => {});
    }
  }, [isAdmin]);
  const save = async workId => {
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
  const renderScreenshots = record => {
    const fields = [{
      key: 'screenshot_plays',
      label: '播放'
    }, {
      key: 'screenshot_likes',
      label: '点赞'
    }, {
      key: 'screenshot_7d_plays',
      label: '7日播放'
    }, {
      key: 'screenshot_7d_likes',
      label: '7日点赞'
    }];
    return /*#__PURE__*/React.createElement("div", {
      className: "screenshot-cell"
    }, fields.map(f => /*#__PURE__*/React.createElement(Tooltip, {
      key: f.key,
      title: f.label
    }, record[f.key] ? /*#__PURE__*/React.createElement(Image, {
      src: record[f.key],
      width: 60,
      height: 60,
      style: {
        objectFit: 'cover'
      }
    }) : /*#__PURE__*/React.createElement(Upload, {
      beforeUpload: file => {
        api.upload('/api/upload/' + record.work_id + '/' + f.key, file).then(r => r.ok ? (message.success('已上传'), fetchData()) : message.error(r.error));
        return false;
      },
      showUploadList: false
    }, /*#__PURE__*/React.createElement("div", {
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
    }, f.label)))));
  };
  const EditableCell = ({
    title,
    dataIndex,
    children,
    editable,
    record,
    ...rest
  }) => {
    if (!editable || editingKey !== record.work_id) return /*#__PURE__*/React.createElement("td", rest, children);
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
    title: 'DA点赞',
    dataIndex: 'da_likes',
    width: 75,
    render: v => (v || 0).toLocaleString(),
    editable: true
  }, {
    title: '7日播放',
    dataIndex: 'da_7d_plays',
    width: 85,
    render: v => (v || 0).toLocaleString(),
    editable: true
  }, {
    title: '7日点赞',
    dataIndex: 'da_7d_likes',
    width: 75,
    render: v => (v || 0).toLocaleString(),
    editable: true
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
    title: '截图',
    key: 'screenshots',
    width: 270,
    render: (_, record) => renderScreenshots(record)
  }, {
    title: '操作',
    key: 'actions',
    width: 80,
    render: (_, record) => {
      if (editingKey === record.work_id) {
        return /*#__PURE__*/React.createElement(Space, null, /*#__PURE__*/React.createElement(Button, {
          size: "small",
          type: "primary",
          onClick: () => save(record.work_id)
        }, "保存"), /*#__PURE__*/React.createElement(Button, {
          size: "small",
          onClick: () => setEditingKey('')
        }, "取消"));
      }
      const canEdit = isAdmin || editableCols.length > 0;
      return canEdit ? /*#__PURE__*/React.createElement(Button, {
        size: "small",
        onClick: () => {
          setEditingKey(record.work_id);
          form.setFieldsValue(record);
        }
      }, "编辑") : null;
    }
  }];
  const isAnomaly = (record, key) => {
    if (!record.anomaly_data) return false;
    try {
      return key in JSON.parse(record.anomaly_data);
    } catch {
      return false;
    }
  };
  const mergedColumns = columns.map(col => ({
    ...col,
    onCell: record => ({
      record,
      dataIndex: col.dataIndex,
      editable: col.editable,
      className: isAnomaly(record, col.dataIndex) ? 'cell-anomaly' : undefined
    })
  }));
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "video-detail-header"
  }, /*#__PURE__*/React.createElement(Button, {
    onClick: onBack
  }, "← 返回"), /*#__PURE__*/React.createElement("h3", null, daren.nickname, " — 视频明细")), /*#__PURE__*/React.createElement("div", {
    className: "toolbar"
  }, /*#__PURE__*/React.createElement(Select, {
    placeholder: "平台",
    allowClear: true,
    style: {
      width: 110
    },
    value: platformFilter,
    onChange: setPlatformFilter,
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
    value: titleSearch,
    onChange: e => setTitleSearch(e.target.value),
    onSearch: fetchData,
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
    onChange: setViolation,
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
    onChange: setCompliance,
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
    rowKey: "work_id",
    loading: loading,
    scroll: {
      x: 2600
    },
    pagination: {
      pageSize: 20
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
  key: 'da_likes',
  label: 'DA点赞量'
}, {
  key: 'da_7d_plays',
  label: 'DA7日播放'
}, {
  key: 'da_7d_likes',
  label: 'DA7日点赞'
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
  const [page, setPage] = useState('darens');
  const [selectedDaren, setSelectedDaren] = useState(null);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    api.get('/api/me').then(res => {
      if (res.user) setUser(res.user);
    }).catch(() => {}).finally(() => setChecking(false));
  }, []);
  const navigateToVideos = useCallback(daren => {
    setSelectedDaren(daren);
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
      case 'videos':
        return /*#__PURE__*/React.createElement(VideoDetail, {
          daren: selectedDaren,
          user: user,
          onBack: goBack
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
          onAudit: () => setPage('audit')
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
  }, /*#__PURE__*/React.createElement("h2", null, "达人数据管理"), /*#__PURE__*/React.createElement("div", {
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
