class LoginRateLimiter {
  constructor({
    now = () => Date.now(),
    maxFailures = 5,
    ipMaxFailures = maxFailures * 4,
    windowMs = 10 * 60 * 1000,
    lockMs = 15 * 60 * 1000,
    maxEntries = 10000
  } = {}) {
    this.now = now;
    this.maxFailures = maxFailures;
    this.ipMaxFailures = ipMaxFailures;
    this.windowMs = windowMs;
    this.lockMs = lockMs;
    this.maxEntries = maxEntries;
    this.buckets = new Map();
  }

  cleanup(now) {
    for (const [key, bucket] of this.buckets) {
      if (now - bucket.windowStart >= this.windowMs && bucket.lockedUntil <= now) this.buckets.delete(key);
    }
    while (this.buckets.size > this.maxEntries) this.buckets.delete(this.buckets.keys().next().value);
  }

  keys(ip, username) {
    const normalizedIp = String(ip || 'unknown');
    const normalizedUsername = String(username || '').trim().toLowerCase();
    return [
      { key: `account:${normalizedIp}:${normalizedUsername}`, maxFailures: this.maxFailures },
      { key: `ip:${normalizedIp}`, maxFailures: this.ipMaxFailures }
    ];
  }

  getBucket(key, now) {
    const current = this.buckets.get(key);
    if (!current || now - current.windowStart >= this.windowMs || (current.lockedUntil && current.lockedUntil <= now)) {
      const fresh = { failures: 0, windowStart: now, lockedUntil: 0 };
      this.buckets.set(key, fresh);
      return fresh;
    }
    return current;
  }

  check(ip, username) {
    const now = this.now();
    this.cleanup(now);
    let retryAfterMs = 0;
    for (const { key } of this.keys(ip, username)) {
      const bucket = this.getBucket(key, now);
      if (bucket.lockedUntil > now) retryAfterMs = Math.max(retryAfterMs, bucket.lockedUntil - now);
    }
    return retryAfterMs > 0 ? { allowed: false, retryAfterMs } : { allowed: true, retryAfterMs: 0 };
  }

  recordFailure(ip, username) {
    const now = this.now();
    this.cleanup(now);
    let retryAfterMs = 0;
    for (const { key, maxFailures } of this.keys(ip, username)) {
      const bucket = this.getBucket(key, now);
      bucket.failures++;
      if (bucket.failures >= maxFailures) bucket.lockedUntil = now + this.lockMs;
      if (bucket.lockedUntil > now) retryAfterMs = Math.max(retryAfterMs, bucket.lockedUntil - now);
    }
    return retryAfterMs > 0 ? { allowed: false, retryAfterMs } : { allowed: true, retryAfterMs: 0 };
  }

  clear(ip, username) {
    for (const { key } of this.keys(ip, username)) this.buckets.delete(key);
  }
}

const loginRateLimiter = new LoginRateLimiter();

module.exports = { LoginRateLimiter, loginRateLimiter };
