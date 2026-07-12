import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

/** Global listeners that survive reconnections */
const globalListeners = new Map();

/**
 * Initialize Socket.IO connection with JWT auth.
 * Safe to call multiple times — returns existing connected socket.
 */
export const initSocket = (token) => {
  if (socket?.connected) return socket;

  // If socket exists but disconnected, update auth and reconnect
  if (socket) {
    socket.auth = { token };
    socket.connect();
    return socket;
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    randomizationFactor: 0.3,
    withCredentials: true,
  });

  socket.on('connect', () => {
    console.log('🔌 Socket connected:', socket.id);
    // Re-register any persistent listeners after reconnect
    globalListeners.forEach((handler, event) => {
      socket.off(event, handler); // avoid duplicate
      socket.on(event, handler);
    });
  });

  socket.on('disconnect', (reason) => {
    console.warn('🔌 Socket disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err.message);
  });

  return socket;
};

/** Get the current socket instance (may be null if not yet initialized). */
export const getSocket = () => socket;

/** Disconnect and destroy the socket instance. */
export const disconnectSocket = () => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    globalListeners.clear();
  }
};

/**
 * Register a listener that survives reconnection cycles.
 * Useful for top-level app events like auth:unauthorized.
 */
export const onPersistent = (event, handler) => {
  globalListeners.set(event, handler);
  socket?.on(event, handler);
};

/** Remove a persistent listener. */
export const offPersistent = (event) => {
  const handler = globalListeners.get(event);
  if (handler) {
    socket?.off(event, handler);
    globalListeners.delete(event);
  }
};

export default { initSocket, getSocket, disconnectSocket, onPersistent, offPersistent };
