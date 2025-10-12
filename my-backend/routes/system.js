const express = require('express');
const os = require('os');
const router = express.Router();

// Returns Node.js process memory usage and system info
router.get('/memory-usage', (req, res) => {
  try {
    const mem = process.memoryUsage();
    const heapUsedMB = +(mem.heapUsed / 1024 / 1024).toFixed(2);
    const heapTotalMB = +(mem.heapTotal / 1024 / 1024).toFixed(2);
    const rssMB = +(mem.rss / 1024 / 1024).toFixed(2);
    const externalMB = +(mem.external / 1024 / 1024).toFixed(2);
    const arrayBuffersMB = mem.arrayBuffers ? +(mem.arrayBuffers / 1024 / 1024).toFixed(2) : null;

    const uptimeSec = process.uptime();

    const totalSysMB = +(os.totalmem() / 1024 / 1024).toFixed(2);
    const freeSysMB = +(os.freemem() / 1024 / 1024).toFixed(2);

    res.json({
      status: 'ok',
      process: {
        heapUsedMB,
        heapTotalMB,
        rssMB,
        externalMB,
        arrayBuffersMB,
        uptimeSec,
        nodeVersion: process.version,
        pid: process.pid,
      },
      system: {
        totalSysMB,
        freeSysMB,
        platform: process.platform,
        arch: process.arch,
        cpuCount: os.cpus()?.length || 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

module.exports = router;
