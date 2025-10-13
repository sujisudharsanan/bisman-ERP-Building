const express = require('express');
const router = express.Router();

router.get('/purchase/health', (req, res) => {
  res.json({ success: true, module: 'purchase', status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = { router };
