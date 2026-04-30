import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  matchmakingAPI,
  type MatchmakingPool,
  type MatchmakingPoolBeatmap,
  type MatchmakingPoolType,
  type BulkBeatmapAddResponse,
  type BulkBeatmapsetAddResponse,
} from '../../utils/api';
import { AdminPoolRowSkeleton } from '../../components/Matchmaking/MatchmakingSkeletons';

/**
 * Admin matchmaking management page.
 *
 * Surfaces every operator workflow that today requires raw SQL:
 *   - list pools (active and inactive)
 *   - create / edit / delete pool config
 *   - flip the active toggle inline (no roundtrip to a modal)
 *   - manage the per-pool beatmap rotation, including bulk add by id
 *
 * Lives behind the existing AdminPanel `is_admin` gate; the backend
 * also enforces admin in `_require_admin` so non-admin users hitting
 * this URL by hand can't mutate anything.
 */

const RULESET_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'osu! standard' },
  { value: 1, label: 'osu!taiko' },
  { value: 2, label: 'osu!catch' },
  { value: 3, label: 'osu!mania' },
  { value: 4, label: 'osu!rx' },
  { value: 5, label: 'osu!ap' },
  { value: 6, label: 'taiko!rx' },
  { value: 7, label: 'fruits!rx' },
];

const POOL_TYPE_OPTIONS: { value: MatchmakingPoolType; label: string }[] = [
  { value: 'quick_play', label: 'Quick Play (free-for-all)' },
  { value: 'ranked_play', label: 'Ranked Play (1v1)' },
];

const RULESET_LABEL: Record<number, string> = Object.fromEntries(
  RULESET_OPTIONS.map((o) => [o.value, o.label]),
);

interface PoolFormState {
  ruleset_id: number;
  name: string;
  description: string;
  type: MatchmakingPoolType;
  active: boolean;
  lobby_size: number;
  rating_search_radius: number;
  rating_search_radius_max: number;
  rating_search_radius_exp: number;
}

const DEFAULT_POOL_FORM: PoolFormState = {
  ruleset_id: 0,
  name: '',
  description: '',
  type: 'quick_play',
  active: false,
  lobby_size: 8,
  rating_search_radius: 200,
  rating_search_radius_max: 9999,
  rating_search_radius_exp: 15,
};

/**
 * Admin pastes ids into the textarea — split on whitespace, commas,
 * newlines, or any non-digit. Ignores blanks and rejects anything
 * non-numeric. Keeps order, dedupes preserving first-seen.
 */
const parseBeatmapIds = (raw: string): number[] => {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const tok of raw.split(/[^0-9]+/)) {
    if (!tok) continue;
    const n = Number(tok);
    if (!Number.isFinite(n) || n <= 0) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
};

const AdminMatchmaking: React.FC = () => {
  const [pools, setPools] = useState<MatchmakingPool[]>([]);
  const [loading, setLoading] = useState(true);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<PoolFormState>(DEFAULT_POOL_FORM);
  const [createBusy, setCreateBusy] = useState(false);

  // Edit panel (per-pool inline expand)
  const [editingPoolId, setEditingPoolId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<PoolFormState | null>(null);

  // Beatmap mgmt (per-pool)
  const [poolBeatmaps, setPoolBeatmaps] = useState<MatchmakingPoolBeatmap[]>([]);
  const [poolBeatmapsLoading, setPoolBeatmapsLoading] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [bulkInitialRating, setBulkInitialRating] = useState(1500);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [lastBulkResult, setLastBulkResult] = useState<BulkBeatmapAddResponse | null>(null);

  // Mapset bulk-import — paste mapset ids and let the backend expand each
  // into all matching diffs in the SR/length window. Variables prefixed
  // `mapset` (not `set`) to avoid colliding with React's setter names.
  const [mapsetBulkInput, setMapsetBulkInput] = useState('');
  const [mapsetMinSr, setMapsetMinSr] = useState(2.5);
  const [mapsetMaxSr, setMapsetMaxSr] = useState(6.5);
  const [mapsetMinLen, setMapsetMinLen] = useState(60);
  const [mapsetMaxLen, setMapsetMaxLen] = useState(300);
  const [mapsetBulkBusy, setMapsetBulkBusy] = useState(false);
  const [lastMapsetBulkResult, setLastMapsetBulkResult] = useState<BulkBeatmapsetAddResponse | null>(null);

  // Free-text filter applied to the existing beatmap table. Matches against
  // beatmap_id, version, and the artist/title concatenation. 60-row pools
  // are tedious to scan otherwise.
  const [beatmapFilter, setBeatmapFilter] = useState('');

  // ────────── data loaders ──────────

  const loadPools = async () => {
    setLoading(true);
    try {
      const data = await matchmakingAPI.listPools({ include_inactive: true });
      setPools(data.sort((a, b) => a.id - b.id));
    } catch {
      toast.error('Failed to load matchmaking pools.');
    } finally {
      setLoading(false);
    }
  };

  const loadPoolBeatmaps = async (poolId: number) => {
    setPoolBeatmapsLoading(true);
    try {
      const data = await matchmakingAPI.listPoolBeatmaps(poolId, { limit: 200 });
      setPoolBeatmaps(data);
    } catch {
      toast.error('Failed to load pool beatmaps.');
      setPoolBeatmaps([]);
    } finally {
      setPoolBeatmapsLoading(false);
    }
  };

  useEffect(() => {
    loadPools();
  }, []);

  // When the user expands a pool, hydrate edit form + load beatmaps.
  useEffect(() => {
    if (editingPoolId == null) {
      setEditForm(null);
      setPoolBeatmaps([]);
      setLastBulkResult(null);
      setBulkInput('');
      return;
    }
    const pool = pools.find((p) => p.id === editingPoolId);
    if (!pool) return;
    setEditForm({
      ruleset_id: pool.ruleset_id,
      name: pool.name,
      description: pool.description ?? '',
      type: pool.type,
      active: pool.active,
      lobby_size: pool.lobby_size,
      rating_search_radius: pool.rating_search_radius,
      rating_search_radius_max: pool.rating_search_radius_max,
      rating_search_radius_exp: pool.rating_search_radius_exp,
    });
    loadPoolBeatmaps(editingPoolId);
  }, [editingPoolId, pools]);

  // ────────── pool mutations ──────────

  const toggleActive = async (pool: MatchmakingPool) => {
    try {
      const next = !pool.active;
      await matchmakingAPI.updatePool(pool.id, { active: next });
      toast.success(`Pool ${pool.id} ${next ? 'activated' : 'deactivated'}`);
      setPools((prev) => prev.map((p) => (p.id === pool.id ? { ...p, active: next } : p)));
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Failed to toggle pool.');
    }
  };

  const handleCreate = async () => {
    if (!createForm.name.trim()) {
      toast.error('Pool name required.');
      return;
    }
    setCreateBusy(true);
    try {
      const created = await matchmakingAPI.createPool(createForm);
      toast.success(`Pool ${created.id} created`);
      setPools((prev) => [...prev, created].sort((a, b) => a.id - b.id));
      setShowCreate(false);
      setCreateForm(DEFAULT_POOL_FORM);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Failed to create pool.');
    } finally {
      setCreateBusy(false);
    }
  };

  const handleSaveEdit = async () => {
    if (editingPoolId == null || !editForm) return;
    try {
      // PUT only the fields that actually changed wouldn't really save much
      // here; just ship the whole form and let the backend's exclude_unset
      // semantics ignore unknown fields.
      const updated = await matchmakingAPI.updatePool(editingPoolId, { ...editForm });
      toast.success(`Pool ${updated.id} saved`);
      setPools((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Failed to save pool.');
    }
  };

  const handleDelete = async (poolId: number) => {
    if (!confirm(`Delete pool ${poolId}? This cannot be undone.`)) return;
    try {
      await matchmakingAPI.deletePool(poolId);
      toast.success(`Pool ${poolId} deleted`);
      setPools((prev) => prev.filter((p) => p.id !== poolId));
      if (editingPoolId === poolId) setEditingPoolId(null);
    } catch (err: any) {
      // 409 = has audit history; surface the server's message verbatim.
      toast.error(err?.response?.data?.detail ?? 'Failed to delete pool.');
    }
  };

  // ────────── beatmap mutations ──────────

  const handleBulkAdd = async () => {
    if (editingPoolId == null) return;
    const ids = parseBeatmapIds(bulkInput);
    if (ids.length === 0) {
      toast.error('Paste at least one beatmap id.');
      return;
    }
    if (ids.length > 500) {
      toast.error('Up to 500 beatmaps per request. Split into batches.');
      return;
    }
    setBulkBusy(true);
    try {
      const res = await matchmakingAPI.bulkAddBeatmaps(editingPoolId, {
        beatmap_ids: ids,
        initial_rating: bulkInitialRating,
      });
      setLastBulkResult(res);
      toast.success(
        `Added ${res.added.length} of ${ids.length} (${res.skipped_already_in_pool.length} dupes, ${res.skipped_not_found.length} missing, ${res.skipped_wrong_mode.length} wrong mode)`,
      );
      // Refresh pool beatmaps so the table reflects the additions.
      await loadPoolBeatmaps(editingPoolId);
      // Only clear the input on full success — keeps the partial set visible
      // for the operator to re-paste the missing ids elsewhere.
      if (res.skipped_not_found.length === 0 && res.skipped_wrong_mode.length === 0) {
        setBulkInput('');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Bulk add failed.');
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkAddSets = async () => {
    if (editingPoolId == null) return;
    const ids = parseBeatmapIds(mapsetBulkInput);
    if (ids.length === 0) {
      toast.error('Paste at least one beatmapset id.');
      return;
    }
    if (ids.length > 200) {
      toast.error('Up to 200 mapsets per request. Split into batches.');
      return;
    }
    setMapsetBulkBusy(true);
    try {
      const res = await matchmakingAPI.bulkAddBeatmapsets(editingPoolId, {
        beatmapset_ids: ids,
        initial_rating: bulkInitialRating,
        min_sr: mapsetMinSr,
        max_sr: mapsetMaxSr,
        min_length_seconds: mapsetMinLen,
        max_length_seconds: mapsetMaxLen,
      });
      setLastMapsetBulkResult(res);
      toast.success(
        `Added ${res.added.length} diffs from ${ids.length} mapset${ids.length === 1 ? '' : 's'} ` +
          `(${res.skipped_already_in_pool.length} dupes, ` +
          `${res.skipped_outside_window.length} outside window, ` +
          `${res.mapsets_not_found.length} mapsets unresolved)`,
      );
      await loadPoolBeatmaps(editingPoolId);
      if (
        res.mapsets_not_found.length === 0 &&
        res.skipped_outside_window.length === 0 &&
        res.skipped_wrong_mode.length === 0
      ) {
        setMapsetBulkInput('');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Bulk add (mapsets) failed.');
    } finally {
      setMapsetBulkBusy(false);
    }
  };

  const handleRemoveBeatmap = async (poolId: number, beatmapId: number) => {
    if (!confirm(`Remove beatmap ${beatmapId} from this pool?`)) return;
    try {
      await matchmakingAPI.removePoolBeatmap(poolId, beatmapId);
      toast.success('Removed');
      setPoolBeatmaps((prev) => prev.filter((b) => b.beatmap_id !== beatmapId));
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Failed to remove beatmap.');
    }
  };

  // ────────── UI ──────────

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Matchmaking Pools</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Create pools, edit search-radius config, and curate beatmap rotations. The spectator's
            queue background service picks up changes on its next ~5s tick.
          </p>
        </div>
        <button
          onClick={() => {
            setCreateForm(DEFAULT_POOL_FORM);
            setShowCreate(true);
          }}
          className="px-4 py-2 bg-osu-pink text-white rounded-lg hover:bg-osu-pink/90 transition-colors whitespace-nowrap"
        >
          + New pool
        </button>
      </div>

      {loading ? (
        <ul className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <AdminPoolRowSkeleton key={i} />
          ))}
        </ul>
      ) : pools.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
          No pools yet. Create one to get started.
        </div>
      ) : (
        <ul className="space-y-3">
          {pools.map((pool) => {
            const expanded = editingPoolId === pool.id;
            return (
              <li
                key={pool.id}
                className={`bg-card rounded-xl border transition-all ${
                  expanded ? 'border-osu-pink shadow-lg' : 'border-card hover:border-osu-pink/30'
                }`}
              >
                {/* Pool row header */}
                <div className="flex flex-col md:flex-row md:items-center gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-xs font-mono bg-card-hover text-gray-300">
                        #{pool.id}
                      </span>
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {pool.name}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                          pool.type === 'ranked_play'
                            ? 'bg-pink-500/15 text-pink-400'
                            : 'bg-blue-500/15 text-blue-400'
                        }`}
                      >
                        {pool.type === 'ranked_play' ? 'Ranked' : 'Quick'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {RULESET_LABEL[pool.ruleset_id] ?? `mode ${pool.ruleset_id}`} · lobby{' '}
                      {pool.lobby_size} · radius {pool.rating_search_radius}→
                      {pool.rating_search_radius_max} (×2 every {pool.rating_search_radius_exp}s)
                    </p>
                  </div>

                  {/* Active toggle */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider ${
                        pool.active ? 'text-green-400' : 'text-gray-500'
                      }`}
                    >
                      {pool.active ? 'Active' : 'Off'}
                    </span>
                    <button
                      onClick={() => toggleActive(pool)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        pool.active ? 'bg-green-500/80' : 'bg-gray-600/60'
                      }`}
                      aria-label={`Toggle pool ${pool.id} active`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                          pool.active ? 'translate-x-5' : ''
                        }`}
                      />
                    </button>
                  </label>

                  <button
                    onClick={() => setEditingPoolId(expanded ? null : pool.id)}
                    className="px-3 py-1.5 rounded-lg bg-card-hover hover:bg-osu-pink/10 hover:text-osu-pink transition-colors text-sm"
                  >
                    {expanded ? 'Close' : 'Manage'}
                  </button>
                </div>

                {/* Expanded edit panel */}
                {expanded && editForm && (
                  <div className="border-t border-card p-4 md:p-5 space-y-6">
                    {/* Pool config form */}
                    <div>
                      <h4 className="font-semibold text-sm uppercase tracking-wider text-gray-400 mb-3">
                        Pool config
                      </h4>
                      {/* Description sits ABOVE the grid so it can use the
                          full row width — matches what players see on the
                          public ranking page. */}
                      <FormField label="Description (shown to players)">
                        <textarea
                          value={editForm.description}
                          onChange={(e) =>
                            setEditForm({ ...editForm, description: e.target.value })
                          }
                          placeholder="e.g. Warm-up pool · 3-5★ classics · 2-min rounds"
                          rows={2}
                          className="w-full px-3 py-2 rounded-lg bg-card-hover border border-card focus:border-osu-pink/60 focus:outline-none text-sm leading-relaxed"
                        />
                      </FormField>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                        <FormField label="Name">
                          <input
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-card-hover border border-card focus:border-osu-pink/60 focus:outline-none text-sm"
                          />
                        </FormField>
                        <FormField label="Type">
                          <select
                            value={editForm.type}
                            onChange={(e) =>
                              setEditForm({ ...editForm, type: e.target.value as MatchmakingPoolType })
                            }
                            className="w-full px-3 py-2 rounded-lg bg-card-hover border border-card focus:border-osu-pink/60 focus:outline-none text-sm"
                          >
                            {POOL_TYPE_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </FormField>
                        <FormField label="Lobby size">
                          <input
                            type="number"
                            min={2}
                            max={64}
                            value={editForm.lobby_size}
                            onChange={(e) =>
                              setEditForm({ ...editForm, lobby_size: Number(e.target.value) || 0 })
                            }
                            className="w-full px-3 py-2 rounded-lg bg-card-hover border border-card focus:border-osu-pink/60 focus:outline-none text-sm font-mono"
                          />
                        </FormField>
                        <FormField label="Initial radius">
                          <input
                            type="number"
                            value={editForm.rating_search_radius}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                rating_search_radius: Number(e.target.value) || 0,
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg bg-card-hover border border-card focus:border-osu-pink/60 focus:outline-none text-sm font-mono"
                          />
                        </FormField>
                        <FormField label="Max radius">
                          <input
                            type="number"
                            value={editForm.rating_search_radius_max}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                rating_search_radius_max: Number(e.target.value) || 0,
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg bg-card-hover border border-card focus:border-osu-pink/60 focus:outline-none text-sm font-mono"
                          />
                        </FormField>
                        <FormField label="Expand seconds">
                          <input
                            type="number"
                            value={editForm.rating_search_radius_exp}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                rating_search_radius_exp: Number(e.target.value) || 0,
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg bg-card-hover border border-card focus:border-osu-pink/60 focus:outline-none text-sm font-mono"
                          />
                        </FormField>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-4">
                        <button
                          onClick={handleSaveEdit}
                          className="px-4 py-2 bg-osu-pink text-white rounded-lg hover:bg-osu-pink/90 transition-colors text-sm"
                        >
                          Save changes
                        </button>
                        <button
                          onClick={() => handleDelete(pool.id)}
                          className="px-4 py-2 bg-red-500/15 text-red-400 hover:bg-red-500/25 rounded-lg transition-colors text-sm"
                        >
                          Delete pool
                        </button>
                      </div>
                    </div>

                    {/* Bulk add beatmaps */}
                    <div>
                      <h4 className="font-semibold text-sm uppercase tracking-wider text-gray-400 mb-3">
                        Add beatmaps
                      </h4>
                      <p className="text-xs text-gray-500 mb-2">
                        Paste beatmap ids — one per line, comma-separated, or any mix. Mode mismatch
                        and missing ids are skipped automatically; the response itemises each skip
                        reason.
                      </p>
                      <textarea
                        value={bulkInput}
                        onChange={(e) => setBulkInput(e.target.value)}
                        placeholder={'75\n2317\n2845\n…'}
                        rows={4}
                        className="w-full px-3 py-2 rounded-lg bg-card-hover border border-card focus:border-osu-pink/60 focus:outline-none text-sm font-mono"
                      />
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <label className="flex items-center gap-2 text-xs text-gray-400">
                          Initial rating
                          <input
                            type="number"
                            value={bulkInitialRating}
                            onChange={(e) => setBulkInitialRating(Number(e.target.value) || 1500)}
                            className="w-20 px-2 py-1 rounded bg-card-hover border border-card text-sm font-mono"
                          />
                        </label>
                        <button
                          disabled={bulkBusy}
                          onClick={handleBulkAdd}
                          className="px-4 py-2 bg-osu-pink text-white rounded-lg hover:bg-osu-pink/90 disabled:opacity-60 transition-colors text-sm"
                        >
                          {bulkBusy ? 'Adding…' : `Add ${parseBeatmapIds(bulkInput).length || ''} beatmaps`.trim()}
                        </button>
                      </div>

                      {lastBulkResult && (
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
                          <ResultPill label="Added" count={lastBulkResult.added.length} tone="green" />
                          <ResultPill
                            label="Already in pool"
                            count={lastBulkResult.skipped_already_in_pool.length}
                            tone="amber"
                          />
                          <ResultPill
                            label="Not found"
                            count={lastBulkResult.skipped_not_found.length}
                            tone="red"
                            ids={lastBulkResult.skipped_not_found}
                          />
                          <ResultPill
                            label="Wrong mode"
                            count={lastBulkResult.skipped_wrong_mode.length}
                            tone="red"
                            ids={lastBulkResult.skipped_wrong_mode}
                          />
                        </div>
                      )}
                    </div>

                    {/* Bulk import by beatmapset id — expand each into its
                        ranked diffs that fit the SR / length window. */}
                    <div className="rounded-xl bg-card-hover/40 border border-card p-4">
                      <h4 className="font-semibold text-sm uppercase tracking-wider text-gray-400 mb-1">
                        Add whole mapsets
                      </h4>
                      <p className="text-xs text-gray-500 mb-3">
                        Paste beatmapset ids — the number after <code>/beatmapsets/</code> on the
                        osu.ppy.sh URL. The backend expands each into its ranked diffs that match
                        the pool's mode AND your SR / length window, so you don't have to copy
                        every individual difficulty id.
                      </p>
                      <textarea
                        value={mapsetBulkInput}
                        onChange={(e) => setMapsetBulkInput(e.target.value)}
                        placeholder={'2347\n3289\n7028'}
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg bg-card border border-card focus:border-osu-pink/60 focus:outline-none text-sm font-mono"
                      />
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                        <label className="text-xs text-gray-400">
                          Min SR
                          <input
                            type="number"
                            step="0.1"
                            value={mapsetMinSr}
                            onChange={(e) => setMapsetMinSr(Number(e.target.value) || 0)}
                            className="mt-1 w-full px-2 py-1 rounded bg-card border border-card text-sm font-mono"
                          />
                        </label>
                        <label className="text-xs text-gray-400">
                          Max SR
                          <input
                            type="number"
                            step="0.1"
                            value={mapsetMaxSr}
                            onChange={(e) => setMapsetMaxSr(Number(e.target.value) || 0)}
                            className="mt-1 w-full px-2 py-1 rounded bg-card border border-card text-sm font-mono"
                          />
                        </label>
                        <label className="text-xs text-gray-400">
                          Min length (s)
                          <input
                            type="number"
                            value={mapsetMinLen}
                            onChange={(e) => setMapsetMinLen(Number(e.target.value) || 0)}
                            className="mt-1 w-full px-2 py-1 rounded bg-card border border-card text-sm font-mono"
                          />
                        </label>
                        <label className="text-xs text-gray-400">
                          Max length (s)
                          <input
                            type="number"
                            value={mapsetMaxLen}
                            onChange={(e) => setMapsetMaxLen(Number(e.target.value) || 0)}
                            className="mt-1 w-full px-2 py-1 rounded bg-card border border-card text-sm font-mono"
                          />
                        </label>
                      </div>
                      <button
                        disabled={mapsetBulkBusy}
                        onClick={handleBulkAddSets}
                        className="mt-3 px-4 py-2 bg-osu-pink/90 text-white rounded-lg hover:bg-osu-pink disabled:opacity-60 transition-colors text-sm"
                      >
                        {mapsetBulkBusy
                          ? 'Importing…'
                          : `Import ${parseBeatmapIds(mapsetBulkInput).length || ''} mapsets`.trim()}
                      </button>

                      {lastMapsetBulkResult && (
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
                          <ResultPill
                            label="Diffs added"
                            count={lastMapsetBulkResult.added.length}
                            tone="green"
                          />
                          <ResultPill
                            label="Already in pool"
                            count={lastMapsetBulkResult.skipped_already_in_pool.length}
                            tone="amber"
                          />
                          <ResultPill
                            label="Outside window"
                            count={lastMapsetBulkResult.skipped_outside_window.length}
                            tone="amber"
                          />
                          <ResultPill
                            label="Mapsets unresolved"
                            count={lastMapsetBulkResult.mapsets_not_found.length}
                            tone="red"
                            ids={lastMapsetBulkResult.mapsets_not_found}
                          />
                        </div>
                      )}
                    </div>

                    {/* Existing beatmaps table */}
                    <div>
                      <h4 className="font-semibold text-sm uppercase tracking-wider text-gray-400 mb-3 flex items-center justify-between gap-3">
                        <span>Pool rotation ({poolBeatmaps.length})</span>
                        <span className="flex items-center gap-2">
                          {poolBeatmapsLoading && (
                            <span className="text-xs text-gray-500">refreshing…</span>
                          )}
                          <input
                            value={beatmapFilter}
                            onChange={(e) => setBeatmapFilter(e.target.value)}
                            placeholder="filter by id / artist / title / version"
                            className="px-3 py-1.5 rounded-lg bg-card-hover border border-card focus:border-osu-pink/60 focus:outline-none text-sm text-foreground placeholder-gray-500 w-64 max-w-full"
                          />
                        </span>
                      </h4>
                      {poolBeatmaps.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">
                          Empty rotation. Paste some beatmap ids above to seed it.
                        </p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                                <th className="py-2 pr-3 font-medium">ID</th>
                                <th className="py-2 pr-3 font-medium">Map</th>
                                <th className="py-2 pr-3 font-medium text-right">★</th>
                                <th className="py-2 pr-3 font-medium text-right">Length</th>
                                <th className="py-2 pr-3 font-medium text-right">Rating</th>
                                <th className="py-2 pr-3 font-medium text-right">Picks</th>
                                <th className="py-2 font-medium text-right" aria-label="actions" />
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                const q = beatmapFilter.trim().toLowerCase();
                                const filtered = q
                                  ? poolBeatmaps.filter((bm) => {
                                      const haystack = [
                                        String(bm.beatmap_id),
                                        bm.artist ?? '',
                                        bm.title ?? '',
                                        bm.version ?? '',
                                      ]
                                        .join(' ')
                                        .toLowerCase();
                                      return haystack.includes(q);
                                    })
                                  : poolBeatmaps;
                                if (filtered.length === 0) {
                                  return (
                                    <tr>
                                      <td
                                        colSpan={7}
                                        className="py-6 text-center text-sm text-gray-500 italic"
                                      >
                                        No maps match "{q}".
                                      </td>
                                    </tr>
                                  );
                                }
                                return filtered.map((bm) => (
                                <tr
                                  key={bm.id}
                                  className="border-t border-card/50 hover:bg-card-hover/40"
                                >
                                  <td className="py-2 pr-3 font-mono text-xs text-gray-400">
                                    {bm.beatmap_id}
                                  </td>
                                  <td className="py-2 pr-3 max-w-md">
                                    <p className="truncate text-foreground">
                                      {bm.artist} — {bm.title}
                                    </p>
                                    <p className="truncate text-xs text-gray-500">
                                      [{bm.version}] · {bm.mode}
                                    </p>
                                  </td>
                                  <td className="py-2 pr-3 text-right font-mono text-xs">
                                    {bm.difficulty_rating?.toFixed(2) ?? '—'}
                                  </td>
                                  <td className="py-2 pr-3 text-right font-mono text-xs text-gray-400">
                                    {bm.total_length
                                      ? `${Math.floor(bm.total_length / 60)}:${(bm.total_length % 60)
                                          .toString()
                                          .padStart(2, '0')}`
                                      : '—'}
                                  </td>
                                  <td className="py-2 pr-3 text-right font-mono">
                                    {Math.round(bm.rating)}
                                  </td>
                                  <td className="py-2 pr-3 text-right font-mono text-xs text-gray-400">
                                    {bm.selection_count}
                                  </td>
                                  <td className="py-2 text-right">
                                    <button
                                      onClick={() => handleRemoveBeatmap(pool.id, bm.beatmap_id)}
                                      className="px-2 py-1 text-xs text-red-400 hover:bg-red-500/15 rounded"
                                    >
                                      ✕
                                    </button>
                                  </td>
                                </tr>
                                ));
                              })()}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card backdrop-blur-md rounded-2xl border border-card shadow-2xl max-w-xl w-full p-6 space-y-4">
            <h3 className="text-xl font-bold text-foreground">Create matchmaking pool</h3>
            <FormField label="Name">
              <input
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="e.g. osu! standard 2K-3K"
                className="w-full px-3 py-2 rounded-lg bg-card-hover border border-card focus:border-osu-pink/60 focus:outline-none text-sm"
              />
            </FormField>
            <FormField label="Description (optional, shown to players)">
              <textarea
                value={createForm.description}
                onChange={(e) =>
                  setCreateForm({ ...createForm, description: e.target.value })
                }
                placeholder="e.g. Warm-up pool · 3-5★ classics"
                rows={2}
                className="w-full px-3 py-2 rounded-lg bg-card-hover border border-card focus:border-osu-pink/60 focus:outline-none text-sm leading-relaxed"
              />
            </FormField>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField label="Ruleset">
                <select
                  value={createForm.ruleset_id}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, ruleset_id: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-card-hover border border-card focus:border-osu-pink/60 focus:outline-none text-sm"
                >
                  {RULESET_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Type">
                <select
                  value={createForm.type}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, type: e.target.value as MatchmakingPoolType })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-card-hover border border-card focus:border-osu-pink/60 focus:outline-none text-sm"
                >
                  {POOL_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Lobby size">
                <input
                  type="number"
                  min={2}
                  max={64}
                  value={createForm.lobby_size}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, lobby_size: Number(e.target.value) || 8 })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-card-hover border border-card focus:border-osu-pink/60 focus:outline-none text-sm font-mono"
                />
              </FormField>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded-lg bg-card-hover hover:bg-card text-sm"
              >
                Cancel
              </button>
              <button
                disabled={createBusy}
                onClick={handleCreate}
                className="px-4 py-2 bg-osu-pink text-white rounded-lg hover:bg-osu-pink/90 disabled:opacity-60 text-sm"
              >
                {createBusy ? 'Creating…' : 'Create pool'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const FormField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="text-xs uppercase tracking-wider text-gray-400 mb-1 inline-block">
      {label}
    </span>
    {children}
  </label>
);

const ResultPill: React.FC<{
  label: string;
  count: number;
  tone: 'green' | 'amber' | 'red';
  ids?: number[];
}> = ({ label, count, tone, ids }) => {
  const cls = {
    green: 'bg-green-500/10 text-green-400 border-green-500/30',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    red: 'bg-red-500/10 text-red-400 border-red-500/30',
  }[tone];
  return (
    <div className={`px-3 py-2 rounded-lg border ${cls}`}>
      <p className="text-xs uppercase tracking-wider opacity-80">{label}</p>
      <p className="font-mono font-semibold">{count}</p>
      {ids && ids.length > 0 && (
        <p className="text-[10px] mt-1 truncate opacity-70" title={ids.join(', ')}>
          {ids.slice(0, 6).join(', ')}
          {ids.length > 6 ? '…' : ''}
        </p>
      )}
    </div>
  );
};

export default AdminMatchmaking;
