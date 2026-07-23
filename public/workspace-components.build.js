function AppNavigation({
  user,
  page,
  onNavigate,
  placement
}) {
  const isAdmin = user.role === 'admin';
  const items = isAdmin ? [{
    key: 'darens',
    label: '达人核对',
    icon: '人'
  }, {
    key: 'batches',
    label: '批次',
    icon: '批'
  }, {
    key: 'settings',
    label: '权限',
    icon: '设'
  }, {
    key: 'audit',
    label: '操作日志',
    icon: '审'
  }] : [{
    key: 'data',
    label: '数据核对',
    icon: '数'
  }, {
    key: 'audit',
    label: '我的日志',
    icon: '记'
  }, {
    key: 'batch-switch',
    label: '切换批次',
    icon: '批'
  }];
  const activeKey = isAdmin ? page === 'videos' || page === 'home' || page === 'empty' ? 'darens' : page : page === 'videos' || page === 'empty' || page === 'home' ? 'data' : page;
  return /*#__PURE__*/React.createElement("nav", {
    className: placement === 'desktop' ? 'desktop-nav' : 'mobile-nav'
  }, items.map(item => /*#__PURE__*/React.createElement(Button, {
    key: item.key,
    type: "text",
    className: activeKey === item.key ? 'active' : '',
    onClick: () => onNavigate(item.key)
  }, /*#__PURE__*/React.createElement("span", null, item.icon), item.label)));
}
function WorkspaceSidebar({
  user,
  deploymentConfig,
  page,
  activeWorkspace,
  onDataCheck,
  onFeeCheck,
  onAccounts,
  onNavigate,
  onPassword,
  onLogout
}) {
  const isAdmin = user.role === 'admin';
  const branding = deploymentConfig.branding;
  const capabilities = deploymentConfig.capabilities || {};
  const dataActive = activeWorkspace === 'data' || ['darens', 'videos', 'empty', 'batch-switch', 'batches', 'settings'].includes(page);
  const accountMenu = {
    items: [{
      key: 'password',
      label: '修改密码'
    }, {
      key: 'logout',
      label: '退出登录'
    }],
    onClick: ({
      key
    }) => key === 'password' ? onPassword() : onLogout()
  };
  const navButton = (key, label, onClick, muted = false) => /*#__PURE__*/React.createElement("button", {
    key: key,
    type: "button",
    className: 'workspace-nav-item ' + (key === 'data' && dataActive || page === key ? 'active' : '') + (muted ? ' muted' : ''),
    onClick: onClick
  }, /*#__PURE__*/React.createElement("span", null, label));
  return /*#__PURE__*/React.createElement("aside", {
    className: "workspace-sidebar"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "workspace-brand",
    onClick: onDataCheck
  }, /*#__PURE__*/React.createElement("img", {
    src: branding.logo,
    alt: "",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", null, branding.title)), /*#__PURE__*/React.createElement("nav", {
    className: "workspace-navigation",
    "aria-label": "工作区导航"
  }, /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("div", {
    className: "workspace-nav-label"
  }, isAdmin ? '本期工作台' : '我的工作台'), capabilities.dataCheck && navButton('data', isAdmin ? '数据核对' : '本期数据', onDataCheck), isAdmin && capabilities.feeCheck && navButton('fees', '费用核对', onFeeCheck, true)), isAdmin && capabilities.accountManagement && /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("div", {
    className: "workspace-nav-label"
  }, "基础工作台"), navButton('accounts', '达人账号管理', onAccounts)), !isAdmin && /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("div", {
    className: "workspace-nav-label"
  }, "更多"), capabilities.batchManagement && navButton('batch-switch', '切换批次', () => onNavigate('batch-switch')), capabilities.auditLogs && navButton('audit', '我的记录', () => onNavigate('audit')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "workspace-nav-item",
    onClick: onPassword
  }, /*#__PURE__*/React.createElement("span", null, "账户设置")))), /*#__PURE__*/React.createElement("div", {
    className: "workspace-sidebar-footer"
  }, /*#__PURE__*/React.createElement(Dropdown, {
    menu: accountMenu,
    trigger: ['click'],
    placement: "topLeft"
  }, /*#__PURE__*/React.createElement("button", {
    className: "workspace-account",
    type: "button",
    "aria-label": `${user.display_name}，打开账户菜单`
  }, /*#__PURE__*/React.createElement("span", {
    className: "workspace-avatar",
    "aria-hidden": "true"
  }, isAdmin ? '管' : '达'), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("strong", null, user.display_name), /*#__PURE__*/React.createElement("small", null, isAdmin ? '管理员' : '达人账号')), /*#__PURE__*/React.createElement("span", {
    className: "account-chevron",
    "aria-hidden": "true"
  }, "⌄")))));
}
function MobileWorkspaceHeader({
  user,
  deploymentConfig,
  onPassword,
  onLogout
}) {
  const branding = deploymentConfig.branding;
  return /*#__PURE__*/React.createElement("div", {
    className: "mobile-workspace-header"
  }, /*#__PURE__*/React.createElement("div", {
    className: "app-brand"
  }, /*#__PURE__*/React.createElement("img", {
    className: "header-logo",
    src: branding.logo,
    alt: "",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("h2", null, branding.title)), /*#__PURE__*/React.createElement(Dropdown, {
    menu: {
      items: [{
        key: 'password',
        label: '修改密码'
      }, {
        key: 'logout',
        label: '退出登录'
      }],
      onClick: ({
        key
      }) => key === 'password' ? onPassword() : onLogout()
    },
    trigger: ['click'],
    placement: "bottomRight"
  }, /*#__PURE__*/React.createElement("button", {
    className: "account-trigger",
    type: "button"
  }, /*#__PURE__*/React.createElement("span", {
    className: "account-name"
  }, user.display_name), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "⌄"))));
}
