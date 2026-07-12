import { useState, useEffect, useRef, useCallback } from 'react';
import { getSocket } from '../lib/socket';
import api from '../lib/api';
import toast from 'react-hot-toast';

/**
 * useSessionSocket — manages all real-time state for a collaborative session.
 *
 * Returns:
 *  - sessionData       Full session document snapshot from server
 *  - code              Live code string (updated from remote edits)
 *  - setCode           Local setter (call this on user edits)
 *  - language          Current session language
 *  - participants      Array of active (online) participants with cursor/color
 *  - remoteCursors     Map<socketId, { cursor, username, color }>
 *  - isConnected       Socket connection status
 *  - isSaving          True while a forced save is in flight
 *  - lastSavedAt       ISO timestamp of last successful save
 *  - chatMessages      Array of in-session chat messages
 *  - emitCodeChange    Call with new code string on every editor change
 *  - emitCursorMove    Call with { lineNumber, column } on cursor move
 *  - emitForceSave     Trigger immediate DB persist
 *  - emitLanguageChange Change language for all clients
 *  - emitChat          Send a chat message
 */
const useSessionSocket = (sessionId) => {
  const socket = getSocket();

  // ── Core session state ───────────────────────────────────────────────────────
  const [sessionData, setSessionData] = useState(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [participants, setParticipants] = useState([]);
  const [remoteCursors, setRemoteCursors] = useState({}); // socketId → cursorInfo
  const [isConnected, setIsConnected] = useState(socket?.connected ?? false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);

  // Prevents re-broadcasting code received from the server
  const suppressEmit = useRef(false);
  // Tracks local version counter for ordering
  const versionRef = useRef(0);

  // ── Join session on mount ────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !sessionId) return;

    socket.emit('session:join', { sessionId });

    // ── Handlers ──────────────────────────────────────────────────────────────

    const onJoined = ({ session, you, participants: p }) => {
      setSessionData(session);
      setCode(session.code || '');
      setLanguage(session.language || 'javascript');
      setParticipants(p);
      setIsConnected(true);
    };

    const onUserJoined = ({ participant, participants: p }) => {
      setParticipants(p);
      toast(`${participant.username} joined`, {
        icon: '👋',
        style: { background: '#1e293b', color: '#f1f5f9' },
        duration: 2500,
      });
    };

    const onUserLeft = ({ participant, participants: p }) => {
      setParticipants(p);
      // Remove their cursor
      setRemoteCursors((prev) => {
        const next = { ...prev };
        delete next[participant.socketId];
        return next;
      });
      toast(`${participant.username} left`, {
        icon: '👋',
        style: { background: '#1e293b', color: '#94a3b8' },
        duration: 2000,
      });
    };

    const onCodeUpdated = ({ code: remoteCode, version, sender }) => {
      // Only apply if it's from someone else
      suppressEmit.current = true;
      setCode(remoteCode);
      versionRef.current = version;
    };

    const onCursorUpdated = ({ cursor, participant: p }) => {
      setRemoteCursors((prev) => ({
        ...prev,
        [p.socketId]: {
          cursor,
          username: p.username,
          color: p.color,
          socketId: p.socketId,
        },
      }));
    };

    const onSaved = ({ savedAt, savedBy }) => {
      setLastSavedAt(savedAt);
      setIsSaving(false);
      toast.success(`Saved by ${savedBy.username}`, { duration: 1500 });
    };

    const onLanguageUpdated = ({ language: lang }) => {
      setLanguage(lang);
    };

    const onChatMessage = (msg) => {
      setChatMessages((prev) => [...prev.slice(-199), msg]); // keep last 200
    };

    const onError = ({ message }) => {
      toast.error(`Session error: ${message}`);
    };

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('session:joined', onJoined);
    socket.on('session:user-joined', onUserJoined);
    socket.on('session:user-left', onUserLeft);
    socket.on('session:code-updated', onCodeUpdated);
    socket.on('session:cursor-updated', onCursorUpdated);
    socket.on('session:saved', onSaved);
    socket.on('session:language-updated', onLanguageUpdated);
    socket.on('session:chat-message', onChatMessage);
    socket.on('session:error', onError);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.emit('session:leave', { sessionId });
      socket.off('session:joined', onJoined);
      socket.off('session:user-joined', onUserJoined);
      socket.off('session:user-left', onUserLeft);
      socket.off('session:code-updated', onCodeUpdated);
      socket.off('session:cursor-updated', onCursorUpdated);
      socket.off('session:saved', onSaved);
      socket.off('session:language-updated', onLanguageUpdated);
      socket.off('session:chat-message', onChatMessage);
      socket.off('session:error', onError);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [socket, sessionId]);

  // ── Emitters ─────────────────────────────────────────────────────────────────

  const emitCodeChange = useCallback(
    (newCode) => {
      if (suppressEmit.current) {
        suppressEmit.current = false;
        return;
      }
      versionRef.current += 1;
      socket?.emit('session:code-change', {
        sessionId,
        code: newCode,
        version: versionRef.current,
      });
    },
    [socket, sessionId]
  );

  const emitCursorMove = useCallback(
    (cursor) => {
      socket?.emit('session:cursor-move', { sessionId, cursor });
    },
    [socket, sessionId]
  );

  const emitForceSave = useCallback(() => {
    setIsSaving(true);
    socket?.emit('session:force-save', { sessionId });
  }, [socket, sessionId]);

  const emitLanguageChange = useCallback(
    (lang) => {
      setLanguage(lang);
      socket?.emit('session:language-change', { sessionId, language: lang });
    },
    [socket, sessionId]
  );

  const emitChat = useCallback(
    (message) => {
      socket?.emit('session:chat', { sessionId, message });
    },
    [socket, sessionId]
  );

  return {
    sessionData,
    code,
    setCode,
    language,
    participants,
    remoteCursors,
    isConnected,
    isSaving,
    lastSavedAt,
    chatMessages,
    emitCodeChange,
    emitCursorMove,
    emitForceSave,
    emitLanguageChange,
    emitChat,
  };
};

export default useSessionSocket;
