import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Users, Copy, CheckCheck, MessageSquare, Loader2, ArrowLeft,
  Languages, Maximize2, Minimize2, Save, WifiOff
} from 'lucide-react';
import { useRoom, useRoomComments, useAddComment } from '../../hooks/useRooms';
import { getSocket } from '../../lib/socket';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import MonacoEditor from '../../components/editor/MonacoEditor';
import api from '../../lib/api';

const COMMENT_TYPE_STYLES = {
  general:    'badge-brand',
  suggestion: 'badge-amber',
  issue:      'badge-red',
  praise:     'badge-green',
};

// Debounce helper — delays calling fn until ms ms after last call
const useDebounce = (fn, ms) => {
  const timer = useRef(null);
  return useCallback(
    (...args) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => fn(...args), ms);
    },
    [fn, ms]
  );
};

const RoomPage = () => {
  const { id: roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const socket = getSocket();

  const { data: room, isLoading: roomLoading } = useRoom(roomId);
  const {
    data: comments = [],
    isLoading: commentsLoading,
    refetch: refetchComments,
  } = useRoomComments(roomId);
  const addComment = useAddComment(roomId);

  // ── State ──────────────────────────────────────────────────────────────────
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [activeUsers, setActiveUsers] = useState([]);
  const [commentForm, setCommentForm] = useState({ content: '', lineNumber: '', type: 'general' });
  const [copied, setCopied] = useState(false);
  const [showComments, setShowComments] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [socketConnected, setSocketConnected] = useState(true);

  const commentsEndRef = useRef(null);
  const editorRef = useRef(null);
  // Flag to suppress emitting when code change comes FROM socket
  const suppressEmit = useRef(false);

  // ── Init from room data ────────────────────────────────────────────────────
  useEffect(() => {
    if (room) {
      setCode(room.code ?? '');
      setLanguage(room.language ?? 'javascript');
    }
  }, [room?._id]); // only on mount/room change, not every re-render

  // ── Socket lifecycle ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !roomId) return;

    socket.emit('join-room', { roomId });

    const onUsers = ({ users }) => setActiveUsers(users);
    const onCode = ({ code: newCode }) => {
      suppressEmit.current = true;
      setCode(newCode);
    };
    const onComment = () => refetchComments();
    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);

    socket.on('room:users-updated', onUsers);
    socket.on('code:updated', onCode);
    socket.on('comment:added', onComment);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.emit('leave-room', { roomId });
      socket.off('room:users-updated', onUsers);
      socket.off('code:updated', onCode);
      socket.off('comment:added', onComment);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [socket, roomId]);

  // ── Code change handler ────────────────────────────────────────────────────
  // Wrapped in debounce to avoid socket flooding on every keystroke
  const emitCodeChange = useDebounce((newCode) => {
    socket?.emit('code-change', { roomId, code: newCode });
  }, 150);

  const handleCodeChange = useCallback(
    (newCode) => {
      setCode(newCode);
      if (suppressEmit.current) {
        suppressEmit.current = false;
        return;
      }
      emitCodeChange(newCode);
    },
    [emitCodeChange]
  );

  // ── REST save (persists code to DB) ────────────────────────────────────────
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.patch(`/rooms/${roomId}/code`, { code });
      toast.success('Code saved!');
    } catch (err) {
      toast.error(`Save failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Comment submission ─────────────────────────────────────────────────────
  const handleAddComment = async (e) => {
    e.preventDefault();
    // If the editor has a selection, use that line number
    const lineNumber = commentForm.lineNumber
      ? parseInt(commentForm.lineNumber)
      : editorRef.current?.getPosition()?.lineNumber;

    await addComment.mutateAsync({
      content: commentForm.content,
      lineNumber,
      type: commentForm.type,
    });
    socket?.emit('new-comment', { roomId });
    setCommentForm({ content: '', lineNumber: '', type: 'general' });
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // ── Invite code copy ───────────────────────────────────────────────────────
  const copyInviteCode = () => {
    if (!room?.inviteCode) return;
    navigator.clipboard.writeText(room.inviteCode);
    setCopied(true);
    toast.success('Invite code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Editor mount callback ──────────────────────────────────────────────────
  const handleEditorMount = useCallback((editor) => {
    editorRef.current = editor;
    // Ctrl/Cmd+S to save
    editor.addCommand(
      // Monaco KeyCode: Ctrl+S = 2097
      // eslint-disable-next-line no-bitwise
      2097 /* monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS */,
      () => handleSave()
    );
  }, []);

  // ── Loading / error states ─────────────────────────────────────────────────
  if (roomLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-400">Room not found.</p>
        <button onClick={() => navigate('/dashboard')} className="btn-primary mt-4">
          Back to Dashboard
        </button>
      </div>
    );
  }

  const SUPPORTED_LANGUAGES = [
    'javascript', 'typescript', 'python', 'java', 'cpp', 'csharp',
    'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'html', 'css', 'sql', 'plaintext',
  ];

  return (
    <div
      className={`animate-fade-in flex flex-col ${
        isFullscreen
          ? 'fixed inset-0 z-50 bg-surface-900 p-4'
          : 'h-[calc(100vh-5rem)]'
      }`}
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          {!isFullscreen && (
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-ghost p-2"
              id="back-btn"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-slate-800 dark:text-slate-100">{room.name}</h1>
              {!socketConnected && (
                <span className="flex items-center gap-1 text-xs text-amber-400">
                  <WifiOff className="w-3 h-3" />
                  Reconnecting…
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {room.inviteCode && (
                <button
                  id="copy-invite-btn"
                  onClick={copyInviteCode}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-brand-500 transition-colors font-mono"
                >
                  {copied ? <CheckCheck className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {room.inviteCode}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Toolbar: language switcher + active users + actions ─────────── */}
        <div className="flex items-center gap-2">
          {/* Language picker */}
          <div className="flex items-center gap-1.5 bg-surface-100 dark:bg-surface-700 rounded-lg px-2 py-1">
            <Languages className="w-3.5 h-3.5 text-slate-400" />
            <select
              id="language-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="text-xs bg-transparent text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          {/* Save button */}
          <button
            id="save-code-btn"
            onClick={handleSave}
            disabled={isSaving}
            className="btn-secondary py-1 px-2.5 text-xs"
            title="Save code (Ctrl+S)"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">Save</span>
          </button>

          {/* Active users */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex -space-x-2">
              {activeUsers.slice(0, 4).map((u) => (
                <div
                  key={u.socketId}
                  title={u.username}
                  className="w-7 h-7 bg-gradient-to-br from-brand-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white dark:border-surface-800"
                >
                  {u.username?.[0]?.toUpperCase()}
                </div>
              ))}
            </div>
            <span>{activeUsers.length} online</span>
          </div>

          {/* Toggle comments */}
          <button
            id="toggle-comments-btn"
            onClick={() => setShowComments(!showComments)}
            className={`btn-ghost p-2 ${showComments ? 'text-brand-500' : ''}`}
            title="Toggle comments panel"
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          {/* Fullscreen */}
          <button
            id="fullscreen-btn"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="btn-ghost p-2"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen editor'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="flex gap-4 flex-1 overflow-hidden min-h-0">
        {/* ── Monaco Code Editor ────────────────────────────────────────── */}
        <div className="flex-1 card overflow-hidden flex flex-col min-w-0">
          {/* Mac-style title bar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-slate-700/60 bg-slate-50 dark:bg-surface-900/60 flex-shrink-0">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400 hover:bg-red-500 transition-colors" />
              <div className="w-3 h-3 rounded-full bg-yellow-400 hover:bg-yellow-500 transition-colors" />
              <div className="w-3 h-3 rounded-full bg-green-400 hover:bg-green-500 transition-colors" />
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {room.name} — {language}
            </span>
            <div className="flex items-center gap-1">
              {/* Socket indicator */}
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  socketConnected ? 'bg-emerald-400 animate-pulse-slow' : 'bg-amber-400'
                }`}
                title={socketConnected ? 'Live sync active' : 'Reconnecting…'}
              />
            </div>
          </div>

          {/* Monaco Editor fills remaining height */}
          <div className="flex-1 overflow-hidden">
            <MonacoEditor
              value={code}
              onChange={handleCodeChange}
              language={language}
              onMount={handleEditorMount}
              height="100%"
            />
          </div>
        </div>

        {/* ── Comments Panel ────────────────────────────────────────────── */}
        {showComments && (
          <div className="w-80 flex flex-col gap-3 flex-shrink-0 overflow-hidden animate-slide-up">
            {/* Add comment form */}
            <div className="card p-4 flex-shrink-0">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                Add Comment
              </h3>
              <form onSubmit={handleAddComment} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="number"
                    id="comment-line"
                    value={commentForm.lineNumber}
                    onChange={(e) =>
                      setCommentForm({ ...commentForm, lineNumber: e.target.value })
                    }
                    placeholder="Line #"
                    className="input w-20 text-xs"
                    min={1}
                  />
                  <select
                    value={commentForm.type}
                    onChange={(e) =>
                      setCommentForm({ ...commentForm, type: e.target.value })
                    }
                    className="input flex-1 text-xs"
                  >
                    <option value="general">General</option>
                    <option value="suggestion">Suggestion</option>
                    <option value="issue">Issue</option>
                    <option value="praise">Praise</option>
                  </select>
                </div>
                <textarea
                  id="comment-content"
                  value={commentForm.content}
                  onChange={(e) =>
                    setCommentForm({ ...commentForm, content: e.target.value })
                  }
                  placeholder="Write a comment…"
                  className="input resize-none text-xs"
                  rows={3}
                  required
                />
                <button
                  type="submit"
                  id="add-comment-submit"
                  disabled={addComment.isPending}
                  className="btn-primary w-full text-xs py-1.5"
                >
                  {addComment.isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    'Post Comment'
                  )}
                </button>
              </form>
            </div>

            {/* Comments list */}
            <div className="card flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 sticky top-0 bg-white dark:bg-surface-800 pb-2">
                Comments ({comments.length})
              </h3>
              {commentsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-slate-400 text-xs text-center py-8">
                  No comments yet. Be the first!
                </p>
              ) : (
                comments.map((comment) => (
                  <div
                    key={comment._id}
                    id={`comment-${comment._id}`}
                    className={`p-3 rounded-xl border text-xs space-y-1.5 transition-opacity ${
                      comment.resolved
                        ? 'border-slate-100 dark:border-slate-700/50 opacity-50'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 bg-gradient-to-br from-brand-400 to-purple-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                          {comment.author?.username?.[0]?.toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {comment.author?.username}
                        </span>
                      </div>
                      <span
                        className={`badge ${COMMENT_TYPE_STYLES[comment.type] || 'badge-brand'}`}
                      >
                        {comment.type}
                      </span>
                    </div>
                    {comment.lineNumber && (
                      <span className="text-slate-400 font-mono block">
                        Line {comment.lineNumber}
                      </span>
                    )}
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                      {comment.content}
                    </p>
                    <p className="text-slate-400">
                      {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                ))
              )}
              <div ref={commentsEndRef} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomPage;
