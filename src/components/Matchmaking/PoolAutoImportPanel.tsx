import React, { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  matchmakingAPI,
  type AutoImportFilters,
  type AutoImportPreviewResponse,
  type BeatmapRankStatus,
} from '../../utils/api';

/**
 * Pool auto-import panel.
 *
 * The operator describes the pool's *taste* (Featured Artist? rank
 * status? SR window? length window?) and the backend scans the local
 * beatmap cache for everything that matches. Same filter set powers
 * the preview (count + sample titles) and the commit (actual insert).
 *
 * This replaces the old "paste mapset IDs" workflow as the *primary*
 * curation path — that one survives in the parent page as an
 * "advanced" collapsed section for when the operator already knows
 * the mapsets they want by name.
 *
 * Per-ruleset awareness: the SR slider's hint and the seed-rating
 * preview are tuned per ruleset. The backend does the actual SR→rating
 * derivation against `_SR_RATING_CURVES`; this component just shows a
 * little caption with a couple of anchor points so the admin can
 * eyeball the curve.
 */

const ALL_STATUSES: { value: BeatmapRankStatus; label: string; safe: boolean; help: string }[] = [
  { value: 'RANKED', label: 'Ranked', safe: true, help: 'Mapper-frozen, official scoreboard.' },
  { value: 'APPROVED', label: 'Approved', safe: true, help: 'Mapper-frozen, official ranking (older marathons).' },
  { value: 'LOVED', label: 'Loved', safe: true, help: 'Community-vote-frozen. Top tournament / community picks.' },
  {
    value: 'QUALIFIED',
    label: 'Qualified',
    safe: false,
    help: 'Pending review — mapper can still re-upload. Pool may break.',
  },
  {
    value: 'PENDING',
    label: 'Pending',
    safe: false,
    help: 'Active WIP. Difficulty / length can change at any time.',
  },
  {
    value: 'GRAVEYARD',
    label: 'Graveyard',
    safe: false,
    help: 'Abandoned but the mapper can still revive it.',
  },
  { value: 'WIP', label: 'WIP', safe: false, help: 'Work-in-progress. Avoid for pools.' },
];

/** Default starting filter set — mirrors the backend defaults. */
const defaultFilters = (): AutoImportFilters => ({
  featured_artist: false,
  statuses: ['RANKED', 'APPROVED', 'LOVED'],
  min_sr: 2.5,
  max_sr: 6.5,
  min_length_seconds: 60,
  max_length_seconds: 300,
  max_count: 500,
  use_sr_aware_rating: true,
  fixed_initial_rating: 1500,
  initial_rating_sig: 150,
});

/**
 * Per-ruleset SR anchor points to surface as a small UX hint under
 * the SR slider — purely cosmetic, the real curve lives server-side.
 * Mode counsellors should keep this in sync with the backend table.
 */
const SR_HINTS: Record<number, { tier: string; sr: number }[]> = {
  0: [
    { tier: 'Silver', sr: 4.0 },
    { tier: 'Gold', sr: 5.5 },
    { tier: 'Diamond', sr: 7.0 },
  ],
  1: [
    { tier: 'Silver', sr: 4.0 },
    { tier: 'Gold', sr: 5.0 },
    { tier: 'Diamond', sr: 6.5 },
  ],
  2: [
    { tier: 'Silver', sr: 3.5 },
    { tier: 'Gold', sr: 4.5 },
    { tier: 'Diamond', sr: 5.5 },
  ],
  3: [
    { tier: 'Silver', sr: 5.0 },
    { tier: 'Gold', sr: 6.5 },
    { tier: 'Diamond', sr: 8.0 },
  ],
};

const RULESET_LABEL: Record<number, string> = {
  0: 'osu! standard',
  1: 'osu!taiko',
  2: 'osu!catch',
  3: 'osu!mania',
  4: 'osu!rx',
  5: 'osu!ap',
  6: 'taiko!rx',
  7: 'fruits!rx',
};

const formatSeconds = (s: number): string => {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
};

/** Parses MM:SS or raw seconds. Returns clamped seconds, or null on garbage. */
const parseTime = (raw: string): number | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.includes(':')) {
    const [mm, ss] = trimmed.split(':');
    const m = Number(mm);
    const s = Number(ss);
    if (!Number.isFinite(m) || !Number.isFinite(s)) return null;
    return Math.max(1, m * 60 + s);
  }
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  return Math.max(1, Math.round(n));
};

interface Props {
  poolId: number;
  rulesetId: number;
  /** Called after a successful import, so the parent can refresh its beatmap table. */
  onImported?: () => void;
}

const PoolAutoImportPanel: React.FC<Props> = ({ poolId, rulesetId, onImported }) => {
  const [filters, setFilters] = useState<AutoImportFilters>(defaultFilters);
  const [preview, setPreview] = useState<AutoImportPreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [committing, setCommitting] = useState(false);

  // Length inputs are MM:SS-friendly strings backed by the numeric
  // filter state so the operator can type either format.
  const [minLenInput, setMinLenInput] = useState(formatSeconds(filters.min_length_seconds));
  const [maxLenInput, setMaxLenInput] = useState(formatSeconds(filters.max_length_seconds));

  // Reset filters when the pool changes (parent expanded a different pool).
  useEffect(() => {
    const fresh = defaultFilters();
    setFilters(fresh);
    setMinLenInput(formatSeconds(fresh.min_length_seconds));
    setMaxLenInput(formatSeconds(fresh.max_length_seconds));
    setPreview(null);
    setPreviewError(null);
  }, [poolId]);

  // Debounced auto-preview. We re-run on every filter change but
  // throttle to one in-flight request per 350ms so the operator can
  // drag a slider without flooding the backend.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      let cancelled = false;
      setPreviewLoading(true);
      setPreviewError(null);
      matchmakingAPI
        .autoImportPreview(poolId, filters)
        .then((res) => {
          if (cancelled) return;
          setPreview(res);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          const msg = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
          setPreviewError(msg ?? 'Preview failed.');
          setPreview(null);
        })
        .finally(() => {
          if (!cancelled) setPreviewLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    poolId,
    filters.featured_artist,
    filters.statuses.join(','),
    filters.min_sr,
    filters.max_sr,
    filters.min_length_seconds,
    filters.max_length_seconds,
    filters.max_count,
    filters.use_sr_aware_rating,
    filters.fixed_initial_rating,
  ]);

  const toggleStatus = (status: BeatmapRankStatus) => {
    setFilters((prev) => {
      const has = prev.statuses.includes(status);
      const next = has ? prev.statuses.filter((s) => s !== status) : [...prev.statuses, status];
      return { ...prev, statuses: next };
    });
  };

  const handleCommit = async () => {
    if (preview && preview.matched === 0) {
      toast.error('Nothing to import — widen the filters.');
      return;
    }
    if (preview && preview.matched_uncapped > filters.max_count) {
      const ok = confirm(
        `Filters match ${preview.matched_uncapped} maps but max_count is ${filters.max_count}. ` +
          `Only ${filters.max_count} will be imported (the easiest by SR). Continue?`,
      );
      if (!ok) return;
    }
    setCommitting(true);
    try {
      const res = await matchmakingAPI.autoImport(poolId, filters);
      toast.success(
        `Imported ${res.added.length} maps` +
          (res.skipped_already_in_pool.length > 0
            ? ` (${res.skipped_already_in_pool.length} already in pool)`
            : '') +
          (res.capped ? ` — cap reached, ${res.matched_uncapped - res.added.length - res.skipped_already_in_pool.length} skipped.` : ''),
      );
      onImported?.();
      // Re-run preview so the count updates (it'll now show overlap = whatever just got inserted).
      const fresh = await matchmakingAPI.autoImportPreview(poolId, filters);
      setPreview(fresh);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      toast.error(msg ?? 'Import failed.');
    } finally {
      setCommitting(false);
    }
  };

  const hints = SR_HINTS[rulesetId] ?? SR_HINTS[0];
  const rulesetLabel = RULESET_LABEL[rulesetId] ?? `mode ${rulesetId}`;

  // Whether any unsafe status is currently selected. Surfaces the
  // "you might break the pool" warning.
  const hasUnsafeStatus = filters.statuses.some((s) => !ALL_STATUSES.find((x) => x.value === s)?.safe);

  // Disable the import button when the preview is empty or busy.
  const canImport = !committing && !previewLoading && preview != null && preview.matched > 0;

  return (
    <div className="mm-glass-inset p-4 space-y-4">
      <div>
        <h4 className="font-semibold text-sm uppercase tracking-wider text-gray-400 mb-1">
          Auto-import beatmaps
        </h4>
        <p className="text-xs text-gray-500">
          Describe what kind of maps belong in this pool — the server scans the local beatmap cache
          and adds everything that matches. No mapset-id pasting required. Pool ruleset:{' '}
          <span className="text-gray-300 font-semibold">{rulesetLabel}</span>.
        </p>
      </div>

      {/* ── Featured Artists toggle ── */}
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={filters.featured_artist}
          onChange={(e) => setFilters((prev) => ({ ...prev, featured_artist: e.target.checked }))}
          className="w-4 h-4 accent-osu-pink"
        />
        <div>
          <div className="text-sm text-gray-200 font-semibold">Featured Artists only</div>
          <div className="text-xs text-gray-500">
            Limit to maps whose track is in osu!'s curated FA catalogue. Tighter pool, smaller
            count.
          </div>
        </div>
      </label>

      {/* ── Status checkboxes ── */}
      <div>
        <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Beatmap status</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {ALL_STATUSES.map((s) => {
            const checked = filters.statuses.includes(s.value);
            return (
              <label
                key={s.value}
                className={`flex items-start gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                  checked
                    ? s.safe
                      ? 'bg-osu-pink/10 border-osu-pink/40'
                      : 'bg-amber-500/10 border-amber-500/40'
                    : 'bg-card/40 border-card hover:border-osu-pink/30'
                }`}
                title={s.help}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleStatus(s.value)}
                  className="mt-0.5 w-4 h-4 accent-osu-pink shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-sm text-gray-200 font-semibold truncate">{s.label}</div>
                  <div className="text-[10px] text-gray-500 leading-snug">{s.help}</div>
                </div>
              </label>
            );
          })}
        </div>
        {hasUnsafeStatus && (
          <p className="mt-2 text-xs text-amber-400">
            ⚠ You've included a status the mapper can still edit. The map may change SR or be
            replaced after import, breaking the pool's curation.
          </p>
        )}
      </div>

      {/* ── SR window ── */}
      <div>
        <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Star rating window</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-gray-400">
            Min SR
            <input
              type="number"
              step="0.1"
              min={0}
              max={15}
              value={filters.min_sr}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, min_sr: Number(e.target.value) || 0 }))
              }
              className="mm-input mt-1 w-full px-2 py-1 text-sm font-mono"
            />
          </label>
          <label className="text-xs text-gray-400">
            Max SR
            <input
              type="number"
              step="0.1"
              min={0}
              max={15}
              value={filters.max_sr}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, max_sr: Number(e.target.value) || 0 }))
              }
              className="mm-input mt-1 w-full px-2 py-1 text-sm font-mono"
            />
          </label>
        </div>
        <p className="text-[10px] text-gray-500 mt-2 leading-snug">
          {rulesetLabel} anchor points (server-side curve):{' '}
          {hints.map((h, i) => (
            <span key={h.tier}>
              {i > 0 && ' · '}
              <span className="text-gray-400">
                {h.tier} ≈ {h.sr.toFixed(1)}★
              </span>
            </span>
          ))}
        </p>
      </div>

      {/* ── Length window ── */}
      <div>
        <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Length window</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-gray-400">
            Min length (M:SS or seconds)
            <input
              type="text"
              value={minLenInput}
              onChange={(e) => setMinLenInput(e.target.value)}
              onBlur={() => {
                const s = parseTime(minLenInput);
                if (s != null) {
                  setFilters((prev) => ({ ...prev, min_length_seconds: s }));
                  setMinLenInput(formatSeconds(s));
                } else {
                  setMinLenInput(formatSeconds(filters.min_length_seconds));
                }
              }}
              placeholder="1:00"
              className="mm-input mt-1 w-full px-2 py-1 text-sm font-mono"
            />
          </label>
          <label className="text-xs text-gray-400">
            Max length (M:SS or seconds)
            <input
              type="text"
              value={maxLenInput}
              onChange={(e) => setMaxLenInput(e.target.value)}
              onBlur={() => {
                const s = parseTime(maxLenInput);
                if (s != null) {
                  setFilters((prev) => ({ ...prev, max_length_seconds: s }));
                  setMaxLenInput(formatSeconds(s));
                } else {
                  setMaxLenInput(formatSeconds(filters.max_length_seconds));
                }
              }}
              placeholder="5:00"
              className="mm-input mt-1 w-full px-2 py-1 text-sm font-mono"
            />
          </label>
        </div>
      </div>

      {/* ── SR-aware rating + cap ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Initial rating</p>
          <label className="flex items-center gap-2 cursor-pointer select-none mb-2">
            <input
              type="checkbox"
              checked={filters.use_sr_aware_rating}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, use_sr_aware_rating: e.target.checked }))
              }
              className="w-4 h-4 accent-osu-pink"
            />
            <span className="text-sm text-gray-200">SR-aware (per-map curve)</span>
          </label>
          {!filters.use_sr_aware_rating && (
            <label className="text-xs text-gray-400 block">
              Fixed rating
              <input
                type="number"
                value={filters.fixed_initial_rating}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    fixed_initial_rating: Number(e.target.value) || 1500,
                  }))
                }
                className="mm-input mt-1 w-full px-2 py-1 text-sm font-mono"
              />
            </label>
          )}
          <p className="text-[10px] text-gray-500 mt-2 leading-snug">
            SR-aware seeds each map with a rating derived from its star rating, using the {rulesetLabel}{' '}
            anchor curve. Without it, every map seeds at the fixed rating and the elo-aware map
            picker has nothing to work with on day 1.
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Safety cap</p>
          <label className="text-xs text-gray-400 block">
            Max maps to import
            <input
              type="number"
              min={1}
              max={2000}
              value={filters.max_count}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, max_count: Number(e.target.value) || 500 }))
              }
              className="mm-input mt-1 w-full px-2 py-1 text-sm font-mono"
            />
          </label>
          <p className="text-[10px] text-gray-500 mt-2 leading-snug">
            Hard cap. If filters match more than this, only the easiest-by-SR are imported. Raise
            it deliberately if you want a giant pool.
          </p>
        </div>
      </div>

      {/* ── Preview ── */}
      <div className="border-t border-card pt-4">
        <PreviewArea
          loading={previewLoading}
          error={previewError}
          preview={preview}
          useSrAware={filters.use_sr_aware_rating}
          fixedRating={filters.fixed_initial_rating}
          maxCount={filters.max_count}
        />
      </div>

      {/* ── Action ── */}
      <div className="flex justify-end">
        <button
          disabled={!canImport}
          onClick={handleCommit}
          className="px-5 py-2.5 bg-osu-pink text-white rounded-lg hover:bg-osu-pink/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-semibold"
        >
          {committing
            ? 'Importing…'
            : preview && preview.matched > 0
              ? `Import ${preview.matched} map${preview.matched === 1 ? '' : 's'}`
              : 'Import'}
        </button>
      </div>
    </div>
  );
};

interface PreviewAreaProps {
  loading: boolean;
  error: string | null;
  preview: AutoImportPreviewResponse | null;
  useSrAware: boolean;
  fixedRating: number;
  maxCount: number;
}

const PreviewArea: React.FC<PreviewAreaProps> = ({
  loading,
  error,
  preview,
  useSrAware,
  fixedRating,
  maxCount,
}) => {
  const counts = useMemo(() => {
    if (!preview) return null;
    const overflow = Math.max(0, preview.matched_uncapped - maxCount);
    return {
      matched: preview.matched,
      uncapped: preview.matched_uncapped,
      overflow,
      dupes: preview.skipped_already_in_pool,
    };
  }, [preview, maxCount]);

  if (error) {
    return (
      <p className="text-sm text-red-400 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
        {error}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-400">Preview</p>
          {loading ? (
            <p className="text-sm text-gray-500 italic">Counting…</p>
          ) : counts ? (
            <div className="flex flex-wrap items-baseline gap-3 mt-1">
              <span className="text-2xl font-bold text-foreground font-mono">
                {counts.matched}
              </span>
              <span className="text-sm text-gray-400">
                will be inserted
                {counts.uncapped !== counts.matched + counts.dupes && (
                  <>
                    {' '}
                    of <span className="font-mono text-gray-300">{counts.uncapped}</span> matching
                  </>
                )}
              </span>
              {counts.dupes > 0 && (
                <span className="text-xs text-amber-400">
                  · {counts.dupes} already in pool
                </span>
              )}
              {counts.overflow > 0 && (
                <span className="text-xs text-red-400">
                  · cap reached, {counts.overflow} won't fit
                </span>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">Adjust filters to preview.</p>
          )}
        </div>
      </div>

      {preview && preview.sample.length > 0 && (
        <div className="space-y-1 max-h-72 overflow-y-auto">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">
            Sample (easiest first)
            {useSrAware
              ? ' — seed rating shown is the SR-aware curve value'
              : ` — every map will seed at ${fixedRating}`}
          </p>
          {preview.sample.map((s) => (
            <div
              key={s.beatmap_id}
              className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-md bg-card/40 hover:bg-card transition-colors"
            >
              <span className="font-mono text-gray-500 w-12 text-right shrink-0">
                {s.difficulty_rating?.toFixed(2) ?? '—'}★
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-gray-200 truncate block">
                  {s.artist} — {s.title}
                </span>
                <span className="text-gray-500 text-[10px] block truncate">
                  [{s.version ?? '—'}] · {s.total_length ? formatSeconds(s.total_length) : '—'}
                </span>
              </div>
              <span className="font-mono text-osu-pink shrink-0" title="Seed rating">
                {s.seed_rating}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PoolAutoImportPanel;
