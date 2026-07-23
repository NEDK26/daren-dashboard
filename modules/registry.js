const { assertCapabilityName } = require('../config');

const modules = Object.freeze([
  {
    key: 'appeals',
    capability: 'appeals',
    dependencies: ['dataCheck'],
    routes: ['/api/appeals'],
    pages: ['appeal-drawer'],
    status: 'active'
  },
  {
    key: 'data-check',
    capability: 'dataCheck',
    dependencies: ['batchManagement'],
    routes: ['/api/darens', '/api/videos'],
    pages: ['darens', 'videos'],
    status: 'active'
  },
  {
    key: 'batch-management',
    capability: 'batchManagement',
    dependencies: [],
    routes: ['/api/batches'],
    pages: ['batches', 'batch-switch'],
    status: 'active'
  },
  {
    key: 'anomaly-marking',
    capability: 'anomalyMarking',
    dependencies: ['dataCheck'],
    routes: ['/api/videos/:id/anomaly-markers'],
    pages: ['anomaly-markers'],
    status: 'active'
  },
  {
    key: 'account-management',
    capability: 'accountManagement',
    dependencies: ['batchManagement'],
    routes: ['/api/user-accounts', '/api/settings/editable-columns'],
    pages: ['accounts', 'settings'],
    status: 'active'
  },
  {
    key: 'import-export',
    capability: 'importExport',
    dependencies: ['batchManagement', 'dataCheck'],
    routes: ['/api/import', '/api/export'],
    pages: ['import', 'export'],
    status: 'active'
  },
  {
    key: 'audit',
    capability: 'auditLogs',
    dependencies: [],
    routes: ['/api/audit-logs'],
    pages: ['audit'],
    status: 'active'
  },
  {
    key: 'fee-check',
    capability: 'feeCheck',
    dependencies: ['dataCheck'],
    routes: [],
    pages: ['fees'],
    status: 'planned'
  }
]);

function validateModule(module) {
  if (!module || typeof module !== 'object' || !module.key) throw new Error('模块缺少 key');
  assertCapabilityName(module.capability);
  if (!Array.isArray(module.dependencies) || !Array.isArray(module.routes) || !Array.isArray(module.pages)) {
    throw new Error(`模块 ${module.key} 元数据不完整`);
  }
  return module;
}

function getModule(key) {
  return modules.find(module => module.key === key) || null;
}

modules.forEach(validateModule);

module.exports = { modules, getModule, validateModule };
