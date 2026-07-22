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

