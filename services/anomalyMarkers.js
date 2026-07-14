const SCREENSHOT_ANOMALY_FIELDS = [
  'screenshot_plays',
  'screenshot_likes',
  'screenshot_7d_plays',
  'screenshot_7d_likes'
];

function updateScreenshotAnomalies(rawAnomalyData, selectedFields) {
  const selected = new Set(selectedFields || []);
  for (const field of selected) {
    if (!SCREENSHOT_ANOMALY_FIELDS.includes(field)) throw new Error('截图异常字段无效: ' + field);
  }

  let anomalies = {};
  try {
    const parsed = JSON.parse(rawAnomalyData || '{}');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) anomalies = { ...parsed };
  } catch {}

  const changes = {};
  for (const field of SCREENSHOT_ANOMALY_FIELDS) {
    const oldValue = String(anomalies[field] ?? '');
    const newValue = selected.has(field) ? '数据异常' : '';
    if (oldValue === newValue) continue;
    if (newValue) anomalies[field] = newValue;
    else delete anomalies[field];
    changes[field] = { old: oldValue, new: newValue };
  }

  return { anomalyData: JSON.stringify(anomalies), changes };
}

module.exports = { SCREENSHOT_ANOMALY_FIELDS, updateScreenshotAnomalies };
