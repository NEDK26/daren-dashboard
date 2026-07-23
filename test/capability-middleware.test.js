const test = require('node:test');
const assert = require('node:assert/strict');

const { createCapabilityGuard } = require('../middleware');

function responseDouble() {
  return {
    statusCode: null,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    }
  };
}

test('enabled capability allows the request to continue', () => {
  const guard = createCapabilityGuard('appeals', {
    capabilities: { appeals: true }
  });
  const response = responseDouble();
  let continued = false;

  guard({}, response, () => {
    continued = true;
  });

  assert.equal(continued, true);
  assert.equal(response.statusCode, null);
});

test('disabled capability returns a forbidden response', () => {
  const guard = createCapabilityGuard('appeals', {
    capabilities: { appeals: false }
  });
  const response = responseDouble();

  guard({}, response, () => assert.fail('disabled capability must not continue'));

  assert.equal(response.statusCode, 403);
  assert.deepEqual(response.payload, {
    code: 'CAPABILITY_DISABLED',
    error: '当前部署未启用该功能',
    capability: 'appeals'
  });
});

test('capability guard rejects unknown capability names', () => {
  assert.throws(() => createCapabilityGuard('unknown', {
    capabilities: {}
  }), /未知能力/);
});

test('disabling and re-enabling a capability never mutates stored data', () => {
  const records = [{ id: 7, title: '历史视频', appeal: '保留申诉记录' }];
  const snapshot = JSON.parse(JSON.stringify(records));
  const disabled = createCapabilityGuard('appeals', {
    capabilities: { appeals: false }
  });
  const blockedResponse = responseDouble();

  disabled({}, blockedResponse, () => assert.fail('disabled capability must not enter the route'));
  assert.deepEqual(records, snapshot);

  const enabled = createCapabilityGuard('appeals', {
    capabilities: { appeals: true }
  });
  let continued = false;
  enabled({}, responseDouble(), () => {
    continued = true;
  });

  assert.equal(continued, true);
  assert.deepEqual(records, snapshot);
});
