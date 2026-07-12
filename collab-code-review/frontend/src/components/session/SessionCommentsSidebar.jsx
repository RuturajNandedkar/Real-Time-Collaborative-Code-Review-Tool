import { useState, useRef, useEffect } from 'react';
import {
  MessageSquare, Send, CheckCircle2, Circle, Reply,
  HelpCircle, CornerDownRight, Plus, X, Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  useSessionComments,
  useAddSessionComment,
  useToggleResolveSessionComment,
  useAddSessionReply
} from '../../hooks/useSessions';
import useAuthStore from '../../store/authStore';

const SessionCommentsSidebar = ({ sessionId, activeLine, onClose }) => {
  const { user } = useAuthStore();
  const { data: comments = [], isLoading } = useSessionComments(sessionId);
  const addCommentMutation = useAddSessionComment(sessionId);
  const toggleResolveMutation = useToggleResolveSessionComment(sessionId);
  const addReplyMutation = useAddSessionReply(sessionId);

  const [newCommentText, setNewCommentText] = useState('');
  const [replyTexts, setReplyTexts] = useState({}); // commentId -> string
  const [commentingOnLine, setCommentingOnLine] = useState(null);

  // Set line to comment on when activeLine changes
  useEffect(() => {
    if (activeLine) {
      setCommentingOnLine(activeLine);
    }
  }, [activeLine]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim() || !commentingOnLine) return;

    await addCommentMutation.mutateAsync({
      lineNumber: commentingOnLine,
      text: newCommentText.trim()
    });
    setNewCommentText('');
  };

  const handleToggleResolve = async (commentId, resolved) => {
    await toggleResolveMutation.mutateAsync({
      commentId,
      resolved
    });
  };

  const handleAddReply = async (e, commentId) => {
    e.preventDefault();
    const replyText = replyTexts[commentId];
    if (!replyText?.trim()) return;

    await addReplyMutation.mutateAsync({
      commentId,
      text: replyText.trim()
    });

    setReplyTexts(prev => ({ ...prev, [commentId]: '' }));
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-surface-800 border-l border-slate-200 dark:border-slate-700 w-80 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-slate-700/60">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-brand-500" />
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Comments & Reviews
          </span>
        </div>
        <button onClick={onClose} className="btn-ghost p-1 text-slate-400 hover:text-slate-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Comment List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500">
            <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-xs">No comments on this file yet.</p>
            <p className="text-[10px] mt-1">Select a line in the editor to start a discussion thread.</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment._id}
              className={`p-3 rounded-xl border transition-all ${
                comment.resolved
                  ? 'bg-slate-50/50 dark:bg-surface-900/20 border-slate-100 dark:border-slate-800 opacity-75'
                  : 'bg-slate-50/80 dark:bg-surface-900/40 border-slate-100 dark:border-slate-700/80'
              }`}
            >
              {/* Comment Title / Meta */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-400 font-mono px-1.5 py-0.5 rounded">
                    Line {comment.lineNumber}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                  </span>
                </div>

                {/* Resolve Toggle Button */}
                <button
                  onClick={() => handleToggleResolve(comment._id, !comment.resolved)}
                  className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded transition-all ${
                    comment.resolved
                      ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
                      : 'text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-surface-700'
                  }`}
                  title={comment.resolved ? 'Reopen thread' : 'Resolve thread'}
                >
                  {comment.resolved ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Resolved</span>
                    </>
                  ) : (
                    <>
                      <Circle className="w-3.5 h-3.5" />
                      <span>Resolve</span>
                    </>
                  )}
                </button>
              </div>

              {/* Comment Content */}
              <div className="flex gap-2 mb-2 items-start">
                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-surface-700 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300 flex-shrink-0">
                  {comment.author?.username?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">
                    {comment.author?.username}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 break-words whitespace-pre-wrap">
                    {comment.text}
                  </p>
                </div>
              </div>

              {/* Threaded Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="pl-4 mt-3 pt-2 border-t border-slate-200/50 dark:border-slate-700/50 space-y-2.5">
                  {comment.replies.map((reply) => (
                    <div key={reply._id} className="flex gap-2 items-start text-xs">
                      <CornerDownRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                      <div className="w-5.5 h-5.5 rounded-full bg-slate-100 dark:bg-surface-800 flex items-center justify-center text-[9px] font-bold text-slate-500 dark:text-slate-400 flex-shrink-0">
                        {reply.author?.username?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-700 dark:text-slate-300 text-[10px]">
                            {reply.author?.username}
                          </span>
                          <span className="text-[9px] text-slate-400">
                            {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 mt-0.5 break-words">
                          {reply.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply Input Form */}
              {!comment.resolved && (
                <form
                  onSubmit={(e) => handleAddReply(e, comment._id)}
                  className="mt-3 pl-4 flex gap-1.5 items-center"
                >
                  <input
                    type="text"
                    placeholder="Reply..."
                    value={replyTexts[comment._id] || ''}
                    onChange={(e) =>
                      setReplyTexts(prev => ({ ...prev, [comment._id]: e.target.value }))
                    }
                    className="input text-[11px] py-1 px-2.5 flex-1 bg-white/70 dark:bg-surface-800"
                    maxLength={1000}
                  />
                  <button
                    type="submit"
                    disabled={!replyTexts[comment._id]?.trim()}
                    className="btn-primary p-1.5 flex-shrink-0"
                  >
                    <Send className="w-3 h-3" />
                  </button>
                </form>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add New Comment Box (Fixed Bottom) */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-surface-900/10">
        <form onSubmit={handleAddComment} className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">
              New comment {commentingOnLine ? `on Line ${commentingOnLine}` : '(select a line)'}
            </span>
            {commentingOnLine && (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  value={commentingOnLine}
                  onChange={(e) => setCommentingOnLine(parseInt(e.target.value) || 1)}
                  className="w-12 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-800 text-center font-mono text-[10px]"
                />
              </div>
            )}
          </div>
          <div className="flex gap-1.5">
            <textarea
              placeholder={
                commentingOnLine
                  ? "Write a comment..."
                  : "Click a line in the editor first..."
              }
              disabled={!commentingOnLine}
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              className="input text-xs py-1.5 px-2.5 resize-none flex-1 min-h-[40px] max-h-[80px]"
              rows={2}
              maxLength={2000}
            />
            <button
              type="submit"
              disabled={!newCommentText.trim() || !commentingOnLine || addCommentMutation.isPending}
              className="btn-primary px-3 self-end h-[34px] flex items-center justify-center"
            >
              {addCommentMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SessionCommentsSidebar;
