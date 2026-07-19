const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../public/style.css'), 'utf8');
const route = fs.readFileSync(path.join(__dirname, '../routes/darens.js'), 'utf8');
const darenList = app.slice(app.indexOf('function DarenList'), app.indexOf('function VideoDetail'));

test('admin data check is organized as a batch workspace with a contextual rail', () => {
  assert.match(app, /className="admin-review-page"/);
  assert.match(app, /className="admin-review-header"/);
  assert.match(app, /当前批次概览/);
  assert.match(app, /const batchTotal = statusCounts\.pending \+ statusCounts\.confirmed \+ statusCounts\.appealed/);
  assert.match(app, /batchTotal\.toLocaleString\(\)/);
  assert.doesNotMatch(app, /const historyBatches/);
  assert.doesNotMatch(app, /<h2>历史批次<\/h2>/);
  assert.match(app, /最近操作/);
  assert.match(app, /查看全部操作/);
  assert.match(css, /\.admin-review-layout\s*\{/);
  assert.match(css, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+300px/);
});

test('admin summary rail starts at the page top beside the main heading', () => {
  assert.match(app, /className="admin-review-layout"[\s\S]*className="admin-review-main"[\s\S]*className="admin-review-header"[\s\S]*className="admin-review-batch-picker"[\s\S]*className="admin-review-rail"/);
});

test('admin page heading keeps only the data reconciliation title', () => {
  assert.match(app, /<header className="admin-review-header">[\s\S]*<h1>数据核对<\/h1>/);
  assert.doesNotMatch(app, /className="page-eyebrow"/);
  assert.doesNotMatch(app, /查看当前批次的达人状态，优先处理异常数据与待确认任务/);
});

test('admin table prioritizes reconciliation fields and explicit actions', () => {
  assert.match(darenList, /title:\s*'达人分类',\s*dataIndex:\s*'category'/);
  assert.doesNotMatch(darenList, /title:\s*'平台',\s*dataIndex:\s*'platform'/);
  assert.match(darenList, /title: '异常情况'/);
  assert.match(darenList, /title: '核对状态'/);
  assert.match(darenList, /查看核对/);
  assert.doesNotMatch(darenList, /title: '主页链接'/);
});

test('admin filters send status and anomaly constraints without a platform filter', () => {
  assert.match(app, /params\.set\('confirmationStatus', confirmationStatus\)/);
  assert.match(app, /params\.set\('hasAnomaly', hasAnomaly\)/);
  assert.doesNotMatch(darenList, /params\.set\('platform', platform\)/);
  assert.doesNotMatch(darenList, /placeholder="全部平台"/);
  assert.match(darenList, /<Select placeholder="状态"/);
  assert.match(darenList, /<Select placeholder="异常"/);
  assert.doesNotMatch(darenList, /placeholder="全部状态"|placeholder="全部异常"/);
  assert.match(route, /if \(confirmationStatus\)/);
  assert.match(route, /if \(hasAnomaly === 'yes'\)/);
});

test('admin filter controls stay on one row on the review page', () => {
  assert.match(css, /\.admin-review-filters\s*\{[^}]*flex-wrap:\s*nowrap/s);
  assert.match(css, /@media \(max-width: 960px\)[\s\S]*\.admin-review-filters\s*\{[^}]*overflow-x:\s*auto/s);
});

test('admin batch selection lives in the page header instead of the sidebar footer', () => {
  assert.doesNotMatch(app, /isAdmin && <div className="workspace-batch-control"/);
  assert.match(app, /admin-review-batch-picker/);
  assert.match(app, /onClick=\{onOpenBatches\}[\s\S]*?>批次管理</);
  assert.match(app, /onClick=\{onOpenSettings\}[\s\S]*?>核对设置</);
});

test('batch tools and status cards share the main-column width without a current-batch label', () => {
  assert.match(app, /className="admin-review-main"[\s\S]*className="admin-review-batch-picker"[\s\S]*className="confirmation-summary-card/);
  assert.doesNotMatch(app, /<span>当前批次<\/span>/);
});

test('filters and table share one frame and export has an icon', () => {
  assert.match(app, /className="admin-review-data-card"[\s\S]*className="toolbar admin-review-filters"[\s\S]*className="admin-review-table"/);
  assert.match(app, /className="export-icon"/);
  assert.match(css, /\.admin-review-data-card\s*\{[^}]*border:\s*1px solid var\(--border\)/s);
  assert.doesNotMatch(css, /\.admin-review-table\s*\{[^}]*border:\s*1px solid var\(--border\)/s);
});

test('admin table uses one frame and moves the total into a relaxed pagination footer', () => {
  assert.doesNotMatch(app, /className="admin-review-table-meta"/);
  assert.match(app, /className="admin-review-table"[\s\S]*pagination=\{false\}[\s\S]*className="admin-review-table-footer"[\s\S]*共 \{total\.toLocaleString\(\)\} 位达人[\s\S]*<Pagination/);
  assert.match(app, /showLessItems/);
  assert.match(css, /\.admin-review-table \.ant-table\s*\{[^}]*border:\s*0/s);
  assert.match(css, /\.admin-review-table-footer\s*\{[^}]*justify-content:\s*space-between/s);
});

test('batch action bar is unboxed and its contextual actions have icons', () => {
  assert.match(css, /\.admin-review-batch-picker\s*\{[^}]*padding:\s*0;[^}]*border:\s*0;/s);
  assert.match(app, /className="toolbar-action-icon refresh-icon"/);
  assert.match(app, /className="toolbar-action-icon batch-icon"/);
  assert.match(app, /className="toolbar-action-icon settings-icon"/);
});

test('confirmation summary keeps only status text and counts', () => {
  assert.doesNotMatch(app, /confirmation-summary-icon/);
  assert.match(app, /className="confirmation-summary-label">待确认<\/div>[\s\S]*<strong>\{statusCounts\.pending\}<\/strong>/);
  assert.match(app, /className="confirmation-summary-label">已确认<\/div>[\s\S]*<strong>\{statusCounts\.confirmed\}<\/strong>/);
  assert.match(app, /className="confirmation-summary-label">已申诉<\/div>[\s\S]*<strong>\{statusCounts\.appealed\}<\/strong>/);
  assert.match(css, /\.confirmation-summary-card\s*\{[^}]*gap:\s*12px;[^}]*background:\s*transparent;[^}]*border:\s*0;/s);
  assert.match(css, /\.confirmation-summary-item\s*\{[^}]*flex-direction:\s*column;[^}]*align-items:\s*flex-start;[^}]*border:\s*1px solid var\(--border\)/s);
  assert.doesNotMatch(css, /\.confirmation-summary-icon/);
  assert.doesNotMatch(css, /\.status-rail\s*\{[^}]*border-top:\s*3px solid var\(--ink\)/s);
});
