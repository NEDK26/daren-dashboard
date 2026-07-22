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
  return /*#__PURE__*/React.createElement(Drawer, {
    className: "appeal-drawer",
    title: "视频申诉",
    open: open,
    onClose: onClose,
    width: "min(520px, 100vw)",
    destroyOnClose: true,
    footer: /*#__PURE__*/React.createElement(Space, null, /*#__PURE__*/React.createElement(Button, {
      onClick: onClose
    }, "取消"), /*#__PURE__*/React.createElement(Button, {
      type: "primary",
      loading: saving,
      disabled: loading,
      onClick: onSave
    }, "保存申诉"))
  }, /*#__PURE__*/React.createElement("p", {
    className: "appeal-drawer-hint"
  }, "每条视频最多提交三组申诉文字和图片，保存后统一提交。"), loading ? /*#__PURE__*/React.createElement("div", {
    className: "appeal-loading"
  }, "正在加载…") : Array.from({
    length: 3
  }, (_, index) => {
    const slot = slots[index] || {
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
      onChange: event => onUpdateSlot(slot.group_no, {
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
      beforeUpload: file => onStageImage(slot.group_no, file),
      showUploadList: false,
      accept: "image/*"
    }, /*#__PURE__*/React.createElement(Button, {
      size: "small"
    }, imageUrl ? '替换图片' : '选择图片')), imageUrl && /*#__PURE__*/React.createElement(Button, {
      size: "small",
      type: "text",
      danger: true,
      onClick: () => onRemoveImage(slot)
    }, "移除图片"), slot.file && /*#__PURE__*/React.createElement("span", {
      className: "appeal-pending-label"
    }, "待保存"))));
  }));
}
