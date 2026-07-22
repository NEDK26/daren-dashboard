(function registerDarenModules(global) {
  global.DAREN_MODULES = Object.freeze({
    pageCapabilities: Object.freeze({
      fees: 'feeCheck',
      accounts: 'accountManagement',
      audit: 'auditLogs',
      'batch-switch': 'batchManagement',
      settings: 'accountManagement'
    }),
    modules: Object.freeze([
      { key: 'data-check', capability: 'dataCheck', pages: ['darens', 'videos'] },
      { key: 'batch-management', capability: 'batchManagement', pages: ['batches', 'batch-switch'] },
      { key: 'account-management', capability: 'accountManagement', pages: ['accounts', 'settings'] },
      { key: 'appeals', capability: 'appeals', pages: ['appeal-drawer'] },
      { key: 'anomaly-marking', capability: 'anomalyMarking', pages: ['anomaly-markers'] },
      { key: 'import-export', capability: 'importExport', pages: ['import', 'export'] },
      { key: 'audit', capability: 'auditLogs', pages: ['audit'] },
      { key: 'fee-check', capability: 'feeCheck', pages: ['fees'] }
    ])
  });
})(window);

