const excelFields = [
  { header: '全网昵称', key: 'nickname', required: true },
  { header: '机构名称', key: 'organization' },
  { header: '内容类型', key: 'content_type' },
  { header: '达人分类', key: 'category' },
  { header: '平台', key: 'platform' },
  { header: '是否主平台', key: 'is_main_platform' },
  { header: '平台昵称', key: 'platform_nickname' },
  { header: '主页链接', key: 'homepage_url' },
  { header: '账号', key: 'account' },
  { header: '粉丝数', key: 'followers' },
  { header: '作品ID', key: 'work_id', required: true },
  { header: '视频平台', key: 'v_platform' },
  { header: '视频标题', key: 'title' },
  { header: '作品描述标签', key: 'tags' },
  { header: '内容链接', key: 'content_url' },
  { header: '时长', key: 'duration' },
  { header: '发布时间', key: 'publish_time' },
  { header: 'DA播放量', key: 'da_plays' },
  { header: '播放量截图', key: 'screenshot_plays' },
  { header: 'DA点赞量', key: 'da_likes' },
  { header: '点赞量截图', key: 'screenshot_likes' },
  { header: 'DA7日播放', key: 'da_7d_plays' },
  { header: '7日播放量截图', key: 'screenshot_7d_plays' },
  { header: 'DA7日点赞', key: 'da_7d_likes' },
  { header: '7日点赞量截图', key: 'screenshot_7d_likes' },
  { header: '评论量', key: 'comments' },
  { header: '收藏量', key: 'saves' },
  { header: '转发量', key: 'shares' },
  { header: '违规状态', key: 'violation_status', aliases: ['违规状态(未违规/违规)'] },
  { header: '违规描述', key: 'violation_desc' },
  { header: '合规状态', key: 'compliance_status', aliases: ['合规状态(不合规/合规)'] },
  { header: '合规异常描述', key: 'compliance_desc' },
  { header: '是否是节点', key: 'is_node' },
  { header: '参与节点名称', key: 'node_name' },
  { header: '是否是爆款', key: 'is_hot' },
  { header: '申诉文字1', key: 'appeal_text_1', aliases: ['申诉'] },
  { header: '申诉图片1', key: 'appeal_image_1' },
  { header: '申诉文字2', key: 'appeal_text_2' },
  { header: '申诉图片2', key: 'appeal_image_2' },
  { header: '申诉文字3', key: 'appeal_text_3' },
  { header: '申诉图片3', key: 'appeal_image_3' },
];

const exportColumns = excelFields.map(({ header, key }) => ({ header, key }));

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/[（]/g, '(')
    .replace(/[）]/g, ')')
    .toLowerCase();
}

function buildHeaderMap(headerRow) {
  const byHeader = new Map(excelFields.flatMap(field =>
    [field.header, ...(field.aliases || [])].map(header => [normalizeHeader(header), field])
  ));
  const columns = {};

  headerRow.eachCell((cell, colNumber) => {
    const field = byHeader.get(normalizeHeader(cell.text));
    if (field) columns[field.key] = colNumber;
  });

  const missing = excelFields
    .filter(field => field.required && !columns[field.key])
    .map(field => field.header);
  if (missing.length) throw new Error(`缺少必填列：${missing.join('、')}`);

  return columns;
}

module.exports = { excelFields, exportColumns, buildHeaderMap };
