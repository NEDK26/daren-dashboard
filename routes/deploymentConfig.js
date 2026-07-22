const express = require('express');
const { getPublicDeploymentConfig } = require('../config');

const router = express.Router();

router.get('/deployment-config', (req, res) => {
  res.json({ config: getPublicDeploymentConfig() });
});

module.exports = router;
