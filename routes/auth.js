const express = require('express');
const router = express.Router();
const { getDb, prepare } = require('../db');
const { verifyPassword } = require('../auth');
const { loginRateLimiter } = require('../services/loginRateLimiter');

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '用户名和密码必填' });

  const clientIp = req.ip || req.socket?.remoteAddress || 'unknown';
  const rateKey = String(username).trim().toLowerCase();
  const rateStatus = loginRateLimiter.check(clientIp, rateKey);
  if (!rateStatus.allowed) {
    res.set('Retry-After', String(Math.ceil(rateStatus.retryAfterMs / 1000)));
    return res.status(429).json({ error: '尝试次数过多，请稍后再试' });
  }

  const user = prepare('SELECT * FROM users WHERE display_name = ?').get(username);
  if (!user || !verifyPassword(password, user.password_hash)) {
    const failure = loginRateLimiter.recordFailure(clientIp, rateKey);
    if (!failure.allowed) {
      res.set('Retry-After', String(Math.ceil(failure.retryAfterMs / 1000)));
      return res.status(429).json({ error: '尝试次数过多，请稍后再试' });
    }
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  loginRateLimiter.clear(clientIp, rateKey);
  req.session.user = { id: user.id, display_name: user.display_name, role: user.role };
  res.json({ ok: true, user: req.session.user });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get('/me', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: '未登录' });
  res.json({ user: req.session.user });
});

module.exports = router;
