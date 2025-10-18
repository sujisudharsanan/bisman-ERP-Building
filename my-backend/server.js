// server.js - Thin wrapper to align with container CMD and Railway defaults
try { require('dotenv').config(); } catch (_) {}

const app = require('./app');

// Railway provides PORT; default to 8080 inside container
const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0', () => {
  console.log(`[startup] Backend listening on http://0.0.0.0:${port}`);
});
