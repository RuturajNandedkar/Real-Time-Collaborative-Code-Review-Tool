const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Socket.IO authentication middleware.
 * Validates JWT from socket handshake auth token.
 */
const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication token is required'));
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    const user = await User.findById(decoded.id).select('_id username avatar role isActive');

    if (!user || !user.isActive) {
      return next(new Error('User not found or account deactivated'));
    }

    socket.user = user;
    next();
  } catch (error) {
    logger.warn(`Socket auth failed: ${error.message}`);
    next(new Error('Invalid or expired token'));
  }
};

module.exports = socketAuth;
