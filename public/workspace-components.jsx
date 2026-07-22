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
  const navButton = (key, label, onClick, muted = false) => <button key={key} type="button" className={'workspace-nav-item ' + (key === 'data' && dataActive || page === key ? 'active' : '') + (muted ? ' muted' : '')} onClick={onClick}><span>{label}</span></button>;
  return <aside className="workspace-sidebar"><button type="button" className="workspace-brand" onClick={onDataCheck}><img src={branding.logo} alt="" aria-hidden="true" /><span>{branding.title}</span></button><nav className="workspace-navigation" aria-label="工作区导航"><section><div className="workspace-nav-label">{isAdmin ? '本期工作台' : '我的工作台'}</div>{capabilities.dataCheck && navButton('data', isAdmin ? '数据核对' : '本期数据', onDataCheck)}{isAdmin && capabilities.feeCheck && navButton('fees', '费用核对', onFeeCheck, true)}</section>{isAdmin && capabilities.accountManagement && <section><div className="workspace-nav-label">基础工作台</div>{navButton('accounts', '达人账号管理', onAccounts)}</section>}{!isAdmin && <section><div className="workspace-nav-label">更多</div>{capabilities.batchManagement && navButton('batch-switch', '切换批次', () => onNavigate('batch-switch'))}{capabilities.auditLogs && navButton('audit', '我的记录', () => onNavigate('audit'))}<button type="button" className="workspace-nav-item" onClick={onPassword}><span>账户设置</span></button></section>}</nav><div className="workspace-sidebar-footer"><Dropdown menu={accountMenu} trigger={['click']} placement="topLeft"><button className="workspace-account" type="button" aria-label={`${user.display_name}，打开账户菜单`}><span className="workspace-avatar" aria-hidden="true">{isAdmin ? '管' : '达'}</span><span><strong>{user.display_name}</strong><small>{isAdmin ? '管理员' : '达人账号'}</small></span><span className="account-chevron" aria-hidden="true">⌄</span></button></Dropdown></div></aside>;
}

function MobileWorkspaceHeader({
  user,
  deploymentConfig,
  onPassword,
  onLogout
}) {
  const branding = deploymentConfig.branding;
  return <div className="mobile-workspace-header"><div className="app-brand"><img className="header-logo" src={branding.logo} alt="" aria-hidden="true" /><h2>{branding.title}</h2></div><Dropdown menu={{
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
    }} trigger={['click']} placement="bottomRight"><button className="account-trigger" type="button"><span className="account-name">{user.display_name}</span><span aria-hidden="true">⌄</span></button></Dropdown></div>;
}

