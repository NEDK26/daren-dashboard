import { jsxDEV as _jsxDEV, Fragment as _Fragment } from "react/jsx-dev-runtime";
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
  DatePicker,
  Image,
  Checkbox
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
  return /*#__PURE__*/_jsxDEV("div", {
    className: "login-page",
    children: /*#__PURE__*/_jsxDEV(Card, {
      title: "达人数据管理平台",
      className: "login-card",
      children: /*#__PURE__*/_jsxDEV(Form, {
        onFinish: handleSubmit,
        layout: "vertical",
        children: [/*#__PURE__*/_jsxDEV(Form.Item, {
          name: "username",
          rules: [{
            required: true,
            message: '请输入用户名'
          }],
          children: /*#__PURE__*/_jsxDEV(Input, {
            placeholder: "用户名"
          }, void 0, false)
        }, void 0, false), /*#__PURE__*/_jsxDEV(Form.Item, {
          name: "password",
          rules: [{
            required: true,
            message: '请输入密码'
          }],
          children: /*#__PURE__*/_jsxDEV(Input.Password, {
            placeholder: "密码"
          }, void 0, false)
        }, void 0, false), /*#__PURE__*/_jsxDEV(Form.Item, {
          children: /*#__PURE__*/_jsxDEV(Button, {
            type: "primary",
            htmlType: "submit",
            loading: loading,
            block: true,
            children: "登录"
          }, void 0, false)
        }, void 0, false)]
      }, void 0, true)
    }, void 0, false)
  }, void 0, false);
}

// ── Placeholder pages ──

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
  const columns = [{
    title: '全网昵称',
    dataIndex: 'nickname',
    key: 'nickname',
    width: 140,
    render: text => /*#__PURE__*/_jsxDEV("span", {
      style: {
        fontWeight: 600
      },
      children: text
    }, void 0, false)
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
    title: '总播放量',
    dataIndex: 'total_plays',
    key: 'total_plays',
    width: 120,
    render: v => /*#__PURE__*/_jsxDEV("span", {
      style: {
        fontVariantNumeric: 'tabular-nums'
      },
      children: (v || 0).toLocaleString()
    }, void 0, false)
  }, {
    title: '平台数据',
    key: 'platforms',
    width: 210,
    render: (_, record) => {
      const platforms = (record.platforms || '').split(',').filter(Boolean);
      const config = {
        '抖音': {
          className: 'btn-douyin',
          color: '#ff2e63'
        },
        '快手': {
          className: 'btn-kuaishou',
          color: '#ff6b00'
        },
        'B站': {
          className: 'btn-bilibili',
          color: '#00aeec'
        }
      };
      return /*#__PURE__*/_jsxDEV("div", {
        className: "platform-btns",
        children: ['抖音', '快手', 'B站'].map(p => {
          const cfg = config[p];
          const active = platforms.includes(p);
          return /*#__PURE__*/_jsxDEV(Button, {
            size: "small",
            type: active ? 'primary' : 'default',
            ghost: active,
            disabled: !active,
            className: cfg.className,
            style: active ? {
              background: cfg.color,
              borderColor: cfg.color
            } : {
              borderColor: cfg.color,
              color: cfg.color
            },
            onClick: () => active && onViewVideos(record, p),
            children: p
          }, p, false);
        })
      }, void 0, false);
    }
  }];
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
  const isAdmin = user && user.role === 'admin';
  return /*#__PURE__*/_jsxDEV("div", {
    children: [/*#__PURE__*/_jsxDEV("div", {
      className: "toolbar",
      children: [/*#__PURE__*/_jsxDEV(Input.Search, {
        placeholder: "搜索昵称",
        value: search,
        onChange: e => setSearch(e.target.value),
        onSearch: fetchData,
        style: {
          width: 200
        },
        allowClear: true
      }, void 0, false), /*#__PURE__*/_jsxDEV(Select, {
        placeholder: "达人分类",
        value: category || undefined,
        onChange: v => setCategory(v || ''),
        style: {
          width: 150,
          marginLeft: 12
        },
        allowClear: true,
        options: categoryOptions
      }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
        className: "spacer"
      }, void 0, false), isAdmin && /*#__PURE__*/_jsxDEV(_Fragment, {
        children: [/*#__PURE__*/_jsxDEV(Upload, {
          beforeUpload: handleImport,
          showUploadList: false,
          children: /*#__PURE__*/_jsxDEV(Button, {
            loading: importing,
            children: "导入Excel"
          }, void 0, false)
        }, void 0, false), /*#__PURE__*/_jsxDEV(Button, {
          onClick: handleExport,
          style: {
            marginLeft: 8
          },
          children: "导出"
        }, void 0, false), /*#__PURE__*/_jsxDEV(Button, {
          onClick: onSettings,
          style: {
            marginLeft: 8
          },
          children: "设置"
        }, void 0, false), /*#__PURE__*/_jsxDEV(Button, {
          onClick: onAudit,
          style: {
            marginLeft: 8
          },
          children: "审核"
        }, void 0, false)]
      }, void 0, true)]
    }, void 0, true), /*#__PURE__*/_jsxDEV(Table, {
      columns: columns,
      dataSource: data,
      rowKey: "id",
      loading: loading,
      pagination: {
        pageSize: 20
      },
      bordered: true,
      size: "middle",
      style: {
        marginTop: 16
      }
    }, void 0, false)]
  }, void 0, true);
}
function VideoDetail({
  daren,
  platform,
  user,
  onBack
}) {
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
    return /*#__PURE__*/_jsxDEV("div", {
      className: "screenshot-cell",
      children: fields.map(f => /*#__PURE__*/_jsxDEV(Tooltip, {
        title: f.label,
        children: record[f.key] ? /*#__PURE__*/_jsxDEV(Image, {
          src: record[f.key],
          width: 60,
          height: 60,
          style: {
            objectFit: 'cover'
          }
        }, void 0, false) : /*#__PURE__*/_jsxDEV(Upload, {
          beforeUpload: file => {
            api.upload('/api/upload/' + record.work_id + '/' + f.key, file).then(r => r.ok ? (message.success('已上传'), fetchData()) : message.error(r.error));
            return false;
          },
          showUploadList: false,
          children: /*#__PURE__*/_jsxDEV("div", {
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
            },
            children: f.label
          }, void 0, false)
        }, void 0, false)
      }, f.key, false))
    }, void 0, false);
  };
  const EditableCell = ({
    title,
    dataIndex,
    children,
    editable,
    record,
    ...rest
  }) => {
    if (!editable || editingKey !== record.work_id) return /*#__PURE__*/_jsxDEV("td", {
      ...rest,
      children: children
    }, void 0, false);
    const inputNode = dataIndex === 'publish_time' ? /*#__PURE__*/_jsxDEV(Input, {
      size: "small",
      placeholder: "YYYY-MM-DD"
    }, void 0, false) : /*#__PURE__*/_jsxDEV(Input, {
      size: "small"
    }, void 0, false);
    return /*#__PURE__*/_jsxDEV("td", {
      ...rest,
      children: /*#__PURE__*/_jsxDEV(Form.Item, {
        name: dataIndex,
        style: {
          margin: 0
        },
        children: inputNode
      }, void 0, false)
    }, void 0, false);
  };
  const columns = [{
    title: '视频标题',
    dataIndex: 'title',
    width: 220,
    ellipsis: true,
    editable: true
  }, {
    title: '作品标签',
    dataIndex: 'tags',
    width: 140,
    ellipsis: true,
    editable: true
  }, {
    title: '内容链接',
    dataIndex: 'content_url',
    width: 80,
    render: v => v ? /*#__PURE__*/_jsxDEV("a", {
      href: v,
      target: "_blank",
      rel: "noreferrer",
      style: {
        color: '#5a6e8a'
      },
      children: "查看"
    }, void 0, false) : '-'
  }, {
    title: '发布时间',
    dataIndex: 'publish_time',
    width: 110,
    editable: true
  }, {
    title: 'DA播放',
    dataIndex: 'da_plays',
    width: 90,
    render: v => (v || 0).toLocaleString(),
    editable: true
  }, {
    title: 'DA点赞',
    dataIndex: 'da_likes',
    width: 80,
    render: v => (v || 0).toLocaleString(),
    editable: true
  }, {
    title: '7日播放',
    dataIndex: 'da_7d_plays',
    width: 90,
    render: v => (v || 0).toLocaleString(),
    editable: true
  }, {
    title: '7日点赞',
    dataIndex: 'da_7d_likes',
    width: 80,
    render: v => (v || 0).toLocaleString(),
    editable: true
  }, {
    title: '评论',
    dataIndex: 'comments',
    width: 70,
    editable: true
  }, {
    title: '收藏',
    dataIndex: 'saves',
    width: 70,
    editable: true
  }, {
    title: '转发',
    dataIndex: 'shares',
    width: 70,
    editable: true
  }, {
    title: '违规',
    dataIndex: 'violation_status',
    width: 70,
    render: v => v === '违规' ? /*#__PURE__*/_jsxDEV(Tag, {
      color: "red",
      children: "违规"
    }, void 0, false) : /*#__PURE__*/_jsxDEV(Tag, {
      color: "green",
      children: "未违规"
    }, void 0, false)
  }, {
    title: '合规',
    dataIndex: 'compliance_status',
    width: 70,
    render: v => v === '合规' ? /*#__PURE__*/_jsxDEV(Tag, {
      color: "green",
      children: "合规"
    }, void 0, false) : /*#__PURE__*/_jsxDEV(Tag, {
      color: "orange",
      children: "不合规"
    }, void 0, false)
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
        return /*#__PURE__*/_jsxDEV(Space, {
          children: [/*#__PURE__*/_jsxDEV(Button, {
            size: "small",
            type: "primary",
            onClick: () => save(record.work_id),
            children: "保存"
          }, void 0, false), /*#__PURE__*/_jsxDEV(Button, {
            size: "small",
            onClick: () => setEditingKey(''),
            children: "取消"
          }, void 0, false)]
        }, void 0, true);
      }
      const canEdit = isAdmin || editableCols.length > 0;
      return canEdit ? /*#__PURE__*/_jsxDEV(Button, {
        size: "small",
        onClick: () => {
          setEditingKey(record.work_id);
          form.setFieldsValue(record);
        },
        children: "编辑"
      }, void 0, false) : null;
    }
  }];
  const mergedColumns = columns.map(col => ({
    ...col,
    onCell: record => ({
      record,
      dataIndex: col.dataIndex,
      editable: col.editable
    })
  }));
  return /*#__PURE__*/_jsxDEV(_Fragment, {
    children: [/*#__PURE__*/_jsxDEV("div", {
      className: "video-detail-header",
      children: [/*#__PURE__*/_jsxDEV(Button, {
        onClick: onBack,
        children: "← 返回"
      }, void 0, false), /*#__PURE__*/_jsxDEV("h3", {
        children: [daren.nickname, " — ", platform, " 视频明细"]
      }, void 0, true)]
    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
      className: "toolbar",
      children: [/*#__PURE__*/_jsxDEV(DatePicker.RangePicker, {
        value: dateRange,
        onChange: setDateRange,
        placeholder: ['开始', '结束']
      }, void 0, false), /*#__PURE__*/_jsxDEV(Select, {
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
      }, void 0, false), /*#__PURE__*/_jsxDEV(Select, {
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
      }, void 0, false)]
    }, void 0, true), /*#__PURE__*/_jsxDEV(Form, {
      form: form,
      component: false,
      children: /*#__PURE__*/_jsxDEV(Table, {
        columns: mergedColumns,
        dataSource: data,
        rowKey: "work_id",
        loading: loading,
        scroll: {
          x: 1900
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
      }, void 0, false)
    }, void 0, false)]
  }, void 0, true);
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
  return /*#__PURE__*/_jsxDEV(_Fragment, {
    children: [/*#__PURE__*/_jsxDEV("div", {
      className: "video-detail-header",
      children: [/*#__PURE__*/_jsxDEV(Button, {
        onClick: onBack,
        children: "← 返回"
      }, void 0, false), /*#__PURE__*/_jsxDEV("h3", {
        children: "可编辑列权限设置"
      }, void 0, false)]
    }, void 0, true), /*#__PURE__*/_jsxDEV(Card, {
      title: "勾选普通用户可编辑的列",
      style: {
        maxWidth: 500
      },
      children: [/*#__PURE__*/_jsxDEV(Checkbox.Group, {
        value: checked,
        onChange: setChecked,
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: 10
        },
        children: allColumns.map(c => /*#__PURE__*/_jsxDEV(Checkbox, {
          value: c.key,
          children: c.label
        }, c.key, false))
      }, void 0, false), /*#__PURE__*/_jsxDEV(Button, {
        type: "primary",
        onClick: save,
        loading: loading,
        style: {
          marginTop: 16
        },
        children: "保存设置"
      }, void 0, false)]
    }, void 0, true)]
  }, void 0, true);
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
  return /*#__PURE__*/_jsxDEV(_Fragment, {
    children: [/*#__PURE__*/_jsxDEV("div", {
      className: "video-detail-header",
      children: [/*#__PURE__*/_jsxDEV(Button, {
        onClick: onBack,
        children: "← 返回"
      }, void 0, false), /*#__PURE__*/_jsxDEV("h3", {
        children: "操作日志"
      }, void 0, false)]
    }, void 0, true), /*#__PURE__*/_jsxDEV(Table, {
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
    }, void 0, false)]
  }, void 0, true);
}

// ── App ──

function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('darens');
  const [selectedDaren, setSelectedDaren] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    api.get('/api/me').then(res => {
      if (res.user) setUser(res.user);
    }).catch(() => {}).finally(() => setChecking(false));
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
    return /*#__PURE__*/_jsxDEV(LoginPage, {
      onLogin: setUser
    }, void 0, false);
  }
  const roleMap = {
    admin: '管理员',
    editor: '编辑者',
    viewer: '查看者'
  };
  const renderPage = () => {
    switch (page) {
      case 'videos':
        return /*#__PURE__*/_jsxDEV(VideoDetail, {
          daren: selectedDaren,
          platform: selectedPlatform,
          user: user,
          onBack: goBack
        }, void 0, false);
      case 'settings':
        return /*#__PURE__*/_jsxDEV(SettingsPage, {
          onBack: goBack
        }, void 0, false);
      case 'audit':
        return /*#__PURE__*/_jsxDEV(AuditPage, {
          onBack: goBack
        }, void 0, false);
      default:
        return /*#__PURE__*/_jsxDEV(DarenList, {
          user: user,
          onViewVideos: navigateToVideos,
          onSettings: () => setPage('settings'),
          onAudit: () => setPage('audit')
        }, void 0, false);
    }
  };
  return /*#__PURE__*/_jsxDEV(Layout, {
    style: {
      minHeight: '100vh',
      background: 'var(--paper)'
    },
    children: [/*#__PURE__*/_jsxDEV("div", {
      className: "app-header",
      children: [/*#__PURE__*/_jsxDEV("h2", {
        children: "达人数据管理"
      }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
        className: "user-info",
        children: [/*#__PURE__*/_jsxDEV("span", {
          children: [user.display_name, "（", roleMap[user.role] || user.role, "）"]
        }, void 0, true), /*#__PURE__*/_jsxDEV(Button, {
          type: "text",
          size: "small",
          onClick: handleLogout,
          style: {
            color: 'var(--ink-secondary)'
          },
          children: "退出"
        }, void 0, false)]
      }, void 0, true)]
    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
      className: "app-content",
      children: renderPage()
    }, void 0, false)]
  }, void 0, true);
}

// ── Render ──

ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/_jsxDEV(App, {}, void 0, false));
