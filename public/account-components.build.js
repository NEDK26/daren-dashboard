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
