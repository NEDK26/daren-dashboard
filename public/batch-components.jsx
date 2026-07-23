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
