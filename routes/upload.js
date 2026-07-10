const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { prepare } = require('../db');
const { requireLogin } = require('../middleware');

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/upload/:workId/:field', requireLogin, upload.single('file'), (req, res) => {
  const { workId, field } = req.params;
  const allowedFields = ['screenshot_plays', 'screenshot_likes', 'screenshot_7d_plays', 'screenshot_7d_likes'];
  if (!allowedFields.includes(field)) return res.status(400).json({ error: '无效的截图字段' });
  if (!req.file) return res.status(400).json({ error: '未上传文件' });

  const filePath = '/uploads/' + req.file.filename;
  prepare(`UPDATE videos SET ${field} = ? WHERE work_id = ?`).run(filePath, workId);
  res.json({ ok: true, url: filePath });
});

module.exports = router;
