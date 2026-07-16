const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { prepare, withTransaction } = require('../db');
const { requireLogin, auditLog } = require('../middleware');
const { resetDarenConfirmation } = require('../services/darenConfirmation');

const uploadsDir = path.join(__dirname, '..', 'uploads');
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 3 },
  fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith('image/'))
});
const APPEAL_IMAGE_FIELDS = [1, 2, 3].map(groupNo => ({ name: `appeal_image_${groupNo}`, maxCount: 1 }));

router.get('/videos/:id/appeals', requireLogin, authorizeAppealRead, (req, res) => {
  res.json({ appeals: listAppeals(req.params.id) });
});

router.post('/videos/:id/appeals', requireLogin, authorizeAppealWrite, upload.fields(APPEAL_IMAGE_FIELDS), (req, res) => {
  const video = req.appealVideo;
  const existing = new Map(listAppeals(video.id).map(appeal => [Number(appeal.group_no), appeal]));
  const changes = {};
  const replacedFiles = [];
  const newFiles = Object.values(req.files || {}).flat();

  try {
    withTransaction(() => {
      for (let groupNo = 1; groupNo <= 3; groupNo++) {
        const previous = existing.get(groupNo);
        const appealText = String(req.body[`appeal_text_${groupNo}`] || '').trim();
        if (appealText.length > 1000) throw new Error('每组申诉文字不能超过 1000 字');
        const uploaded = req.files?.[`appeal_image_${groupNo}`]?.[0];
        const removeImage = req.body[`remove_image_${groupNo}`] === '1';
        const imagePath = uploaded ? `/uploads/${uploaded.filename}` : removeImage ? null : previous?.image_path || null;

        if (!appealText && !imagePath) {
          if (previous) prepare('DELETE FROM video_appeals WHERE video_id = ? AND group_no = ?').run(video.id, groupNo);
        } else {
          prepare(`INSERT INTO video_appeals (video_id, group_no, appeal_text, image_path, submitted_by)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(video_id, group_no) DO UPDATE SET
              appeal_text = excluded.appeal_text, image_path = excluded.image_path,
              submitted_by = excluded.submitted_by, updated_at = datetime('now','localtime')`
          ).run(video.id, groupNo, appealText, imagePath, req.session.user.display_name);
        }
        if (String(previous?.appeal_text || '') !== appealText) {
          changes[`appeal_text_${groupNo}`] = { old: previous?.appeal_text || '', new: appealText };
        }
        if (uploaded) {
          changes[`appeal_image_${groupNo}`] = { old: previous?.image_path ? '已上传' : '未上传', new: previous?.image_path ? '已替换' : '已上传' };
        } else if (removeImage && previous?.image_path) {
          changes[`appeal_image_${groupNo}`] = { old: '已上传', new: '已移除' };
        }
        if ((uploaded || removeImage) && previous?.image_path) replacedFiles.push(previous.image_path);
      }
      prepare('UPDATE videos SET appeal = ? WHERE id = ?').run(String(req.body.appeal_text_1 || '').trim(), video.id);

      if (Object.keys(changes).length) {
        resetDarenConfirmation({ prepare, darenId: video.daren_id, changes });
        auditLog(req, 'videos', video.id, changes, '提交申诉');
      }
    });
  } catch (error) {
    newFiles.forEach(file => safeDelete(path.join(uploadsDir, file.filename)));
    return res.status(400).json({ error: error.message || '申诉保存失败' });
  }

  replacedFiles.forEach(filePath => safeDelete(resolveUpload(filePath)));
  res.json({ ok: true, appeals: listAppeals(video.id), changed: Object.keys(changes).length > 0 });
});

function authorizeAppealRead(req, res, next) {
  const video = findVideo(req.params.id);
  if (!video) return res.status(404).json({ error: '视频不存在' });
  if (req.session.user.role !== 'admin' && video.nickname !== req.session.user.display_name) {
    return res.status(403).json({ error: '只能查看自己的申诉' });
  }
  req.appealVideo = video;
  next();
}

function authorizeAppealWrite(req, res, next) {
  authorizeAppealRead(req, res, () => {
    const video = req.appealVideo;
    if (video.batch_status !== 'current') return res.status(403).json({ error: '历史批次只读' });
    next();
  });
}

function findVideo(id) {
  return prepare(`SELECT v.id, v.daren_id, d.nickname, b.status AS batch_status
    FROM videos v JOIN darens d ON d.id = v.daren_id JOIN batches b ON b.id = v.batch_id
    WHERE v.id = ?`).get(id);
}

function listAppeals(videoId) {
  return prepare(`SELECT group_no, appeal_text, image_path, submitted_by, created_at, updated_at
    FROM video_appeals WHERE video_id = ? ORDER BY group_no`).all(videoId);
}

function resolveUpload(filePath) {
  if (!filePath?.startsWith('/uploads/')) return null;
  const resolved = path.resolve(uploadsDir, filePath.slice('/uploads/'.length));
  return resolved.startsWith(path.resolve(uploadsDir) + path.sep) ? resolved : null;
}

function safeDelete(filePath) {
  if (!filePath) return;
  try { fs.unlinkSync(filePath); } catch (error) { if (error.code !== 'ENOENT') console.error(error); }
}

module.exports = router;
