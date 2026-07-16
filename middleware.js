const { prepare } = require('./db');

const FIELD_LABELS = {
  organization: '机构', content_type: '内容类型', category: '分类', platform: '平台',
  platform_nickname: '平台昵称', homepage_url: '主页链接', account: '账号', followers: '粉丝数',
  title: '视频标题', tags: '标签', content_url: '内容链接', duration: '时长', publish_time: '发布时间',
  da_plays: '播放量', da_likes: '点赞数', da_7d_plays: '7日播放量', da_7d_likes: '7日点赞数',
  comments: '评论数', saves: '收藏数', shares: '分享数', violation_status: '违规状态',
  violation_desc: '违规说明', compliance_status: '合规状态', compliance_desc: '合规说明',
  is_node: '是否节点', node_name: '节点名称', is_hot: '是否爆款', appeal: '申诉说明',
  confirmation_status: '确认状态', screenshot_plays: '播放截图', screenshot_likes: '点赞截图',
  screenshot_7d_plays: '7日播放截图', screenshot_7d_likes: '7日点赞截图',
  appeal_text_1: '申诉文字1', appeal_image_1: '申诉图片1',
  appeal_text_2: '申诉文字2', appeal_image_2: '申诉图片2',
  appeal_text_3: '申诉文字3', appeal_image_3: '申诉图片3',
  editable_columns: '可编辑列'
};

function requireLogin(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: '未登录' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: '未登录' });
  if (req.session.user.role !== 'admin') return res.status(403).json({ error: '需要管理员权限' });
  next();
}

function operationLog(req, event) {
  const changes = event.changes || [];
  prepare(`INSERT INTO operation_logs
    (batch_id, batch_name, operator_name, action_type, subject_type, subject_id, subject_name, subject_nickname, changes_json, result)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    event.batchId || null,
    event.batchName || '',
    event.operatorName || req.session.user.display_name,
    event.actionType || '修改数据',
    event.subjectType || '数据',
    event.subjectId == null ? '' : String(event.subjectId),
    event.subjectName || '-',
    event.subjectNickname || '',
    JSON.stringify(changes),
    event.result || '成功'
  );
}

function auditLog(req, tableName, recordId, fieldChanges, actionType = '修改数据') {
  const changes = Object.entries(fieldChanges)
    .filter(([, change]) => String(change.old ?? '') !== String(change.new ?? ''))
    .map(([field, change]) => ({
      field: FIELD_LABELS[field] || field,
      old: String(change.old ?? ''),
      new: String(change.new ?? '')
    }));
  if (!changes.length) return;

  const subject = tableName === 'videos'
    ? prepare(`SELECT v.id, v.title, v.work_id, d.nickname, b.id AS batch_id, b.name AS batch_name
        FROM videos v JOIN darens d ON d.id = v.daren_id JOIN batches b ON b.id = v.batch_id WHERE v.id = ?`).get(recordId)
    : prepare(`SELECT d.id, d.nickname, b.id AS batch_id, b.name AS batch_name
        FROM darens d JOIN batches b ON b.id = d.batch_id WHERE d.id = ?`).get(recordId);

  operationLog(req, {
    actionType,
    subjectType: tableName === 'videos' ? '视频' : '达人',
    subjectId: recordId,
    subjectName: tableName === 'videos' ? (subject?.title || subject?.work_id || `视频 #${recordId}`) : (subject?.nickname || `达人 #${recordId}`),
    subjectNickname: subject?.nickname || '',
    batchId: subject?.batch_id,
    batchName: subject?.batch_name,
    changes
  });
}

module.exports = { requireLogin, requireAdmin, auditLog, operationLog, FIELD_LABELS };
