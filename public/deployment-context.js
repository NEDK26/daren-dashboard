(function registerDeploymentContext(global) {
  global.DAREN_DEPLOYMENT = Object.freeze({
    load: () => global.DAREN_API.get('/api/deployment-config').then(response => {
      if (!response.config) throw new Error('部署配置缺失');
      return response.config;
    }),
    applyBranding: config => {
      if (config?.branding?.title) document.title = config.branding.title;
      return config;
    }
  });
})(window);

