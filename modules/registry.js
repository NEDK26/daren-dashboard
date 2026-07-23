const { assertCapabilityName } = require('../config/capabilities');

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
  module.dependencies.forEach(assertCapabilityName);
  return module;
}

function validateModuleRegistry(moduleList) {
  const keys = new Set();
  const capabilities = new Set();
  const pages = new Map();

  for (const module of moduleList) {
    validateModule(module);
    if (keys.has(module.key)) throw new Error(`重复模块 key：${module.key}`);
    if (capabilities.has(module.capability)) throw new Error(`重复模块能力：${module.capability}`);
    keys.add(module.key);
    capabilities.add(module.capability);
    for (const page of module.pages) {
      if (pages.has(page)) throw new Error(`页面 ${page} 同时属于模块 ${pages.get(page)} 和 ${module.key}`);
      pages.set(page, module.key);
    }
  }
  return moduleList;
}

function getModule(key) {
  return modules.find(module => module.key === key) || null;
}

function getPublicModules(moduleList = modules) {
  return moduleList.map(module => ({
    key: module.key,
    capability: module.capability,
    pages: [...module.pages],
    status: module.status
  }));
}

function getPageCapabilities(moduleList = getPublicModules()) {
  return moduleList.reduce((result, module) => {
    for (const page of module.pages) result[page] = module.capability;
    return result;
  }, {});
}

function validateDeploymentModules(capabilities, moduleList = modules) {
  for (const module of moduleList) {
    if (!capabilities[module.capability]) continue;
    if (module.status !== 'active') throw new Error(`模块 ${module.key} 尚未启用`);
    for (const dependency of module.dependencies) {
      if (!capabilities[dependency]) {
        throw new Error(`模块 ${module.key} 依赖能力 ${dependency}`);
      }
    }
  }
  return capabilities;
}

validateModuleRegistry(modules);

module.exports = {
  modules,
  getModule,
  getPublicModules,
  getPageCapabilities,
  validateDeploymentModules,
  validateModule,
  validateModuleRegistry
};
