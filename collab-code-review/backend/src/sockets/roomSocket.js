const logger = require('../utils/logger');
const roomService = require('../services/roomService');

/**
 * In-memory store of active room participants: roomId -> Map(socketId -> userInfo)
 */
const activeRooms = new Map();

const getActiveUsers = (roomId) => {
  const room = activeRooms.get(roomId);
  if (!room) return [];
  return Array.from(room.values());
};

const registerRoomHandlers = (io, socket) => {
  const user = socket.user;

  /**
   * Event: join-room
   * Client joins a review room via Socket.IO room.
   */
  socket.on('join-room', async ({ roomId }) => {
    try {
      // Validate room access
      await roomService.getRoomById(roomId, user._id);

      socket.join(roomId);

      if (!activeRooms.has(roomId)) {
        activeRooms.set(roomId, new Map());
      }
      activeRooms.get(roomId).set(socket.id, {
        _id: user._id,
        username: user.username,
        avatar: user.avatar,
        socketId: socket.id,
      });

      const users = getActiveUsers(roomId);

      // Notify everyone in room about new participant
      io.to(roomId).emit('room:users-updated', { users });
      socket.to(roomId).emit('room:user-joined', {
        user: { _id: user._id, username: user.username, avatar: user.avatar },
      });

      logger.info(`🔌 ${user.username} joined room: ${roomId}`);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  /**
   * Event: leave-room
   */
  socket.on('leave-room', ({ roomId }) => {
    handleLeaveRoom(io, socket, roomId);
  });

  /**
   * Event: code-change
   * Broadcast real-time code edits to other participants.
   */
  socket.on('code-change', ({ roomId, code, cursorPosition }) => {
    socket.to(roomId).emit('code:updated', {
      code,
      cursorPosition,
      sender: { _id: user._id, username: user.username },
    });
  });

  /**
   * Event: cursor-move
   * Broadcast cursor position for collaborative awareness.
   */
  socket.on('cursor-move', ({ roomId, cursor }) => {
    socket.to(roomId).emit('cursor:updated', {
      cursor,
      user: { _id: user._id, username: user.username },
    });
  });

  /**
   * Event: new-comment
   * Broadcast new comment to all room participants.
   */
  socket.on('new-comment', ({ roomId, comment }) => {
    io.to(roomId).emit('comment:added', { comment });
  });

  /**
   * Event: comment-resolved
   * Notify room about a resolved/unresolved comment.
   */
  socket.on('comment-resolved', ({ roomId, commentId, resolved }) => {
    io.to(roomId).emit('comment:resolved', { commentId, resolved });
  });

  /**
   * Event: typing
   * Broadcast typing status to collaborators.
   */
  socket.on('typing', ({ roomId, isTyping }) => {
    socket.to(roomId).emit('user:typing', {
      user: { _id: user._id, username: user.username },
      isTyping,
    });
  });

  /**
   * Handle disconnect — clean up all rooms this socket was in.
   */
  socket.on('disconnect', (reason) => {
    logger.info(`🔌 ${user.username} disconnected: ${reason}`);
    for (const [roomId, participants] of activeRooms.entries()) {
      if (participants.has(socket.id)) {
        handleLeaveRoom(io, socket, roomId);
      }
    }
  });
};

const handleLeaveRoom = (io, socket, roomId) => {
  const user = socket.user;
  socket.leave(roomId);

  const room = activeRooms.get(roomId);
  if (room) {
    room.delete(socket.id);
    if (room.size === 0) activeRooms.delete(roomId);
  }

  const users = getActiveUsers(roomId);
  io.to(roomId).emit('room:users-updated', { users });
  socket.to(roomId).emit('room:user-left', {
    user: { _id: user._id, username: user.username },
  });

  logger.info(`🔌 ${user.username} left room: ${roomId}`);
};

module.exports = { registerRoomHandlers };
