const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const app = fs.readFileSync(path.join(__dirname, '../public/video-components.jsx'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../public/style.css'), 'utf8');

test('creator data uses a main workspace with a separate review rail', () => {
  assert.match(app, /creator-page-header/);
  assert.match(app, /creator-review-layout/);
  assert.match(app, /creator-review-rail/);
  assert.match(app, /查看异常并申诉/);
  assert.match(css, /\.creator-review-layout\s*\{[^}]*grid-template-columns:/s);
  assert.match(css, /\.creator-review-rail\s*\{[^}]*position:\s*sticky/s);
});

test('review rail reflects real branch states without an account security card', () => {
  assert.match(app, /confirmationStatus === '已确认'/);
  assert.match(app, /confirmationStatus === '已提交申诉'/);
  assert.doesNotMatch(app, /账户安全提示/);
  assert.doesNotMatch(app, /creator-review-step/);
});
