// Admin operational tool: queue a per-user PP recalculation.
//
// Backed by:
//   POST /api/private/admin/recalculate/user/{id}  -> enqueue
//   GET  /api/private/admin/recalculate/status     -> queue snapshot
//   GET  /api/private/admin/users?search=&limit=   -> autocomplete
//
// The actual subprocess runs server-side (tools/recalculate.py); this
// UI is just a queueing console. Status panel auto-refreshes every 5s
// while a job is running so the admin can see progress without manual
// polling, then drops to a slower 30s cadence when idle.
//
// Self-contained section component so it can drop into AdminMaintenance
// (or any future "operational tools" tab) without dragging shared state.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { adminAPI, type RecalcTask } from '../../utils/api/admin';

interface UserOption {
  id: number;
  username: string;
  avatar_url?: string | null;
}

const SEARCH_DEBOUNCE_MS = 300;
const STATUS_POLL_FAST_MS = 5_000;   // when something is running / pending
const STATUS_POLL_SLOW_MS = 30_000;  // when queue is fully idle

const AdminUserRecalcSection: React.FC = () => {
  // ── User picker state ──────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<UserOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<UserOption | null>(null);

  // Debounce ref so we don't fire a request per keystroke. Clears on
  // unmount + on every change so stale searches never overwrite a
  // newer in-flight one.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Queue/status state ─────────────────────────────────────────────
  const [status, setStatus] = useState<{
    running: RecalcTask | null;
    pending: RecalcTask[];
    pending_count: number;
    recent: RecalcTask[];
  } | null>(null);
  const [enqueueBusy, setEnqueueBusy] = useState(false);

  // ── User search ────────────────────────────────────────────────────
  const runSearch = useCallback(async (value: string) => {
    if (!value.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const data = await adminAPI.getUsers({ search: value.trim(), limit: 20 });
      // The full /admin/users response is rich -- we only need
      // (id, username, avatar_url) for the picker.
      const slim: UserOption[] = (data || []).map((u: any) => ({
        id: u.id,
        username: u.username,
        avatar_url: u.avatar_url,
      }));
      setResults(slim);
    } catch (err) {
      console.error(err);
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!search.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => runSearch(search), SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, runSearch]);

  // ── Status polling ─────────────────────────────────────────────────
  const refreshStatus = useCallback(async () => {
    try {
      const data = await adminAPI.getRecalculationStatus();
      setStatus(data);
    } catch (err) {
      // Silent — banner-style polling shouldn't toast on hiccups.
      console.error('Recalc status fetch failed:', err);
    }
  }, []);

  // Cadence depends on activity: fast while there's anything to watch,
  // slow when idle so we don't burn cycles on a sleeping queue.
  const interval = useMemo(() => {
    if (!status) return STATUS_POLL_FAST_MS;
    if (status.running || status.pending_count > 0) return STATUS_POLL_FAST_MS;
    return STATUS_POLL_SLOW_MS;
  }, [status]);

  useEffect(() => {
    refreshStatus();
    const t = setInterval(refreshStatus, interval);
    return () => clearInterval(t);
  }, [refreshStatus, interval]);

  // ── Mutations ──────────────────────────────────────────────────────

  const handleEnqueue = async () => {
    if (!selected) {
      toast.error('Pick a user from the search results first');
      return;
    }
    setEnqueueBusy(true);
    try {
      const task = await adminAPI.recalculateUser(selected.id);
      toast.success(`Queued PP recalc for ${task.target_username || selected.username}`);
      // Snap the status panel to the new state so the admin sees the
      // pending job immediately, then let the poll take over.
      refreshStatus();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to enqueue recalc');
    } finally {
      setEnqueueBusy(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────
  const running = status?.running;
  const pending = status?.pending ?? [];
  const recent = status?.recent ?? [];

  return (
    <section className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
      <div>
        <h3 className="text-base font-semibold text-white">Per-user PP recalculation</h3>
        <p className="text-xs text-gray-400 mt-1">
          Queue a one-shot recalc against a single user. Runs as a server-side subprocess
          (<code className="text-gray-300">tools/recalculate.py performance --user-id …</code>);
          one job at a time, returns immediately, status updates here.
        </p>
      </div>

      {/* Search + select */}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users by username…"
          className="w-full px-3 py-2 rounded-xl bg-[rgba(12,16,42,0.72)] border border-white/15 text-white text-sm focus:ring-2 focus:ring-profile-color/60 placeholder:text-white/40"
        />
        {(results.length > 0 || searching) && search.trim() && !selected && (
          <ul className="absolute left-0 right-0 mt-1 z-10 max-h-64 overflow-y-auto bg-[rgba(11,15,38,0.95)] border border-white/15 rounded-xl shadow-lg">
            {searching && (
              <li className="px-3 py-2 text-xs text-gray-400">Searching…</li>
            )}
            {!searching && results.length === 0 && (
              <li className="px-3 py-2 text-xs text-gray-400">No matches.</li>
            )}
            {results.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(u);
                    setSearch(u.username);
                    setResults([]);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-white/5 flex items-center gap-2"
                >
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" className="w-6 h-6 rounded-full" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-white/70">
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm text-white">{u.username}</span>
                  <span className="text-xs text-gray-500 ml-auto">id {u.id}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-osu-pink/10 border border-osu-pink/30">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-400">Selected</div>
            <div className="text-sm font-semibold text-white">
              {selected.username} <span className="text-gray-400 font-normal">· id {selected.id}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelected(null);
              setSearch('');
            }}
            className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/15 text-white rounded-lg"
          >
            Clear
          </button>
        </div>
      )}

      <div>
        <button
          type="button"
          onClick={handleEnqueue}
          disabled={!selected || enqueueBusy || !!running}
          title={running ? 'Wait for the running job to finish' : undefined}
          className="px-4 py-2 bg-osu-pink hover:bg-osu-pink/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
        >
          {enqueueBusy ? 'Queueing…' : 'Recalculate user PP'}
        </button>
        {running && (
          <span className="ml-3 text-xs text-amber-300">Another job is currently running.</span>
        )}
      </div>

      {/* Status panel */}
      <div className="space-y-3 pt-2 border-t border-white/10">
        <div>
          <h4 className="text-xs uppercase tracking-wider text-gray-400">Currently running</h4>
          {running ? (
            <TaskRow task={running} highlight />
          ) : (
            <div className="text-sm text-gray-500 mt-1">— idle —</div>
          )}
        </div>

        {pending.length > 0 && (
          <div>
            <h4 className="text-xs uppercase tracking-wider text-gray-400">Pending ({pending.length})</h4>
            <ul className="mt-1 space-y-1">
              {pending.map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </ul>
          </div>
        )}

        <div>
          <h4 className="text-xs uppercase tracking-wider text-gray-400">Recent ({recent.length})</h4>
          {recent.length === 0 ? (
            <div className="text-sm text-gray-500 mt-1">No recent recalcs.</div>
          ) : (
            <ul className="mt-1 space-y-1">
              {recent.map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
};

interface TaskRowProps {
  task: RecalcTask;
  highlight?: boolean;
}

const STATUS_TONE: Record<RecalcTask['status'], string> = {
  pending:   'text-gray-300 bg-gray-500/15 border-gray-500/30',
  running:   'text-amber-200 bg-amber-500/15 border-amber-500/30',
  completed: 'text-emerald-200 bg-emerald-500/15 border-emerald-500/30',
  failed:    'text-red-200 bg-red-500/15 border-red-500/30',
};

const TaskRow: React.FC<TaskRowProps> = ({ task, highlight }) => {
  const [showDetails, setShowDetails] = useState(false);
  const ts = task.completed_at || task.started_at || task.enqueued_at;
  return (
    <li
      className={`px-3 py-2 rounded-lg border ${
        highlight ? 'bg-osu-pink/5 border-osu-pink/30' : 'bg-white/[0.02] border-white/10'
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${STATUS_TONE[task.status]}`}
        >
          {task.status}
        </span>
        <span className="text-sm text-white truncate">
          {task.target_username || `user ${task.target_user_id}`}
        </span>
        <span className="text-[10px] text-gray-500 ml-auto whitespace-nowrap">
          {new Date(ts).toLocaleTimeString()}
          {task.actor_username && ` · by ${task.actor_username}`}
        </span>
        {(task.error || task.stdout_tail) && (
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="text-[10px] text-osu-pink hover:underline"
          >
            {showDetails ? 'hide' : 'details'}
          </button>
        )}
      </div>
      {showDetails && (
        <div className="mt-2 text-[11px] text-gray-300 space-y-1">
          {task.error && (
            <div className="text-red-300">
              <span className="text-red-400">error:</span> {task.error}
            </div>
          )}
          {task.stdout_tail && (
            <pre className="bg-black/40 border border-white/10 rounded p-2 max-h-40 overflow-y-auto whitespace-pre-wrap font-mono text-[10px]">
              {task.stdout_tail}
            </pre>
          )}
        </div>
      )}
    </li>
  );
};

export default AdminUserRecalcSection;
