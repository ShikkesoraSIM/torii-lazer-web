// Admin -> Beatmap Blacklist
//
// Backend (g0v0-server admin router) supports three flavours of ban:
//   POST /admin/beatmaps/blacklist  body {beatmap_id}      -> ban one difficulty
//   POST /admin/beatmaps/blacklist  body {beatmapset_id}   -> ban every difficulty in the set
//   GET  /admin/beatmaps/blacklist                         -> one row per banned beatmap
//   DELETE /admin/beatmaps/blacklist/{beatmapset_id}       -> unban whole set
//   DELETE /admin/beatmaps/blacklist/beatmap/{beatmap_id}  -> unban one diff
//
// The list now returns ONE row per beatmap (no longer deduped by set).
// We group rows in the UI on the fly so a "set ban" reads as a single
// folded entry but expands to show every difficulty inside.

import React, { useEffect, useMemo, useState } from 'react';
import { adminAPI } from '../../utils/api';
import toast from 'react-hot-toast';

type GameModeStr = 'osu' | 'taiko' | 'fruits' | 'mania' | 'osurx' | 'taikorx' | 'fruitsrx' | 'osuap';

interface BlacklistedBeatmap {
  id: number;
  beatmapset_id: number;
  beatmap_id: number;
  source: string;
  reason: string | null;
  beatmapset?: { id: number; title: string; artist: string } | null;
  beatmap?: {
    id: number;
    version: string;
    difficulty_rating: number;
    mode: GameModeStr;
    total_length: number;
    bpm?: number;
  } | null;
}

type AddMode = 'set' | 'single';
type ScopeFilter = 'all' | 'sets' | 'singles';

const formatLength = (seconds: number): string => {
  if (!seconds || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const MODE_LABEL: Record<GameModeStr, string> = {
  osu: 'osu!',
  taiko: 'Taiko',
  fruits: 'Catch',
  mania: 'Mania',
  osurx: 'osu!RX',
  taikorx: 'Taiko RX',
  fruitsrx: 'Catch RX',
  osuap: 'osu!AP',
};

interface SetGroup {
  beatmapset_id: number;
  beatmapset?: { id: number; title: string; artist: string } | null;
  rows: BlacklistedBeatmap[];
}

const AdminBeatmapBlacklist: React.FC = () => {
  const [items, setItems] = useState<BlacklistedBeatmap[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);

  // Form state for the "Add" panel.
  const [addMode, setAddMode] = useState<AddMode>('set');
  const [addInput, setAddInput] = useState('');

  // Filters.
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<ScopeFilter>('all');

  // Per-set expand/collapse state. A row that's banned at the set level
  // (every difficulty in the set is in the blacklist) shows a collapsed
  // summary by default; click expands to show each difficulty.
  const [expandedSetIds, setExpandedSetIds] = useState<Set<number>>(() => new Set());

  const loadBlacklist = async () => {
    try {
      setLoading(true);
      const data = await adminAPI.getBlacklistedBeatmaps();
      setItems((data as BlacklistedBeatmap[]) || []);
    } catch (error) {
      console.error('Failed to load blacklist:', error);
      toast.error('Failed to load blacklisted beatmaps');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlacklist();
  }, []);

  // Group by beatmapset_id so the table can fold "set bans" into one
  // collapsible row. Order: most-recently-added (highest id) first
  // within each group; groups themselves ordered by their max id desc.
  const groups: SetGroup[] = useMemo(() => {
    const byId: Map<number, SetGroup> = new Map();
    for (const row of items) {
      const existing = byId.get(row.beatmapset_id);
      if (existing) {
        existing.rows.push(row);
      } else {
        byId.set(row.beatmapset_id, {
          beatmapset_id: row.beatmapset_id,
          beatmapset: row.beatmapset ?? null,
          rows: [row],
        });
      }
    }
    const list = Array.from(byId.values());
    for (const g of list) g.rows.sort((a, b) => b.id - a.id);
    list.sort((a, b) => Math.max(...b.rows.map((r) => r.id)) - Math.max(...a.rows.map((r) => r.id)));
    return list;
  }, [items]);

  // Apply filters AFTER grouping so "scope=sets" naturally hides
  // groups with only one row, etc.
  const visibleGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return groups.filter((g) => {
      if (scope === 'sets' && g.rows.length < 2) return false;
      if (scope === 'singles' && g.rows.length !== 1) return false;

      if (q) {
        const haystack = [
          g.beatmapset?.title,
          g.beatmapset?.artist,
          String(g.beatmapset_id),
          ...g.rows.map((r) => r.beatmap?.version || ''),
          ...g.rows.map((r) => String(r.beatmap_id)),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [groups, search, scope]);

  // Quick stats across all (not filtered) entries — gives the admin a
  // sense of catalog size at a glance.
  const stats = useMemo(() => {
    let setCount = 0;
    let singleCount = 0;
    for (const g of groups) {
      if (g.rows.length >= 2) setCount += 1;
      else singleCount += 1;
    }
    return {
      total: items.length,
      groupCount: groups.length,
      setCount,
      singleCount,
    };
  }, [groups, items.length]);

  const toggleExpanded = (id: number) => {
    setExpandedSetIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = parseInt(addInput, 10);
    if (!Number.isFinite(id) || id <= 0) {
      toast.error('Enter a valid numeric ID');
      return;
    }

    setAdding(true);
    try {
      if (addMode === 'set') {
        await adminAPI.addBlacklistedBeatmapSet(id);
        toast.success(`Beatmapset ${id} blacklisted`);
      } else {
        await adminAPI.addBlacklistedBeatmap(id);
        toast.success(`Beatmap ${id} blacklisted`);
      }
      setAddInput('');
      loadBlacklist();
    } catch (error: any) {
      console.error('Failed to add to blacklist:', error);
      toast.error(error?.response?.data?.detail || 'Failed to add to blacklist');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveSet = async (group: SetGroup) => {
    const label = group.beatmapset?.title || `set ${group.beatmapset_id}`;
    if (!confirm(`Unblacklist every difficulty in "${label}"?`)) return;
    setRemovingId(group.beatmapset_id);
    try {
      await adminAPI.removeBlacklistedBeatmapSet(group.beatmapset_id);
      toast.success(`Unblacklisted ${label}`);
      loadBlacklist();
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to unblacklist set');
    } finally {
      setRemovingId(null);
    }
  };

  const handleRemoveSingle = async (row: BlacklistedBeatmap) => {
    if (!confirm(`Unblacklist beatmap ${row.beatmap_id}${row.beatmap?.version ? ` [${row.beatmap.version}]` : ''}?`)) return;
    setRemovingId(row.id);
    try {
      await adminAPI.removeBlacklistedSingleBeatmap(row.beatmap_id);
      toast.success('Difficulty unblacklisted');
      loadBlacklist();
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to unblacklist beatmap');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Beatmap Blacklist</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Banned beatmaps reject score submissions server-side. Bans live in the same table whether
          they target a single difficulty or every difficulty in a set.
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Banned beatmaps" value={stats.total} />
        <StatTile label="Distinct sets" value={stats.groupCount} />
        <StatTile label="Whole-set bans" value={stats.setCount} accent />
        <StatTile label="Single-diff bans" value={stats.singleCount} accent />
      </div>

      {/* Add form */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Add to blacklist</h3>
          {/* Mode toggle: pill switch between set-level vs single. */}
          <div className="inline-flex p-0.5 bg-white/5 border border-white/10 rounded-full text-xs">
            <button
              type="button"
              className={`px-3 py-1 rounded-full transition-colors ${
                addMode === 'set' ? 'bg-osu-pink text-white' : 'text-gray-300 hover:text-white'
              }`}
              onClick={() => setAddMode('set')}
            >
              Beatmapset
            </button>
            <button
              type="button"
              className={`px-3 py-1 rounded-full transition-colors ${
                addMode === 'single' ? 'bg-osu-pink text-white' : 'text-gray-300 hover:text-white'
              }`}
              onClick={() => setAddMode('single')}
            >
              Single difficulty
            </button>
          </div>
        </div>
        <form onSubmit={handleAdd} className="flex gap-3">
          <input
            type="number"
            value={addInput}
            onChange={(e) => setAddInput(e.target.value)}
            placeholder={addMode === 'set' ? 'Beatmapset ID (bans every diff in the set)' : 'Beatmap ID (one specific difficulty)'}
            className="flex-1 px-4 py-2 rounded-xl bg-[rgba(12,16,42,0.72)] border border-white/15 text-white text-sm focus:ring-2 focus:ring-profile-color/60 focus:border-white/30 placeholder:text-white/40"
            required
            min={1}
            disabled={adding}
          />
          <button
            type="submit"
            disabled={adding}
            className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
          >
            {adding ? 'Adding…' : 'Blacklist'}
          </button>
        </form>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title, artist, version, or ID…"
          className="flex-1 min-w-[240px] px-3 py-2 rounded-xl bg-[rgba(12,16,42,0.72)] border border-white/15 text-white text-sm focus:ring-2 focus:ring-profile-color/60 placeholder:text-white/40"
        />
        <div className="inline-flex p-0.5 bg-white/5 border border-white/10 rounded-full text-xs">
          {(['all', 'sets', 'singles'] as ScopeFilter[]).map((s) => (
            <button
              key={s}
              className={`px-3 py-1 rounded-full transition-colors ${
                scope === s ? 'bg-osu-pink text-white' : 'text-gray-300 hover:text-white'
              }`}
              onClick={() => setScope(s)}
            >
              {s === 'all' ? 'All' : s === 'sets' ? 'Sets' : 'Singles'}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : visibleGroups.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No matching blacklisted beatmaps.
        </div>
      ) : (
        <ul className="space-y-2">
          {visibleGroups.map((g) => {
            const isSet = g.rows.length >= 2;
            const expanded = expandedSetIds.has(g.beatmapset_id);
            return (
              <li
                key={g.beatmapset_id}
                className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden"
              >
                <div className="flex items-start gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="text-sm font-semibold text-gray-100">
                        {g.beatmapset?.artist || '—'} — {g.beatmapset?.title || `set ${g.beatmapset_id}`}
                      </span>
                      <span className="text-xs text-gray-500">set #{g.beatmapset_id}</span>
                      {isSet ? (
                        <span className="text-[10px] uppercase tracking-wider text-red-300 bg-red-500/15 border border-red-500/30 px-2 py-0.5 rounded-full">
                          {g.rows.length} difficulties banned
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase tracking-wider text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                          single difficulty
                        </span>
                      )}
                    </div>
                    {!isSet && g.rows[0].beatmap && (
                      <div className="text-xs text-gray-400 mt-1">
                        [{g.rows[0].beatmap.version}] · ★{g.rows[0].beatmap.difficulty_rating.toFixed(2)} ·{' '}
                        {MODE_LABEL[g.rows[0].beatmap.mode] || g.rows[0].beatmap.mode} · {formatLength(g.rows[0].beatmap.total_length)}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isSet && (
                      <button
                        onClick={() => toggleExpanded(g.beatmapset_id)}
                        className="px-2 py-1 text-xs rounded-md bg-white/5 hover:bg-white/10 text-gray-300"
                      >
                        {expanded ? 'Hide diffs' : 'Show diffs'}
                      </button>
                    )}
                    <button
                      onClick={() => (isSet ? handleRemoveSet(g) : handleRemoveSingle(g.rows[0]))}
                      disabled={removingId === g.beatmapset_id || removingId === g.rows[0].id}
                      className="px-3 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-md disabled:opacity-50"
                    >
                      {isSet ? 'Unblacklist set' : 'Unblacklist'}
                    </button>
                  </div>
                </div>

                {/* Expanded difficulty list (only for grouped set bans) */}
                {isSet && expanded && (
                  <ul className="border-t border-white/10 divide-y divide-white/5">
                    {g.rows.map((row) => (
                      <li key={row.id} className="flex items-center gap-3 px-4 py-2 text-xs text-gray-300">
                        <div className="flex-1">
                          {row.beatmap ? (
                            <>
                              <span className="font-medium text-gray-100">[{row.beatmap.version}]</span>
                              <span className="ml-2 text-gray-500">★{row.beatmap.difficulty_rating.toFixed(2)}</span>
                              <span className="ml-2 text-gray-500">{MODE_LABEL[row.beatmap.mode] || row.beatmap.mode}</span>
                              <span className="ml-2 text-gray-500">{formatLength(row.beatmap.total_length)}</span>
                            </>
                          ) : (
                            <span className="text-gray-500 italic">beatmap #{row.beatmap_id} (metadata missing)</span>
                          )}
                          <span className="ml-3 text-gray-600">id {row.beatmap_id}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveSingle(row)}
                          disabled={removingId === row.id}
                          className="px-2 py-1 text-xs bg-emerald-600/80 hover:bg-emerald-700 text-white rounded disabled:opacity-50"
                        >
                          Unblacklist this diff
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

interface StatTileProps {
  label: string;
  value: number;
  accent?: boolean;
}

const StatTile: React.FC<StatTileProps> = ({ label, value, accent }) => (
  <div
    className={`rounded-xl px-4 py-3 border border-white/10 ${accent ? 'bg-osu-pink/10' : 'bg-white/5'}`}
  >
    <div className="text-[11px] uppercase tracking-wider text-white/55">{label}</div>
    <div className="text-2xl font-bold text-white tabular-nums">{value.toLocaleString()}</div>
  </div>
);

export default AdminBeatmapBlacklist;
