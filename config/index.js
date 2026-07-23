const { assertCapabilityName, validateCapabilities } = require('./capabilities');
const { getPublicModules, validateDeploymentModules } = require('../modules/registry');

const profiles = {
  default: require('./deployments/default'),
  sj: require('./deployments/sj')
};

function validateDeploymentConfig(config) {
  if (!config || typeof config !== 'object') throw new Error('部署配置无效');
  if (!config.identity?.code) throw new Error('部署配置缺少 identity.code');
  if (!config.branding?.title || !config.branding?.logo) throw new Error('部署配置缺少品牌信息');
  validateCapabilities(config.capabilities);
  validateDeploymentModules(config.capabilities);
  return config;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadDeploymentConfig(profileCode = process.env.DEPLOYMENT_PROFILE || 'default') {
  const normalized = String(profileCode || '').trim();
  const profile = profiles[normalized];
  if (!profile) throw new Error(`未知部署配置：${normalized || '(空)'}`);
  const config = clone(profile);
  if (config.identity.code !== normalized) throw new Error(`部署配置身份不匹配：${normalized}`);
  return validateDeploymentConfig(config);
}

function getDeploymentConfig() {
  if (process.env.NODE_ENV === 'production' && !String(process.env.DEPLOYMENT_PROFILE || '').trim()) {
    throw new Error('生产环境必须显式设置 DEPLOYMENT_PROFILE');
  }
  return loadDeploymentConfig();
}

function getPublicDeploymentConfig(config = getDeploymentConfig()) {
  validateDeploymentConfig(config);
  return {
    identity: { ...config.identity },
    branding: { ...config.branding },
    capabilities: { ...config.capabilities },
    modules: getPublicModules()
  };
}

module.exports = {
  profiles,
  loadDeploymentConfig,
  getDeploymentConfig,
  getPublicDeploymentConfig,
  validateDeploymentConfig,
  assertCapabilityName
};
