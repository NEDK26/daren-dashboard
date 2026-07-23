const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('video screenshot columns follow their matching metrics', () => {
  const source = fs.readFileSync(path.join(__dirname, '../public/video-components.jsx'), 'utf8');
  const columns = [
    ["title: 'DA播放'", "title: '播放截图'"],
    ["title: 'DA点赞'", "title: '点赞截图'"],
    ["title: '7日播放'", "title: '7日播放截图'"],
    ["title: '7日点赞'", "title: '7日点赞截图'"]
  ];

  for (const [metric, screenshot] of columns) {
    assert.ok(source.indexOf(metric) < source.indexOf(screenshot), `${screenshot} should follow ${metric}`);
  }
  assert.equal(source.includes("title: '截图', key: 'screenshots'"), false);
});
