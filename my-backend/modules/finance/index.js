const express = require('express');
const router = express.Router();

router.get('/finance/health', (req, res) => {
  res.json({ success: true, module: 'finance', status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = { router };
