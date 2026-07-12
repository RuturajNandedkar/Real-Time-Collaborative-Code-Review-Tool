const { Server } = require('socket.io');
const config = require('../config');
const logger = require('../utils/logger');
const socketAuth = require('./socketAuth');
const { registerRoomHandlers } = require('./roomSocket');
const { registerSessionHandlers } = require('./sessionSocket');

/**
 * Initialize Socket.IO server and attach to the HTTP server.
 * Registers handlers for both legacy Review Rooms and new Sessions.
 */
const initSocketIO = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: config.cors.clientOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: config.socket.pingTimeout,
    pingInterval: config.socket.pingInterval,
    transports: ['websocket', 'polling'],
    // Increase max buffer size to handle large code payloads
    maxHttpBufferSize: 2e6, // 2 MB
  });

  // Apply JWT auth middleware to ALL socket connections
  io.use(socketAuth);

  io.on('connection', (socket) => {
    logger.info(`🔌 Socket connected: ${socket.id} (user: ${socket.user.username})`);

    // ── Review Room handlers (legacy) ────────────────────────────────────
    registerRoomHandlers(io, socket);

    // ── Session handlers (new collaborative sessions) ────────────────────
    registerSessionHandlers(io, socket);
  });

  io.on('connect_error', (err) => {
    logger.error(`Socket connection error: ${err.message}`);
  });

  logger.info('✅ Socket.IO initialized (rooms + sessions)');
  return io;
};

module.exports = initSocketIO;
