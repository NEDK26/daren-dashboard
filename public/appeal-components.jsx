function AppealDrawer({
  open,
  onClose,
  slots,
  loading,
  saving,
  onUpdateSlot,
  onStageImage,
  onRemoveImage,
  onSave
}) {
  return <Drawer className="appeal-drawer" title="视频申诉" open={open} onClose={onClose} width="min(520px, 100vw)" destroyOnClose footer={<Space><Button onClick={onClose}>取消</Button><Button type="primary" loading={saving} disabled={loading} onClick={onSave}>保存申诉</Button></Space>}><p className="appeal-drawer-hint">每条视频最多提交三组申诉文字和图片，保存后统一提交。</p>{loading ? <div className="appeal-loading">正在加载…</div> : Array.from({
    length: 3
  }, (_, index) => {
    const slot = slots[index] || {
      group_no: index + 1,
      appeal_text: ''
    };
    const imageUrl = slot.previewUrl || !slot.removeImage && slot.image_path;
    return <section className="appeal-slot" key={slot.group_no}><div className="appeal-slot-heading"><strong>申诉 {slot.group_no}</strong><span>文字 + 1 张图片</span></div><Input.TextArea value={slot.appeal_text} onChange={event => onUpdateSlot(slot.group_no, {
      appeal_text: event.target.value
    })} placeholder="填写申诉说明" rows={3} maxLength={1000} showCount /><div className="appeal-image-row">{imageUrl ? <Image src={imageUrl} width={88} height={88} style={{
      objectFit: 'cover'
    }} /> : <div className="appeal-image-empty">暂无图片</div>}<Space direction="vertical" size={6}><Upload beforeUpload={file => onStageImage(slot.group_no, file)} showUploadList={false} accept="image/*"><Button size="small">{imageUrl ? '替换图片' : '选择图片'}</Button></Upload>{imageUrl && <Button size="small" type="text" danger onClick={() => onRemoveImage(slot)}>移除图片</Button>}{slot.file && <span className="appeal-pending-label">待保存</span>}</Space></div></section>;
  })}</Drawer>;
}
