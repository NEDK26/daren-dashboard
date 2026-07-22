const CAPABILITIES = Object.freeze({
  dataCheck: '数据核对',
  batchManagement: '批次管理',
  accountManagement: '达人账号管理',
  appeals: '视频申诉',
  anomalyMarking: '异常标记',
  importExport: '导入导出',
  auditLogs: '操作日志',
  feeCheck: '费用核对'
});

const capabilityNames = Object.freeze(Object.keys(CAPABILITIES));

function validateCapabilities(capabilities) {
  if (!capabilities || typeof capabilities !== 'object' || Array.isArray(capabilities)) {
    throw new Error('部署配置缺少 capabilities');
  }

  for (const [name, enabled] of Object.entries(capabilities)) {
    if (!Object.prototype.hasOwnProperty.call(CAPABILITIES, name)) {
      throw new Error(`未知能力：${name}`);
    }
    if (typeof enabled !== 'boolean') {
      throw new Error(`能力 ${name} 必须是布尔值`);
    }
  }

  for (const name of capabilityNames) {
    if (!Object.prototype.hasOwnProperty.call(capabilities, name)) {
      throw new Error(`部署配置缺少能力：${name}`);
    }
  }
}

function assertCapabilityName(name) {
  if (!capabilityNames.includes(name)) throw new Error(`未知能力：${name}`);
}

module.exports = { CAPABILITIES, capabilityNames, validateCapabilities, assertCapabilityName };
