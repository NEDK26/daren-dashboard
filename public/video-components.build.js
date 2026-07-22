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
