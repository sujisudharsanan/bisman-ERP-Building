const express = require('express');
const router = express.Router();

// Simple endpoint to verify that CORS works for allowed origins
router.get('/test-cors', (req, res) => {
  const origin = req.headers.origin || req.headers.host || 'unknown';
  res.json({
    status: 'ok',
    message: 'CORS is configured correctly!',
    origin,
  });
});

module.exports = router;
