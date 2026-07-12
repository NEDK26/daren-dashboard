const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { prepare } = require('../db');
const { requireLogin, auditLog } = require('../middleware');
const { resetDarenConfirmation } = require('../services/darenConfirmation');

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/upload/:id/:field', requireLogin, authorizeScreenshotUpload, upload.single('file'), (req, res) => {
  const { id, field } = req.params;
  if (!req.file) return res.status(400).json({ error: '未上传文件' });

  const video = req.screenshotVideo;

  const filePath = '/uploads/' + req.file.filename;
  prepare(`UPDATE videos SET ${field} = ? WHERE id = ?`).run(filePath, id);
  const changes = { [field]: { old: String(video[field] || '未上传'), new: '已上传' } };
  resetDarenConfirmation({ prepare, darenId: video.daren_id, changes });
  auditLog(req, 'videos', id, changes, '上传截图');
  res.json({ ok: true, url: filePath });
});

function authorizeScreenshotUpload(req, res, next) {
  const { id, field } = req.params;
  const allowedFields = ['screenshot_plays', 'screenshot_likes', 'screenshot_7d_plays', 'screenshot_7d_likes'];
  if (!allowedFields.includes(field)) return res.status(400).json({ error: '无效的截图字段' });

  const video = prepare(`
    SELECT v.*, d.nickname, b.status AS batch_status
    FROM videos v
    JOIN darens d ON v.daren_id = d.id
    JOIN batches b ON b.id = v.batch_id
    WHERE v.id = ?
  `).get(id);
  if (!video) return res.status(404).json({ error: '视频不存在' });
  if (video.batch_status !== 'current') return res.status(403).json({ error: '历史批次只读' });
  const isAdmin = req.session.user.role === 'admin';
  if (!isAdmin && video.nickname !== req.session.user.display_name) {
    return res.status(403).json({ error: '只能编辑自己的数据' });
  }
  const editableCols = getEditableColumns();
  if (!isAdmin && !editableCols.includes(field)) {
    return res.status(403).json({ error: '没有该截图的编辑权限' });
  }

  req.screenshotVideo = video;
  next();
}

function getEditableColumns() {
  const row = prepare("SELECT value FROM settings WHERE key = ?").get('editable_columns');
  return row ? JSON.parse(row.value) : [];
}

module.exports = router;
