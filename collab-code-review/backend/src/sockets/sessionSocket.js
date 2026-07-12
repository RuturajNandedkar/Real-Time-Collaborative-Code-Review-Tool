const logger = require('../utils/logger');
const Session = require('../models/Session');

// ─── In-memory session state ───────────────────────────────────────────────────
// sessionId → Map(socketId → participantInfo)
const activeSessions = new Map();

// sessionId → { code: string, isDirty: boolean, saveTimer: NodeJS.Timeout }
const sessionCodeState = new Map();

/**
 * Debounce interval (ms) before auto-persisting code to MongoDB.
 * Keeps DB writes low while still persisting frequently enough.
 */
const AUTO_SAVE_DEBOUNCE_MS = 3000;

// ─── Helpers ───────────────────────────────────────────────────────────────────

const getActiveParticipants = (sessionId) => {
  const session = activeSessions.get(sessionId);
  if (!session) return [];
  return Array.from(session.values());
};

/**
 * Assign a deterministic color to a user for their cursor/presence indicator.
 * Uses a simple hash of the userId string.
 */
const CURSOR_COLORS = [
  '#818cf8', // indigo
  '#34d399', // emerald
  '#f472b6', // pink
  '#fb923c', // orange
  '#38bdf8', // sky
  '#a78bfa', // violet
  '#fbbf24', // amber
  '#4ade80', // green
  '#f87171', // red
  '#67e8f9', // cyan
];

const getUserColor = (userId) => {
  let hash = 0;
  const str = userId.toString();
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
};

// ─── Debounced DB persist ─────────────────────────────────────────────────────

/**
 * Schedule a debounced save of the latest code to MongoDB.
 * If called again before the timeout fires, the previous timer is cancelled.
 */
const scheduleSave = (sessionId) => {
  const state = sessionCodeState.get(sessionId);
  if (!state) return;

  clearTimeout(state.saveTimer);

  state.saveTimer = setTimeout(async () => {
    const current = sessionCodeState.get(sessionId);
    if (!current || !current.isDirty) return;

    try {
      await Session.findOneAndUpdate(
        { sessionId, isActive: true },
        { code: current.code },
        { new: false } // we don't need the result
      );
      current.isDirty = false;
      logger.info(`💾 Auto-saved session: ${sessionId}`);
    } catch (err) {
      logger.error(`Auto-save failed for session ${sessionId}: ${err.message}`);
    }
  }, AUTO_SAVE_DEBOUNCE_MS);
};

// ─── Session Socket Handlers ───────────────────────────────────────────────────

const registerSessionHandlers = (io, socket) => {
  const user = socket.user;

  // ── join-session ────────────────────────────────────────────────────────────
  socket.on('session:join', async ({ sessionId }) => {
    try {
      // Verify session exists and user has access
      const session = await Session.findOne({ sessionId, isActive: true })
        .populate('createdBy', 'username avatar')
        .populate('participants.user', 'username avatar');

      if (!session) {
        return socket.emit('session:error', { message: 'Session not found.' });
      }

      const isCreator = session.createdBy._id.toString() === user._id.toString();
      const isParticipant = session.participants.some(
        (p) => p.user._id.toString() === user._id.toString()
      );

      // Auto-join as observer if session exists but user isn't yet a participant
      if (!isCreator && !isParticipant) {
        session.participants.push({ user: user._id, role: 'observer' });
        await session.save();
        logger.info(`👤 Auto-joined ${user.username} as observer to session ${sessionId}`);
      }

      // Join the Socket.IO room named by sessionId
      socket.join(sessionId);
      socket.currentSessionId = sessionId;

      // ── Register in-memory presence ─────────────────────────────────────
      if (!activeSessions.has(sessionId)) {
        activeSessions.set(sessionId, new Map());
      }

      const color = getUserColor(user._id.toString());
      const participantInfo = {
        _id: user._id,
        username: user.username,
        avatar: user.avatar,
        socketId: socket.id,
        color,
        cursor: null,          // { lineNumber, column } — set on cursor-move
        joinedAt: Date.now(),
      };
      activeSessions.get(sessionId).set(socket.id, participantInfo);

      // ── Bootstrap code state if first person in session ────────────────
      if (!sessionCodeState.has(sessionId)) {
        sessionCodeState.set(sessionId, {
          code: session.code || '',
          isDirty: false,
          saveTimer: null,
        });
      }

      // ── Notify joining user of full session snapshot ────────────────────
      socket.emit('session:joined', {
        sessionId,
        session: {
          _id: session._id,
          sessionId: session.sessionId,
          title: session.title,
          language: session.language,
          code: sessionCodeState.get(sessionId).code,
          createdBy: session.createdBy,
          participants: session.participants,
        },
        you: participantInfo,
        participants: getActiveParticipants(sessionId),
      });

      // ── Notify others about the newcomer ───────────────────────────────
      socket.to(sessionId).emit('session:user-joined', {
        participant: participantInfo,
        participants: getActiveParticipants(sessionId),
      });

      logger.info(`🔌 ${user.username} joined session: ${sessionId} (color: ${color})`);
    } catch (err) {
      logger.error(`session:join error: ${err.message}`);
      socket.emit('session:error', { message: err.message });
    }
  });

  // ── leave-session ───────────────────────────────────────────────────────────
  socket.on('session:leave', ({ sessionId }) => {
    handleLeaveSession(io, socket, sessionId);
  });

  // ── code-change ─────────────────────────────────────────────────────────────
  /**
   * Receives a full code snapshot from the editing client, fans it out to all
   * other clients in the session, and queues a debounced DB write.
   *
   * Simple "last-write-wins" strategy — no OT required for single active editor;
   * for multi-cursor concurrent edits the Monaco model handles merging locally.
   */
  socket.on('session:code-change', ({ sessionId, code, version }) => {
    const state = sessionCodeState.get(sessionId);
    if (!state) return;

    // Update in-memory snapshot
    state.code = code;
    state.isDirty = true;

    // Broadcast delta to all OTHER clients in the session
    socket.to(sessionId).emit('session:code-updated', {
      code,
      version,
      sender: {
        _id: user._id,
        username: user.username,
        socketId: socket.id,
      },
    });

    // Debounced persist to MongoDB
    scheduleSave(sessionId);
  });

  // ── cursor-move ─────────────────────────────────────────────────────────────
  /**
   * Broadcasts cursor/selection position for collaborative cursor rendering.
   * Payload: { lineNumber, column, selection? }
   */
  socket.on('session:cursor-move', ({ sessionId, cursor }) => {
    // Update in-memory cursor state
    const session = activeSessions.get(sessionId);
    if (session?.has(socket.id)) {
      session.get(socket.id).cursor = cursor;
    }

    socket.to(sessionId).emit('session:cursor-updated', {
      cursor,
      participant: {
        _id: user._id,
        username: user.username,
        socketId: socket.id,
        color: session?.get(socket.id)?.color,
      },
    });
  });

  // ── force-save ──────────────────────────────────────────────────────────────
  /**
   * Immediately persist current in-memory code to DB (e.g. on Ctrl+S).
   * Fires `session:saved` back to all clients in the session.
   */
  socket.on('session:force-save', async ({ sessionId }) => {
    const state = sessionCodeState.get(sessionId);
    if (!state) return;

    clearTimeout(state.saveTimer);

    try {
      await Session.findOneAndUpdate(
        { sessionId, isActive: true },
        { code: state.code }
      );
      state.isDirty = false;

      io.to(sessionId).emit('session:saved', {
        savedAt: new Date().toISOString(),
        savedBy: { _id: user._id, username: user.username },
      });

      logger.info(`💾 Force-saved session ${sessionId} by ${user.username}`);
    } catch (err) {
      socket.emit('session:error', { message: `Save failed: ${err.message}` });
    }
  });

  // ── language-change ─────────────────────────────────────────────────────────
  socket.on('session:language-change', async ({ sessionId, language }) => {
    try {
      await Session.findOneAndUpdate({ sessionId }, { language });
      io.to(sessionId).emit('session:language-updated', {
        language,
        changedBy: { _id: user._id, username: user.username },
      });
    } catch (err) {
      socket.emit('session:error', { message: err.message });
    }
  });

  // ── chat message (optional lightweight in-session chat) ─────────────────────
  socket.on('session:chat', ({ sessionId, message }) => {
    if (!message?.trim()) return;
    io.to(sessionId).emit('session:chat-message', {
      message: message.trim().slice(0, 500),
      sender: { _id: user._id, username: user.username },
      timestamp: new Date().toISOString(),
    });
  });

  // ── disconnect ──────────────────────────────────────────────────────────────
  socket.on('disconnect', (reason) => {
    logger.info(`🔌 ${user.username} disconnected (${reason})`);
    // Clean up all sessions this socket was in
    for (const [sessionId, participants] of activeSessions.entries()) {
      if (participants.has(socket.id)) {
        handleLeaveSession(io, socket, sessionId);
      }
    }
  });
};

// ─── Leave helper ──────────────────────────────────────────────────────────────

const handleLeaveSession = (io, socket, sessionId) => {
  const user = socket.user;
  socket.leave(sessionId);

  const session = activeSessions.get(sessionId);
  if (session) {
    session.delete(socket.id);

    // If room is now empty: flush any pending save immediately, then clean up
    if (session.size === 0) {
      const state = sessionCodeState.get(sessionId);
      if (state?.isDirty) {
        clearTimeout(state.saveTimer);
        Session.findOneAndUpdate(
          { sessionId, isActive: true },
          { code: state.code }
        ).catch((err) =>
          logger.error(`Final save failed for ${sessionId}: ${err.message}`)
        );
      }
      activeSessions.delete(sessionId);
      sessionCodeState.delete(sessionId);
      logger.info(`🗑️  Session room ${sessionId} cleaned up (empty)`);
    }
  }

  io.to(sessionId).emit('session:user-left', {
    participant: { _id: user._id, username: user.username, socketId: socket.id },
    participants: getActiveParticipants(sessionId),
  });

  logger.info(`🔌 ${user.username} left session: ${sessionId}`);
};

// ─── Exports ───────────────────────────────────────────────────────────────────

module.exports = { registerSessionHandlers, activeSessions, getActiveParticipants };
