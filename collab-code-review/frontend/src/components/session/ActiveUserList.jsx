import { useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

/**
 * ActiveUserList — shows live presence badges for all session participants.
 *
 * Props:
 *  - participants    Array<{ _id, username, color, cursor, socketId }>
 *  - isConnected     boolean
 *  - currentUserId   string  (to highlight "you")
 *  - maxVisible      number  (default 5, rest shown as +N)
 */
const ActiveUserList = ({ participants = [], isConnected, currentUserId, maxVisible = 5 }) => {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? participants : participants.slice(0, maxVisible);
  const overflow = participants.length - maxVisible;

  return (
    <div className="flex items-center gap-2">
      {/* Connection status dot */}
      <div className="flex items-center gap-1" title={isConnected ? 'Live sync active' : 'Reconnecting…'}>
        {isConnected ? (
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
        ) : (
          <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
        )}
        <span className="text-xs text-slate-400 hidden sm:inline">
          {isConnected ? 'Live' : 'Reconnecting'}
        </span>
      </div>

      {/* Divider */}
      <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

      {/* Participant avatars */}
      <div className="flex items-center">
        <div className="flex -space-x-2">
          {visible.map((p) => {
            const isYou = p._id?.toString() === currentUserId?.toString();
            return (
              <div
                key={p.socketId || p._id}
                className="relative group"
                title={isYou ? `${p.username} (you)` : p.username}
              >
                {/* Avatar circle */}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold border-2 border-white dark:border-surface-800 transition-transform hover:scale-110 hover:z-10 cursor-default"
                  style={{ backgroundColor: p.color || '#6366f1' }}
                >
                  {p.username?.[0]?.toUpperCase()}
                </div>

                {/* "You" indicator ring */}
                {isYou && (
                  <div
                    className="absolute inset-0 rounded-full ring-2 ring-offset-1 dark:ring-offset-surface-800"
                    style={{ ringColor: p.color }}
                  />
                )}

                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 rounded text-[10px] font-medium text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20"
                  style={{ backgroundColor: p.color || '#6366f1' }}>
                  {p.username}{isYou ? ' (you)' : ''}
                </div>
              </div>
            );
          })}
        </div>

        {/* Overflow badge */}
        {overflow > 0 && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="ml-1 w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors border-2 border-white dark:border-surface-800"
            title={`${overflow} more participant${overflow > 1 ? 's' : ''}`}
          >
            +{overflow}
          </button>
        )}
      </div>

      {/* Participant count */}
      <span className="text-xs text-slate-400 font-medium">
        {participants.length} online
      </span>
    </div>
  );
};

export default ActiveUserList;
