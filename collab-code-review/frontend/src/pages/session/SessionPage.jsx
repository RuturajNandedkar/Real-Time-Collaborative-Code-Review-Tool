import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Save, Maximize2, Minimize2, Languages,
  MessageSquare, Users, Copy, CheckCheck, Loader2,
  Clock, Send, X, ChevronDown, MessageSquareCode, Sparkles
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import useSessionSocket from '../../hooks/useSessionSocket';
import { getSocket } from '../../lib/socket';
import {
  useSession, useSessionComments, sessionCommentKeys, useRunAiReview
} from '../../hooks/useSessions';
import MonacoEditor from '../../components/editor/MonacoEditor';
import CursorOverlay from '../../components/editor/CursorOverlay';
import CommentOverlay from '../../components/editor/CommentOverlay';
import AiReviewOverlay from '../../components/editor/AiReviewOverlay';
import ActiveUserList from '../../components/session/ActiveUserList';
import SessionCommentsSidebar from '../../components/session/SessionCommentsSidebar';
import AiReviewSummarySidebar from '../../components/session/AiReviewSummarySidebar';
import { formatDistanceToNow, format } from 'date-fns';
import toast from 'react-hot-toast';

const SUPPORTED_LANGUAGES = [
  'javascript', 'typescript', 'python', 'java', 'cpp', 'csharp',
  'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'html', 'css', 'sql', 'plaintext',
];

/** Map language → human label */
const LANG_LABELS = {
  javascript: 'JavaScript', typescript: 'TypeScript', python: 'Python',
  java: 'Java', cpp: 'C++', csharp: 'C#', go: 'Go', rust: 'Rust',
  ruby: 'Ruby', php: 'PHP', swift: 'Swift', kotlin: 'Kotlin',
  html: 'HTML', css: 'CSS', sql: 'SQL', plaintext: 'Plain Text',
};

// ─── Debounce helper ────────────────────────────────────────────────────────────
const useDebounceCallback = (fn, delay) => {
  const timer = useRef(null);
  return useCallback(
    (...args) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => fn(...args), delay);
    },
    [fn, delay]
  );
};

// ─── Session Page ───────────────────────────────────────────────────────────────
const SessionPage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // REST bootstrap (for page title, meta — socket provides live data)
  const { data: sessionMeta, isLoading: metaLoading } = useSession(sessionId);
  // Comments query to display count in toolbar and pass to CommentOverlay
  const { data: comments = [] } = useSessionComments(sessionId);

  // AI Review hook
  const runAiReviewMutation = useRunAiReview(sessionId);

  // All real-time state from socket
  const {
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
  } = useSessionSocket(sessionId);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showAiReview, setShowAiReview] = useState(false);
  const [aiReviewResult, setAiReviewResult] = useState(null);
  const [activeLine, setActiveLine] = useState(1);
  const [copied, setCopied] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const chatEndRef = useRef(null);

  // Track unread chat
  useEffect(() => {
    if (!showChat && chatMessages.length > 0) {
      setUnreadCount((n) => n + 1);
    }
  }, [chatMessages.length]);
  useEffect(() => { if (showChat) setUnreadCount(0); }, [showChat]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Handle live comment synchronization
  useEffect(() => {
    const s = getSocket();

    if (!s) return;

    const handleCommentAdded = ({ comment }) => {
      queryClient.invalidateQueries({ queryKey: sessionCommentKeys.all(sessionId) });
      if (comment.author?._id !== user?._id) {
        toast(`New comment on Line ${comment.lineNumber}`, {
          icon: '💬',
          style: { background: '#1e293b', color: '#f1f5f9' }
        });
      }
    };

    const handleCommentUpdated = () => {
      queryClient.invalidateQueries({ queryKey: sessionCommentKeys.all(sessionId) });
    };

    s.on('session:comment-added', handleCommentAdded);
    s.on('session:comment-updated', handleCommentUpdated);

    return () => {
      s.off('session:comment-added', handleCommentAdded);
      s.off('session:comment-updated', handleCommentUpdated);
    };
  }, [sessionId, queryClient, user?._id]);

  // ── Debounced code-change emitter ──────────────────────────────────────────
  const debouncedEmitCode = useDebounceCallback(emitCodeChange, 120);

  const handleCodeChange = useCallback(
    (newCode) => {
      setCode(newCode);
      debouncedEmitCode(newCode);
    },
    [debouncedEmitCode, setCode]
  );

  // ── Cursor-move emitter ─────────────────────────────────────────────────────
  const handleCursorChange = useCallback(
    (e) => {
      if (!e) return;
      const pos = e.position;
      const sel = e.selection;
      
      // Update local active line
      setActiveLine(pos.lineNumber);

      emitCursorMove({
        lineNumber: pos.lineNumber,
        column: pos.column,
        selection: sel
          ? {
              startLineNumber: sel.startLineNumber,
              startColumn: sel.startColumn,
              endLineNumber: sel.endLineNumber,
              endColumn: sel.endColumn,
            }
          : null,
      });
    },
    [emitCursorMove]
  );

  // ── Editor mount ────────────────────────────────────────────────────────────
  const handleEditorMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;

      // Ctrl/Cmd + S → force save
      editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
        () => emitForceSave()
      );

      // Track cursor/selection for broadcasting
      editor.onDidChangeCursorPosition(handleCursorChange);
      editor.onDidChangeCursorSelection(handleCursorChange);
    },
    [emitForceSave, handleCursorChange]
  );

  // ── Copy sessionId (Full Invite Link) ──────────────────────────────────────
  const copySessionId = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success('Invite link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Chat submit ─────────────────────────────────────────────────────────────
  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    emitChat(chatInput.trim());
    setChatInput('');
  };

  // ── AI Review Handlers ──────────────────────────────────────────────────────
  const handleRunAiReview = async () => {
    const activeCode = code || '';
    const activeLang = displayLanguage;

    toast.promise(
      runAiReviewMutation.mutateAsync({ code: activeCode, language: activeLang }),
      {
        loading: 'AI Review is analyzing your code...',
        success: (data) => {
          setAiReviewResult(data);
          setShowAiReview(true);
          setShowChat(false);
          setShowParticipants(false);
          setShowComments(false);
          return 'AI Code Review complete!';
        },
        error: (err) => `AI Review failed: ${err.message}`,
      },
      {
        style: {
          background: '#1e293b',
          color: '#f1f5f9',
        },
      }
    );
  };

  const handleSelectReviewLine = (line) => {
    const editor = editorRef.current;
    if (editor && line) {
      editor.revealLineInCenter(line);
      editor.setPosition({ lineNumber: line, column: 1 });
      editor.focus();
    }
  };

  // ── Loading state ───────────────────────────────────────────────────────────
  const isLoading = metaLoading && !sessionData;
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-5rem)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading session…</p>
        </div>
      </div>
    );
  }

  const title = sessionData?.title || sessionMeta?.title || 'Untitled Session';
  const displayLanguage = language || sessionData?.language || 'javascript';

  return (
    <div
      className={`animate-fade-in flex flex-col ${
        isFullscreen ? 'fixed inset-0 z-50 bg-surface-900 p-4' : 'h-[calc(100vh-5rem)]'
      }`}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0 gap-3">
        {/* Left: back + title */}
        <div className="flex items-center gap-3 min-w-0">
          {!isFullscreen && (
            <button
              id="session-back-btn"
              onClick={() => navigate('/dashboard')}
              className="btn-ghost p-2 flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-slate-800 dark:text-slate-100 truncate">{title}</h1>
              <span className="badge-brand text-[10px] flex-shrink-0">{LANG_LABELS[displayLanguage] || displayLanguage}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <button
                id="copy-session-id-btn"
                onClick={copySessionId}
                className="flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-brand-400 transition-colors font-mono"
                title="Copy invite link"
              >
                {copied ? <CheckCheck className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Link copied!' : 'Invite link'}</span>
              </button>
              {lastSavedAt && (
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  Saved {formatDistanceToNow(new Date(lastSavedAt), { addSuffix: true })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: toolbar */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Language picker */}
          <div className="relative">
            <div className="flex items-center gap-1.5 bg-surface-100 dark:bg-surface-700 rounded-lg px-2.5 py-1.5 cursor-pointer">
              <Languages className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <select
                id="session-language-select"
                value={displayLanguage}
                onChange={(e) => emitLanguageChange(e.target.value)}
                className="text-xs bg-transparent text-slate-700 dark:text-slate-200 outline-none cursor-pointer appearance-none pr-4"
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l} value={l}>{LANG_LABELS[l] || l}</option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 pointer-events-none" />
            </div>
          </div>

          {/* Save button */}
          <button
            id="session-save-btn"
            onClick={emitForceSave}
            disabled={isSaving}
            className="btn-secondary py-1.5 px-2.5 text-xs"
            title="Save (Ctrl+S)"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">Save</span>
          </button>

          {/* AI Review button */}
          <button
            id="run-ai-review-btn"
            onClick={handleRunAiReview}
            disabled={runAiReviewMutation.isPending}
            className="btn-primary py-1.5 px-2.5 text-xs flex items-center gap-1.5"
            title="Analyze code with AI"
          >
            {runAiReviewMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>{runAiReviewMutation.isPending ? 'Reviewing...' : 'AI Review'}</span>
          </button>

          {/* Active users */}
          <ActiveUserList
            participants={participants}
            isConnected={isConnected}
            currentUserId={user?._id}
          />

          {/* Chat toggle */}
          <button
            id="toggle-chat-btn"
            onClick={() => { setShowChat(!showChat); setShowParticipants(false); setShowComments(false); setShowAiReview(false); }}
            className={`btn-ghost p-2 relative ${showChat ? 'text-brand-500' : ''}`}
            title="Toggle chat"
          >
            <MessageSquare className="w-4 h-4" />
            {unreadCount > 0 && !showChat && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Comments toggle */}
          <button
            id="toggle-comments-btn"
            onClick={() => { setShowComments(!showComments); setShowChat(false); setShowParticipants(false); setShowAiReview(false); }}
            className={`btn-ghost p-2 relative ${showComments ? 'text-brand-500' : ''}`}
            title="Toggle comments"
          >
            <MessageSquareCode className="w-4 h-4" />
            {comments.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-brand-600 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                {comments.length}
              </span>
            )}
          </button>

          {/* AI Review Summary toggle */}
          {aiReviewResult && (
            <button
              id="toggle-ai-review-btn"
              onClick={() => { setShowAiReview(!showAiReview); setShowChat(false); setShowParticipants(false); setShowComments(false); }}
              className={`btn-ghost p-2 relative ${showAiReview ? 'text-brand-500' : ''}`}
              title="Show AI review results"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          )}

          {/* Participants list toggle */}
          <button
            id="toggle-participants-btn"
            onClick={() => { setShowParticipants(!showParticipants); setShowChat(false); setShowComments(false); setShowAiReview(false); }}
            className={`btn-ghost p-2 ${showParticipants ? 'text-brand-500' : ''}`}
            title="Participants"
          >
            <Users className="w-4 h-4" />
          </button>

          {/* Fullscreen */}
          <button
            id="session-fullscreen-btn"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="btn-ghost p-2"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div className="flex gap-4 flex-1 overflow-hidden min-h-0">

        {/* ── Monaco Editor ────────────────────────────────────────────────── */}
        <div className="flex-1 card overflow-hidden flex flex-col min-w-0">
          {/* Title bar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 dark:border-slate-700/60 bg-slate-50 dark:bg-surface-900/60 flex-shrink-0">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <span className="text-[11px] text-slate-400 font-mono truncate px-4">
              {title}
            </span>
            {/* Live indicator */}
            <div className="flex items-center gap-1.5">
              {isConnected ? (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              ) : (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
              <span className="text-[10px] text-slate-400">
                {isConnected ? 'Live' : 'Reconnecting…'}
              </span>
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1 overflow-hidden relative">
            <MonacoEditor
              value={code}
              onChange={handleCodeChange}
              language={displayLanguage}
              onMount={handleEditorMount}
              height="100%"
            />
            {/* Remote cursor overlay */}
            <CursorOverlay
              editorRef={editorRef}
              monacoRef={monacoRef}
              remoteCursors={remoteCursors}
            />
            {/* Comment indicators overlay */}
            <CommentOverlay
              editorRef={editorRef}
              monacoRef={monacoRef}
              comments={comments}
            />
            {/* AI Review Squiggley overlay */}
            <AiReviewOverlay
              editorRef={editorRef}
              monacoRef={monacoRef}
              review={aiReviewResult}
            />
          </div>
        </div>

        {/* ── Side panel: Chat or Participants ──────────────────────────────── */}
        {(showChat || showParticipants) && (
          <div className="w-72 flex flex-col card overflow-hidden flex-shrink-0 animate-slide-up">

            {/* ── Chat panel ──────────────────────────────────────────────── */}
            {showChat && (
              <>
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Session Chat</span>
                  <button onClick={() => setShowChat(false)} className="btn-ghost p-1">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
                  {chatMessages.length === 0 ? (
                    <p className="text-slate-400 text-xs text-center py-8">No messages yet</p>
                  ) : (
                    chatMessages.map((msg, i) => {
                      const isMe = msg.sender._id === user?._id?.toString();
                      return (
                        <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                            {!isMe && (
                              <span className="text-[10px] text-slate-400 ml-1">{msg.sender.username}</span>
                            )}
                            <div
                              className={`px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                                isMe
                                  ? 'bg-brand-600 text-white rounded-br-sm'
                                  : 'bg-slate-100 dark:bg-surface-700 text-slate-700 dark:text-slate-300 rounded-bl-sm'
                              }`}
                            >
                              {msg.message}
                            </div>
                            <span className="text-[9px] text-slate-400 mx-1">
                              {format(new Date(msg.timestamp), 'HH:mm')}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>
                <form
                  onSubmit={handleChatSubmit}
                  className="p-3 border-t border-slate-100 dark:border-slate-700 flex gap-2"
                >
                  <input
                    id="chat-input"
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Message…"
                    className="input flex-1 text-xs py-1.5"
                    maxLength={500}
                    autoComplete="off"
                  />
                  <button
                    type="submit"
                    id="chat-send-btn"
                    disabled={!chatInput.trim()}
                    className="btn-primary p-2 flex-shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </>
            )}

            {/* ── Participants panel ───────────────────────────────────────── */}
            {showParticipants && (
              <>
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Participants ({participants.length})
                  </span>
                  <button onClick={() => setShowParticipants(false)} className="btn-ghost p-1">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {participants.map((p) => {
                    const isMe = p._id?.toString() === user?._id?.toString();
                    const hasCursor = !!p.cursor;
                    return (
                      <div
                        key={p.socketId || p._id}
                        id={`participant-${p._id}`}
                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-surface-700 transition-colors"
                      >
                        {/* Color avatar */}
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: p.color || '#6366f1' }}
                        >
                          {p.username?.[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                              {p.username}
                            </span>
                            {isMe && (
                              <span className="text-[9px] bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 px-1.5 py-0.5 rounded-full font-medium">
                                you
                              </span>
                            )}
                          </div>
                          {hasCursor && (
                            <p className="text-[10px] text-slate-400 font-mono">
                              Line {p.cursor?.lineNumber}, Col {p.cursor?.column}
                            </p>
                          )}
                        </div>
                        {/* Online dot */}
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: p.color || '#6366f1' }}
                          title="Online"
                        />
                      </div>
                    );
                  })}
                  {participants.length === 0 && (
                    <p className="text-slate-400 text-xs text-center py-8">No one else is here yet</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Side panel: Comments ────────────────────────────────────────── */}
        {showComments && (
          <SessionCommentsSidebar
            sessionId={sessionId}
            activeLine={activeLine}
            onClose={() => setShowComments(false)}
          />
        )}        {/* ── Side panel: AI Review Results ───────────────────────────────── */}
        {showAiReview && aiReviewResult && (
          <AiReviewSummarySidebar
            review={aiReviewResult}
            onSelectLine={handleSelectReviewLine}
            onReRun={handleRunAiReview}
            isPending={runAiReviewMutation.isPending}
            onClose={() => setShowAiReview(false)}
          />
        )}
      </div>
    </div>
  );
};

export default SessionPage;
