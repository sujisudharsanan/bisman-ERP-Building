const express = require('express');
const router = express.Router();

router.get('/hr/health', (req, res) => {
  res.json({ success: true, module: 'hr', status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = { router };
