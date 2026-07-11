const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { LoginRateLimiter } = require('../services/loginRateLimiter');

test('allows initial failures and locks a repeated IP/username after the threshold', () => {
  let now = 0;
  const limiter = new LoginRateLimiter({ now: () => now, maxFailures: 5, windowMs: 10 * 60 * 1000, lockMs: 15 * 60 * 1000 });

  for (let i = 0; i < 4; i++) {
    assert.equal(limiter.check('1.2.3.4', 'alice').allowed, true);
    limiter.recordFailure('1.2.3.4', 'alice');
  }
  assert.equal(limiter.check('1.2.3.4', 'alice').allowed, true);
  const result = limiter.recordFailure('1.2.3.4', 'alice');
  assert.equal(result.allowed, false);
  assert.equal(limiter.check('1.2.3.4', 'alice').allowed, false);

  now += 15 * 60 * 1000;
  assert.equal(limiter.check('1.2.3.4', 'alice').allowed, true);
});

test('success clears the IP and username failure records', () => {
  const limiter = new LoginRateLimiter({ maxFailures: 2 });
  limiter.recordFailure('1.2.3.4', 'alice');
  limiter.recordFailure('1.2.3.4', 'alice');
  assert.equal(limiter.check('1.2.3.4', 'alice').allowed, false);

  limiter.clear('1.2.3.4', 'alice');
  assert.equal(limiter.check('1.2.3.4', 'alice').allowed, true);
});

test('IP-level limit catches attempts spread across usernames', () => {
  const limiter = new LoginRateLimiter({ maxFailures: 5, ipMaxFailures: 3 });
  limiter.recordFailure('1.2.3.4', 'alice');
  limiter.recordFailure('1.2.3.4', 'bob');
  const result = limiter.recordFailure('1.2.3.4', 'carol');
  assert.equal(result.allowed, false);
});

test('login route uses the limiter and returns retry metadata for lockouts', () => {
  const auth = fs.readFileSync(path.join(__dirname, '../routes/auth.js'), 'utf8');
  assert.match(auth, /loginRateLimiter/);
  assert.match(auth, /status\(429\)/);
  assert.match(auth, /Retry-After/);
});
