const express = require('express');
const { createHealthHandler } = require('../services/deployment-health');

const router = express.Router();

router.get('/health', createHealthHandler());

module.exports = router;
