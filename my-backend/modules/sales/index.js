const express = require('express');
const router = express.Router();

router.get('/sales/health', (req, res) => {
  res.json({ success: true, module: 'sales', status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = { router };
