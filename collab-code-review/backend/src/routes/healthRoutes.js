const express = require('express');
const router = express.Router();
const os = require('os');
const mongoose = require('mongoose');

/**
 * @route  GET /api/health
 * @desc   Health check endpoint
 * @access Public
 */
router.get('/', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState] || 'unknown';

  res.status(200).json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    server: {
      uptime: `${Math.floor(process.uptime())}s`,
      memoryUsage: {
        rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
      },
      platform: os.platform(),
      nodeVersion: process.version,
    },
    database: {
      status: dbStatus,
      name: mongoose.connection.name || 'N/A',
    },
  });
});

module.exports = router;
