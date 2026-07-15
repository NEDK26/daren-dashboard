const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('daren list returns confirmation status summary counts', () => {
  const route = fs.readFileSync(path.join(__dirname, '../routes/darens.js'), 'utf8');
  assert.match(route, /SUM\(CASE WHEN d\.confirmation_status = '待确认'/);
  assert.match(route, /SUM\(CASE WHEN d\.confirmation_status = '已确认'/);
  assert.match(route, /SUM\(CASE WHEN d\.confirmation_status = '已提交申诉'/);
  assert.match(route, /statusCounts/);
});

test('admin frontend renders the three confirmation summary metrics', () => {
  const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '../public/style.css'), 'utf8');
  assert.match(app, /confirmation-summary-card/);
  assert.match(app, /status-rail/);
  assert.match(css, /\.status-rail\s*\{/);
  assert.match(app, /待确认/);
  assert.match(app, /已确认/);
  assert.match(app, /已提交申诉/);
});

test('daren anomaly counts use a soft filled badge instead of an outlined tag', () => {
  const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '../public/style.css'), 'utf8');

  assert.match(app, /className="anomaly-count-badge"/);
  assert.match(app, /className="daren-name-cell"/);
  assert.doesNotMatch(app, /anomaly_count > 0 && <Tag color="red"/);
  assert.match(css, /--danger-soft:\s*#fff1f0/);
  assert.match(css, /\.anomaly-count-badge\s*\{[^}]*background:\s*var\(--danger-soft\)[^}]*color:\s*var\(--danger\)[^}]*border:\s*0/s);
  assert.match(css, /\.daren-name-cell\s+\.data-link\s*\{[^}]*white-space:\s*nowrap[^}]*text-overflow:\s*ellipsis/s);
});
