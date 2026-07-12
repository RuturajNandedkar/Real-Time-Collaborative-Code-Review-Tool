require('dotenv').config();

const http = require('http');
const createApp = require('./app');
const connectDB = require('./config/database');
const initSocketIO = require('./sockets');
const config = require('./config');
const logger = require('./utils/logger');

const bootstrap = async () => {
  // Connect to MongoDB
  await connectDB();

  // Create Express app and HTTP server
  const app = createApp();
  const httpServer = http.createServer(app);

  // Attach Socket.IO
  const io = initSocketIO(httpServer);

  // Make io accessible in request context if needed
  app.set('io', io);

  // Start listening
  httpServer.listen(config.port, () => {
    logger.info(`
    ╔════════════════════════════════════════════╗
    ║   🚀  Collab Code Review API               ║
    ║   Environment : ${config.nodeEnv.padEnd(24)}║
    ║   Port        : ${String(config.port).padEnd(24)}║
    ║   Health      : http://localhost:${config.port}/api/health ║
    ╚════════════════════════════════════════════╝
    `);
  });

  // ─── Graceful Shutdown ──────────────────────────────────────────────────────
  const shutdown = (signal) => {
    logger.info(`\n${signal} received. Shutting down gracefully...`);
    httpServer.close(async () => {
      const mongoose = require('mongoose');
      await mongoose.connection.close();
      logger.info('✅ Server and DB connections closed.');
      process.exit(0);
    });
    // Force close after 10s
    setTimeout(() => process.exit(1), 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', reason);
    shutdown('unhandledRejection');
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
  });
};

bootstrap();
