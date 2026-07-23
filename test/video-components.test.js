const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', 'public');

test('video detail page is provided by the dedicated component bundle', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const video = fs.readFileSync(path.join(root, 'video-components.jsx'), 'utf8');
  const appeal = fs.readFileSync(path.join(root, 'appeal-components.jsx'), 'utf8');
  assert.doesNotMatch(app, /function VideoDetail/);
  assert.match(video, /function VideoDetail/);
  assert.match(video, /\/api\/darens\/' \+ daren\.id \+ '\/videos/);
  assert.match(appeal, /className="appeal-drawer"/);
});
