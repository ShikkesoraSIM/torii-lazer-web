// Admin operational tool: edit a user's previous usernames (the profile
// "formerly known as" list). Remove individual past names or clear them all.
//
// Backed by:
//   GET    /api/private/admin/users/{id}/previous-usernames         -> list
//   POST   /api/private/admin/users/{id}/previous-usernames/remove  -> remove names
//   DELETE /api/private/admin/users/{id}/previous-usernames         -> clear all
//
// Reuses the same debounced avatar+id+username picker as the recalc tool.
// Every mutating endpoint invalidates the user's profile cache server-side,
// so changes show on the profile right away.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { adminAPI } from '../../utils/api/admin';

interface UserOption {
  id: number;
  username: string;
  avatar_url?: string | null;
}

const SEARCH_DEBOUNCE_MS = 300;

const AdminPastUsernamesSection: React.FC = () => {
  // ── User picker state (mirrors AdminUserRecalcSection) ──────────────
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<UserOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<UserOption | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Past-names state ────────────────────────────────────────────────
  const [names, setNames] = useState<string[]>([]);
  const [loadingNames, setLoadingNames] = useState(false);
  const [busyName, setBusyName] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  const runSearch = useCallback(async (value: string) => {
    if (!value.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const data = await adminAPI.getUsers({ search: value.trim(), limit: 20 });
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

  const loadNames = useCallback(async (userId: number) => {
    setLoadingNames(true);
    try {
      const data = await adminAPI.getUserPreviousUsernames(userId);
      setNames(data.previous_usernames ?? []);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to load previous usernames');
      setNames([]);
    } finally {
      setLoadingNames(false);
    }
  }, []);

  const selectUser = (u: UserOption) => {
    setSelected(u);
    setSearch(u.username);
    setResults([]);
    setNames([]);
    loadNames(u.id);
  };

  const clearSelection = () => {
    setSelected(null);
    setSearch('');
    setNames([]);
  };

  const handleRemove = async (name: string) => {
    if (!selected) return;
    setBusyName(name);
    try {
      const data = await adminAPI.removeUserPreviousUsernames(selected.id, [name]);
      setNames(data.previous_usernames ?? []);
      toast.success(`Removed "${name}"`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to remove name');
    } finally {
      setBusyName(null);
    }
  };

  const handleClearAll = async () => {
    if (!selected) return;
    if (
      !window.confirm(
        `Clear ALL previous usernames for ${selected.username}? This wipes the "formerly known as" on their profile.`
      )
    ) {
      return;
    }
    setClearing(true);
    try {
      const data = await adminAPI.clearUserPreviousUsernames(selected.id);
      setNames(data.previous_usernames ?? []);
      toast.success('Cleared all previous usernames');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to clear');
    } finally {
      setClearing(false);
    }
  };

  return (
    <section className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
      <div>
        <h3 className="text-base font-semibold text-white">Past usernames</h3>
        <p className="text-xs text-gray-400 mt-1">
          Edit a user's "formerly known as" list. Remove individual past names or clear them all.
          Changes apply to their profile immediately.
        </p>
      </div>

      {/* Search + select — same picker as the recalc tool */}
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
            {searching && <li className="px-3 py-2 text-xs text-gray-400">Searching…</li>}
            {!searching && results.length === 0 && (
              <li className="px-3 py-2 text-xs text-gray-400">No matches.</li>
            )}
            {results.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => selectUser(u)}
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
        <>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-osu-pink/10 border border-osu-pink/30">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-400">Selected</div>
              <div className="text-sm font-semibold text-white">
                {selected.username} <span className="text-gray-400 font-normal">· id {selected.id}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={clearSelection}
              className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/15 text-white rounded-lg"
            >
              Clear
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs uppercase tracking-wider text-gray-400">
                Previous usernames ({names.length})
              </h4>
              {names.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  disabled={clearing}
                  className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg"
                >
                  {clearing ? 'Clearing…' : 'Clear all'}
                </button>
              )}
            </div>

            {loadingNames ? (
              <div className="text-sm text-gray-500">Loading…</div>
            ) : names.length === 0 ? (
              <div className="text-sm text-gray-500">
                No previous usernames. Nothing shows under "formerly known as".
              </div>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {names.map((name, i) => (
                  <li
                    key={`${name}-${i}`}
                    className="flex items-center gap-2 pl-3 pr-1.5 py-1 rounded-full bg-white/5 border border-white/10"
                  >
                    <span className="text-sm text-white">{name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemove(name)}
                      disabled={busyName === name}
                      title="Remove this name"
                      className="w-5 h-5 flex items-center justify-center rounded-full bg-white/10 hover:bg-red-600/80 text-white/70 hover:text-white text-xs leading-none disabled:opacity-50"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[11px] text-gray-500">
              Removing a name that appears more than once (e.g. a duplicated default name) drops every copy.
            </p>
          </div>
        </>
      )}
    </section>
  );
};

export default AdminPastUsernamesSection;
