// server.js - Start Express API and optionally serve the exported Next.js app
try { require('dotenv').config(); } catch (_) {}

const path = require('path');
const fs = require('fs');
const express = require('express');
const app = require('./app');

// Serve static frontend if present (built by Next.js export)
// Expected path inside container: /app/frontend/out
const staticDir = path.resolve(__dirname, 'frontend', 'out');
if (fs.existsSync(staticDir)) {
  app.use(express.static(staticDir, {
    extensions: ['html'],
    maxAge: '1h',
    index: 'index.html',
  }));

  // Catch-all for client-side routing; keep AFTER API routes defined in app.js
  app.get('*', (req, res) => {
    res.sendFile(path.join(staticDir, 'index.html'));
  });
} else {
  console.warn(`[startup] Frontend static directory not found: ${staticDir}`);
}

// Railway provides PORT; default to 8080 inside container
const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0', () => {
  console.log(`[startup] API + UI listening on http://0.0.0.0:${port}`);
});
