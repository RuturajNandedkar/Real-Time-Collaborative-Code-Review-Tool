import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, Search, Users, Clock, Code2, ArrowRight, Loader2,
  FolderOpen, Hash, Sparkles, Zap, ExternalLink
} from 'lucide-react';
import { useRooms, useCreateRoom, useJoinRoom } from '../../hooks/useRooms';
import { useSessions, useCreateSession } from '../../hooks/useSessions';
import useAuthStore from '../../store/authStore';
import { formatDistanceToNow } from 'date-fns';

const LANGUAGE_COLORS = {
  javascript: 'bg-yellow-400',
  typescript: 'bg-blue-400',
  python:     'bg-green-400',
  java:       'bg-red-400',
  cpp:        'bg-orange-400',
  go:         'bg-cyan-400',
  rust:       'bg-orange-600',
  default:    'bg-slate-400',
};

const LANG_LABELS = {
  javascript: 'JavaScript', typescript: 'TypeScript', python: 'Python',
  java: 'Java', cpp: 'C++', csharp: 'C#', go: 'Go', rust: 'Rust',
  plaintext: 'Plain Text',
};

const SUPPORTED_LANGUAGES = [
  'javascript', 'typescript', 'python', 'java', 'cpp', 'csharp',
  'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'html', 'css', 'sql', 'plaintext',
];

// ─── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = ['Sessions', 'Rooms'];

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Data
  const { data: rooms = [], isLoading: roomsLoading } = useRooms();
  const { data: sessions = [], isLoading: sessionsLoading } = useSessions();
  const createRoom = useCreateRoom();
  const joinRoom = useJoinRoom();
  const createSession = useCreateSession();

  // UI state
  const [activeTab, setActiveTab] = useState('Sessions');
  const [search, setSearch] = useState('');
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [showCreateSessionModal, setShowCreateSessionModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: '', description: '', language: 'javascript', isPublic: false });
  const [newSession, setNewSession] = useState({ title: '', language: 'javascript' });
  const [inviteCode, setInviteCode] = useState('');

  // ── Filtered lists ──────────────────────────────────────────────────────────
  const filteredRooms = rooms.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase())
  );
  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    const result = await createRoom.mutateAsync(newRoom);
    if (result) {
      setShowCreateRoomModal(false);
      setNewRoom({ name: '', description: '', language: 'javascript', isPublic: false });
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    const result = await createSession.mutateAsync(newSession);
    if (result) {
      setShowCreateSessionModal(false);
      navigate(`/sessions/${result.sessionId}`);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    const result = await joinRoom.mutateAsync(inviteCode);
    if (result) {
      setShowJoinModal(false);
      setInviteCode('');
    }
  };

  const isLoading = activeTab === 'Sessions' ? sessionsLoading : roomsLoading;

  return (
    <div className="animate-fade-in">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Welcome back, <span className="text-gradient">{user?.username}</span> 👋
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            {sessions.length} session{sessions.length !== 1 ? 's' : ''} · {rooms.length} room{rooms.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="join-room-btn"
            onClick={() => setShowJoinModal(true)}
            className="btn-secondary"
          >
            <Hash className="w-4 h-4" />
            Join Room
          </button>
          <button
            id="new-session-btn"
            onClick={() => setShowCreateSessionModal(true)}
            className="btn-primary"
          >
            <Zap className="w-4 h-4" />
            New Session
          </button>
          <button
            id="create-room-btn"
            onClick={() => setShowCreateRoomModal(true)}
            className="btn-secondary"
          >
            <Plus className="w-4 h-4" />
            New Room
          </button>
        </div>
      </div>

      {/* ── Tabs + Search ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5 gap-4">
        {/* Tabs */}
        <div className="flex items-center bg-surface-100 dark:bg-surface-800 rounded-xl p-1 gap-0.5">
          {TABS.map((tab) => (
            <button
              key={tab}
              id={`tab-${tab.toLowerCase()}`}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-white dark:bg-surface-700 text-slate-800 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {tab}
              <span className="ml-1.5 text-[10px] font-semibold opacity-60">
                {tab === 'Sessions' ? sessions.length : rooms.length}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="dashboard-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${activeTab.toLowerCase()}…`}
            className="input pl-10 w-52"
          />
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        </div>
      ) : activeTab === 'Sessions' ? (
        /* ── Sessions Grid ── */
        filteredSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-brand-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center mb-4">
              <Zap className="w-8 h-8 text-brand-500" />
            </div>
            <h3 className="text-slate-700 dark:text-slate-300 font-semibold mb-1">No sessions yet</h3>
            <p className="text-slate-400 text-sm mb-4">Sessions are lightweight, real-time code reviews.</p>
            <button onClick={() => setShowCreateSessionModal(true)} className="btn-primary" id="empty-new-session-btn">
              <Zap className="w-4 h-4" />
              Create your first session
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSessions.map((session) => (
              <Link
                key={session._id}
                to={`/sessions/${session.sessionId}`}
                id={`session-card-${session.sessionId}`}
                className="card-hover p-5 group relative overflow-hidden"
              >
                {/* Gradient accent strip */}
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-brand-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${LANGUAGE_COLORS[session.language] || LANGUAGE_COLORS.default}`} />
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      {LANG_LABELS[session.language] || session.language}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="badge-brand text-[10px]">Session</span>
                    <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-brand-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>

                <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2 truncate">
                  {session.title}
                </h3>

                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mb-3">
                  <ExternalLink className="w-3 h-3" />
                  {session.sessionId?.slice(0, 8)}…
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                    <Users className="w-3.5 h-3.5" />
                    <span>{session.participantCount ?? session.participants?.length ?? 1}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatDistanceToNow(new Date(session.updatedAt || session.createdAt), { addSuffix: true })}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )
      ) : (
        /* ── Rooms Grid ── */
        filteredRooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 bg-surface-100 dark:bg-surface-700 rounded-2xl flex items-center justify-center mb-4">
              <FolderOpen className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-slate-700 dark:text-slate-300 font-semibold mb-1">No rooms yet</h3>
            <p className="text-slate-400 text-sm">Create or join a review room to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRooms.map((room) => (
              <Link
                key={room._id}
                to={`/rooms/${room._id}`}
                id={`room-card-${room._id}`}
                className="card-hover p-5 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${LANGUAGE_COLORS[room.language] || LANGUAGE_COLORS.default}`} />
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      {room.language}
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-brand-500 group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1 truncate">{room.name}</h3>
                {room.description && (
                  <p className="text-slate-500 dark:text-slate-400 text-xs truncate mb-3">{room.description}</p>
                )}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                    <Users className="w-3.5 h-3.5" />
                    <span>{room.participantCount || 1}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatDistanceToNow(new Date(room.updatedAt), { addSuffix: true })}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )
      )}

      {/* ── Create Session Modal ─────────────────────────────────────────────── */}
      {showCreateSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="card w-full max-w-md p-6 animate-slide-up">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">New Collaborative Session</h2>
                <p className="text-xs text-slate-400">Real-time code review with live cursors</p>
              </div>
            </div>
            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Session Title *</label>
                <input
                  id="new-session-title"
                  type="text"
                  value={newSession.title}
                  onChange={(e) => setNewSession({ ...newSession, title: e.target.value })}
                  placeholder="e.g. Auth module refactor review"
                  className="input"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Language</label>
                <select
                  id="new-session-language"
                  value={newSession.language}
                  onChange={(e) => setNewSession({ ...newSession, language: e.target.value })}
                  className="input"
                >
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <option key={l} value={l}>{LANG_LABELS[l] || l}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowCreateSessionModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={createSession.isPending} className="btn-primary flex-1" id="create-session-submit">
                  {createSession.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                    <><Zap className="w-4 h-4" /> Create & Join</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Create Room Modal ────────────────────────────────────────────────── */}
      {showCreateRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="card w-full max-w-md p-6 animate-slide-up">
            <div className="flex items-center gap-2 mb-5">
              <Sparkles className="w-5 h-5 text-brand-500" />
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Create Review Room</h2>
            </div>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Room Name *</label>
                <input
                  id="new-room-name"
                  type="text"
                  value={newRoom.name}
                  onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                  placeholder="e.g. PR #42 — Auth refactor"
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  value={newRoom.description}
                  onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
                  placeholder="Optional description..."
                  className="input resize-none"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Language</label>
                <select
                  value={newRoom.language}
                  onChange={(e) => setNewRoom({ ...newRoom, language: e.target.value })}
                  className="input"
                >
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <option key={l} value={l}>{LANG_LABELS[l] || l}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newRoom.isPublic}
                  onChange={(e) => setNewRoom({ ...newRoom, isPublic: e.target.checked })}
                  className="w-4 h-4 accent-brand-500"
                />
                <span className="text-sm text-slate-600 dark:text-slate-400">Make room public</span>
              </label>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowCreateRoomModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={createRoom.isPending} className="btn-primary flex-1" id="create-room-submit">
                  {createRoom.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Join Room Modal ──────────────────────────────────────────────────── */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="card w-full max-w-sm p-6 animate-slide-up">
            <div className="flex items-center gap-2 mb-5">
              <Hash className="w-5 h-5 text-brand-500" />
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Join a Room</h2>
            </div>
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Invite Code</label>
                <input
                  id="invite-code-input"
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="e.g. A3F2D"
                  className="input font-mono tracking-widest text-center text-lg uppercase"
                  required
                  maxLength={10}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowJoinModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={joinRoom.isPending} className="btn-primary flex-1" id="join-room-submit">
                  {joinRoom.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Join Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
