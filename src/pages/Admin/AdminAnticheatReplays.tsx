import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../utils/api';
import type {
  AnticheatBulkJob,
  AnticheatReplayDetail,
  AnticheatReplayRow,
} from '../../utils/api/admin';
import { fieldClass, formatDate, formatMods, severityBadgeClass } from './adminAnticheatShared';

const PAGE_SIZE = 50;

type SortMode = 'latest' | 'top_pp' | 'low_trust';

const VERDICT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Any' },
  { value: 'unanalyzed', label: 'Unanalyzed' },
  { value: 'ok', label: 'OK' },
  { value: 'low_concern', label: 'Low concern' },
  { value: 'suspicious', label: 'Suspicious' },
  { value: 'critical', label: 'Critical' },
  { value: 'errored', label: 'Errored' },
];

const GAMEMODE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Any' },
  { value: '0', label: 'osu!' },
  { value: '1', label: 'taiko' },
  { value: '2', label: 'catch' },
  { value: '3', label: 'mania' },
];

const AdminAnticheatReplays: React.FC = () => {
  // ─── Filters ──────────────────────────────────────────────────────────
  const [verdictFilter, setVerdictFilter] = useState<string>('');
  const [userFilter, setUserFilter] = useState<string>('');
  const [beatmapFilter, setBeatmapFilter] = useState<string>('');
  const [minPp, setMinPp] = useState<string>('');
  const [gamemode, setGamemode] = useState<string>('');
  const [sort, setSort] = useState<SortMode>('latest');
  const [page, setPage] = useState(0);

  // ─── Replay rows ──────────────────────────────────────────────────────
  const [rows, setRows] = useState<AnticheatReplayRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // ─── Expanded detail cache: score_id -> detail ─────────────────────────
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detailCache, setDetailCache] = useState<Record<number, AnticheatReplayDetail | 'loading'>>({});

  // ─── Bulk job state ────────────────────────────────────────────────────
  const [bulkJob, setBulkJob] = useState<AnticheatBulkJob | null>(null);
  const [bulkLaunching, setBulkLaunching] = useState(false);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const userIdNum = userFilter.trim() ? Number(userFilter.trim()) : undefined;
      const beatmapIdNum = beatmapFilter.trim() ? Number(beatmapFilter.trim()) : undefined;
      const minPpNum = minPp.trim() ? Number(minPp.trim()) : undefined;
      const gamemodeNum = gamemode.trim() ? Number(gamemode.trim()) : undefined;
      const data = await adminAPI.listAnticheatReplays({
        user_id: userIdNum && !Number.isNaN(userIdNum) ? userIdNum : undefined,
        beatmap_id: beatmapIdNum && !Number.isNaN(beatmapIdNum) ? beatmapIdNum : undefined,
        gamemode: gamemodeNum !== undefined && !Number.isNaN(gamemodeNum) ? gamemodeNum : undefined,
        verdict: verdictFilter || undefined,
        min_pp: minPpNum !== undefined && !Number.isNaN(minPpNum) ? minPpNum : undefined,
        passed_only: true,
        sort,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setRows(data.items);
      setTotal(data.total);
    } catch (err) {
      console.error('failed to load replays', err);
      toast.error('Failed to load replays');
    } finally {
      setLoading(false);
    }
  }, [verdictFilter, userFilter, beatmapFilter, minPp, gamemode, sort, page]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  // ─── Bulk job polling ─────────────────────────────────────────────────
  useEffect(() => {
    if (!bulkJob || bulkJob.status === 'completed' || bulkJob.status === 'failed') return;
    let cancelled = false;
    const tick = async () => {
      try {
        const updated = await adminAPI.getAnticheatBulkJob(bulkJob.id);
        if (!cancelled) {
          setBulkJob(updated);
          if (updated.status === 'completed' || updated.status === 'failed') {
            // Refresh the table so verdicts that just landed show up.
            loadRows();
          }
        }
      } catch (err) {
        console.error('bulk job poll failed', err);
      }
    };
    const handle = setInterval(tick, 2000);
    return () => {
      cancelled = true;
      clearInterval(handle);
    };
  }, [bulkJob, loadRows]);

  const toggleExpand = async (scoreId: number) => {
    if (expandedId === scoreId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(scoreId);
    if (detailCache[scoreId]) return; // already loaded or loading
    setDetailCache((prev) => ({ ...prev, [scoreId]: 'loading' }));
    try {
      const detail = await adminAPI.getAnticheatReplayDetail(scoreId);
      setDetailCache((prev) => ({ ...prev, [scoreId]: detail }));
    } catch (err) {
      console.error('detail load failed', err);
      toast.error('Failed to load score detail');
      setDetailCache((prev) => {
        const next = { ...prev };
        delete next[scoreId];
        return next;
      });
    }
  };

  const handleReanalyzeRow = async (scoreId: number) => {
    try {
      const result = await adminAPI.reanalyzeAnticheatScore(scoreId);
      toast.success(`Re-analyzed: ${result.verdict ?? 'no verdict'}`);
      // Drop the stale cached detail so the next expand pulls fresh.
      setDetailCache((prev) => {
        const next = { ...prev };
        delete next[scoreId];
        return next;
      });
      // Update the row in place.
      setRows((prev) =>
        prev.map((r) =>
          r.score_id === scoreId
            ? {
                ...r,
                analysis: {
                  verdict: result.verdict ?? 'errored',
                  confidence: result.confidence ?? 0,
                  trust_factor_applied: result.trust_factor_applied ?? 50,
                  detectors_fired: result.detectors_fired ?? [],
                  replay_was_available: result.replay_was_available ?? false,
                  analyzer_version: result.analyzer_version ?? '1',
                  error: result.error ?? null,
                  analyzed_at: result.analyzed_at ?? new Date().toISOString(),
                },
              }
            : r,
        ),
      );
    } catch (err) {
      console.error('re-analyze failed', err);
      toast.error('Re-analyze failed');
    }
  };

  const handleBulkRun = async () => {
    const userIdNum = userFilter.trim() ? Number(userFilter.trim()) : undefined;
    const beatmapIdNum = beatmapFilter.trim() ? Number(beatmapFilter.trim()) : undefined;
    const minPpNum = minPp.trim() ? Number(minPp.trim()) : undefined;
    const gamemodeNum = gamemode.trim() ? Number(gamemode.trim()) : undefined;

    const onlyUnanalyzed = verdictFilter === 'unanalyzed' || verdictFilter === '';
    const maxCount = window.prompt(
      'How many scores to re-analyze? (default 1000, max 50000)',
      '1000',
    );
    if (maxCount === null) return;
    const maxCountNum = Math.max(1, Math.min(Number(maxCount) || 1000, 50000));

    setBulkLaunching(true);
    try {
      const job = await adminAPI.reanalyzeAnticheatBulk({
        user_id: userIdNum && !Number.isNaN(userIdNum) ? userIdNum : undefined,
        beatmap_id: beatmapIdNum && !Number.isNaN(beatmapIdNum) ? beatmapIdNum : undefined,
        gamemode: gamemodeNum !== undefined && !Number.isNaN(gamemodeNum) ? gamemodeNum : undefined,
        min_pp: minPpNum !== undefined && !Number.isNaN(minPpNum) ? minPpNum : undefined,
        only_unanalyzed: onlyUnanalyzed,
        only_with_replay: true,
        max_count: maxCountNum,
      });
      setBulkJob(job);
      toast.success('Bulk re-analyze started');
    } catch (err) {
      console.error('bulk start failed', err);
      toast.error('Failed to start bulk re-analyze');
    } finally {
      setBulkLaunching(false);
    }
  };

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="rounded-lg border border-card bg-card/50 px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Total matching
          </div>
          <div className="text-2xl font-bold mt-1">{total.toLocaleString()}</div>
        </div>
        <div className="rounded-lg border border-card bg-card/50 px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            On this page
          </div>
          <div className="text-2xl font-bold mt-1">{rows.length}</div>
        </div>
        <div className="rounded-lg border border-card bg-card/50 px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            With analysis
          </div>
          <div className="text-2xl font-bold mt-1">
            {rows.filter((r) => r.analysis !== null).length}
          </div>
        </div>
        <div className="rounded-lg border border-card bg-card/50 px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Critical
          </div>
          <div className="text-2xl font-bold mt-1 text-red-600 dark:text-red-400">
            {rows.filter((r) => r.analysis?.verdict === 'critical').length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 bg-card/40 border border-card rounded-lg px-3 py-3">
        <div className="flex flex-col">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Verdict</label>
          <select
            className={`${fieldClass} px-2 py-1.5 text-sm`}
            value={verdictFilter}
            onChange={(e) => {
              setPage(0);
              setVerdictFilter(e.target.value);
            }}
          >
            {VERDICT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">User id</label>
          <input
            className={`${fieldClass} px-2 py-1.5 text-sm w-28`}
            type="number"
            placeholder="any"
            value={userFilter}
            onChange={(e) => {
              setPage(0);
              setUserFilter(e.target.value);
            }}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Beatmap id</label>
          <input
            className={`${fieldClass} px-2 py-1.5 text-sm w-28`}
            type="number"
            placeholder="any"
            value={beatmapFilter}
            onChange={(e) => {
              setPage(0);
              setBeatmapFilter(e.target.value);
            }}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Min pp</label>
          <input
            className={`${fieldClass} px-2 py-1.5 text-sm w-20`}
            type="number"
            placeholder="0"
            value={minPp}
            onChange={(e) => {
              setPage(0);
              setMinPp(e.target.value);
            }}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Gamemode</label>
          <select
            className={`${fieldClass} px-2 py-1.5 text-sm`}
            value={gamemode}
            onChange={(e) => {
              setPage(0);
              setGamemode(e.target.value);
            }}
          >
            {GAMEMODE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Sort</label>
          <select
            className={`${fieldClass} px-2 py-1.5 text-sm`}
            value={sort}
            onChange={(e) => {
              setPage(0);
              setSort(e.target.value as SortMode);
            }}
          >
            <option value="latest">Latest</option>
            <option value="top_pp">Top pp</option>
            <option value="low_trust">Lowest trust</option>
          </select>
        </div>
        <button
          type="button"
          onClick={() => {
            setPage(0);
            loadRows();
          }}
          className="ml-auto px-3 py-1.5 text-sm rounded-md bg-osu-pink text-white hover:bg-osu-pink/90 transition-colors"
        >
          Refresh
        </button>
        <button
          type="button"
          onClick={handleBulkRun}
          disabled={bulkLaunching || (bulkJob !== null && bulkJob.status === 'running')}
          className="px-3 py-1.5 text-sm rounded-md border border-osu-pink text-osu-pink hover:bg-osu-pink/10 disabled:opacity-40 transition-colors"
        >
          {bulkJob && bulkJob.status === 'running' ? 'Bulk running…' : 'Bulk re-analyze'}
        </button>
      </div>

      {/* Bulk progress */}
      {bulkJob && (
        <div className="rounded-lg border border-card bg-card/40 px-3 py-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div>
              <span className="font-medium">Bulk job</span>
              <span className="ml-2 text-xs text-gray-500 font-mono">{bulkJob.id.slice(0, 8)}</span>
              <span className={`ml-3 inline-block px-2 py-0.5 rounded text-xs font-medium ${
                bulkJob.status === 'completed'
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                  : bulkJob.status === 'failed'
                  ? 'bg-red-500/15 text-red-700 dark:text-red-400'
                  : 'bg-sky-500/15 text-sky-700 dark:text-sky-400'
              }`}>
                {bulkJob.status}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              {bulkJob.processed.toLocaleString()} / {bulkJob.total.toLocaleString()} · {bulkJob.errors} error(s)
            </div>
          </div>
          <div className="h-2 bg-card rounded overflow-hidden">
            <div
              className={`h-full transition-all ${
                bulkJob.status === 'failed' ? 'bg-red-500' : 'bg-osu-pink'
              }`}
              style={{
                width: bulkJob.total > 0
                  ? `${Math.min(100, (bulkJob.processed / bulkJob.total) * 100)}%`
                  : (bulkJob.status === 'completed' ? '100%' : '5%'),
              }}
            />
          </div>
          {bulkJob.error && (
            <div className="text-xs text-red-600 dark:text-red-400">{bulkJob.error}</div>
          )}
        </div>
      )}

      {/* Replay table */}
      <div className="rounded-lg border border-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-card/60 text-xs uppercase tracking-wide text-gray-600 dark:text-gray-400">
              <tr>
                <th className="text-left px-3 py-2 w-24">Verdict</th>
                <th className="text-left px-3 py-2 w-28">When</th>
                <th className="text-left px-3 py-2 w-32">User</th>
                <th className="text-left px-3 py-2">Beatmap</th>
                <th className="text-left px-3 py-2 w-16">PP</th>
                <th className="text-left px-3 py-2 w-16">Acc</th>
                <th className="text-left px-3 py-2 w-20">Mods</th>
                <th className="text-left px-3 py-2 w-24">Detectors</th>
                <th className="text-left px-3 py-2 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-gray-500">Loading…</td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-gray-500">
                    No scores match these filters.
                  </td>
                </tr>
              )}
              {!loading && rows.map((r) => {
                const isExpanded = expandedId === r.score_id;
                const detail = detailCache[r.score_id];
                const detailReady = detail && detail !== 'loading';
                return (
                  <React.Fragment key={r.score_id}>
                    <tr
                      className="border-t border-card hover:bg-card/40 transition-colors cursor-pointer"
                      onClick={() => toggleExpand(r.score_id)}
                    >
                      <td className="px-3 py-2">
                        {r.analysis ? (
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${severityBadgeClass(r.analysis.verdict)}`}>
                            {r.analysis.verdict}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500 italic">unanalyzed</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
                        {formatDate(r.ended_at)}
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          to={`/users/${r.user_id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-osu-pink hover:underline"
                        >
                          {r.username ?? `#${r.user_id}`}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {r.beatmap_id ? (
                          <Link
                            to={`/beatmaps/${r.beatmap_id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="hover:underline"
                          >
                            {r.beatmap_title ?? `#${r.beatmap_id}`}
                          </Link>
                        ) : '-'}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{r.pp.toFixed(1)}</td>
                      <td className="px-3 py-2 font-mono text-xs">{(r.accuracy * 100).toFixed(2)}%</td>
                      <td className="px-3 py-2 text-xs">{formatMods(r.mods)}</td>
                      <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
                        {r.analysis && r.analysis.detectors_fired.length > 0
                          ? r.analysis.detectors_fired.length
                          : '-'}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReanalyzeRow(r.score_id);
                          }}
                          className="px-2 py-0.5 text-xs rounded border border-card hover:bg-card transition-colors"
                          title="Force re-analyze"
                        >
                          re-analyze
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-t border-card bg-card/30">
                        <td colSpan={9} className="px-3 py-3">
                          {detail === 'loading' && (
                            <div className="text-sm text-gray-500">Loading detail…</div>
                          )}
                          {detailReady && (
                            <div className="space-y-4">
                              {/* Analysis full breakdown */}
                              {detail.analysis_full ? (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                  <div>
                                    <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                                      Reasons ({detail.analysis_full.reasons.length})
                                    </div>
                                    {detail.analysis_full.reasons.length === 0 ? (
                                      <div className="text-xs text-gray-500">No detectors fired.</div>
                                    ) : (
                                      <ul className="space-y-2">
                                        {detail.analysis_full.reasons.map((reason, idx) => (
                                          <li key={idx} className="text-xs bg-card/50 border border-card rounded p-2">
                                            <div className="flex items-center gap-2 mb-1">
                                              <span className={`inline-block px-1.5 py-0.5 rounded font-medium ${severityBadgeClass(reason.severity)}`}>
                                                {reason.severity}
                                              </span>
                                              <span className="font-mono">{reason.detector}</span>
                                              <span className="text-gray-500">·</span>
                                              <span className="text-gray-700 dark:text-gray-300">{reason.code}</span>
                                            </div>
                                            <pre className="whitespace-pre-wrap font-mono text-[10px] text-gray-600 dark:text-gray-400">
                                              {JSON.stringify(reason.evidence, null, 2)}
                                            </pre>
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                  <div>
                                    <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                                      Metrics
                                    </div>
                                    <pre className="text-xs whitespace-pre-wrap font-mono bg-card/50 p-2 rounded border border-card max-h-72 overflow-auto">
                                      {JSON.stringify(detail.analysis_full.metrics, null, 2)}
                                    </pre>
                                    <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                                      <div>confidence: {detail.analysis_full.confidence.toFixed(3)}</div>
                                      <div>trust applied: {detail.analysis_full.trust_factor_applied.toFixed(1)}</div>
                                      <div>replay used: {detail.analysis_full.replay_was_available ? 'yes' : 'no'}</div>
                                      <div>analyzer v: {detail.analysis_full.analyzer_version}</div>
                                      <div>analyzed: {formatDate(detail.analysis_full.analyzed_at)}</div>
                                      {detail.analysis_full.error && (
                                        <div className="text-red-600 dark:text-red-400">error: {detail.analysis_full.error}</div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs text-gray-500 italic">
                                  This score has not been analyzed yet. Click re-analyze to run slitwrist now.
                                </div>
                              )}

                              {/* Siblings (same map) */}
                              <div>
                                <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                                  Other scores by this user on this beatmap ({detail.siblings_same_map.length})
                                </div>
                                {detail.siblings_same_map.length === 0 ? (
                                  <div className="text-xs text-gray-500">None.</div>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                      <thead className="text-gray-500">
                                        <tr>
                                          <th className="text-left px-2 py-1">Score</th>
                                          <th className="text-left px-2 py-1">When</th>
                                          <th className="text-left px-2 py-1">PP</th>
                                          <th className="text-left px-2 py-1">Acc</th>
                                          <th className="text-left px-2 py-1">Combo</th>
                                          <th className="text-left px-2 py-1">Rank</th>
                                          <th className="text-left px-2 py-1">Passed</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {detail.siblings_same_map.map((sib) => (
                                          <tr key={sib.score_id} className="border-t border-card">
                                            <td className="px-2 py-1">
                                              <Link
                                                to={`/scores/${sib.score_id}`}
                                                className="text-osu-pink hover:underline"
                                              >
                                                #{sib.score_id}
                                              </Link>
                                            </td>
                                            <td className="px-2 py-1 text-gray-500">{formatDate(sib.ended_at)}</td>
                                            <td className="px-2 py-1 font-mono">{sib.pp.toFixed(1)}</td>
                                            <td className="px-2 py-1 font-mono">{(sib.accuracy * 100).toFixed(2)}%</td>
                                            <td className="px-2 py-1 font-mono">{sib.max_combo}</td>
                                            <td className="px-2 py-1">{sib.rank ?? '-'}</td>
                                            <td className="px-2 py-1">{sib.passed ? '✓' : '✗'}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>

                              {/* HWID + alerts */}
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                <div>
                                  <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                                    Hardware IDs ({detail.hwid.known_hwids.length})
                                  </div>
                                  {detail.hwid.known_hwids.length === 0 ? (
                                    <div className="text-xs text-gray-500">None recorded.</div>
                                  ) : (
                                    <div className="text-xs font-mono text-gray-700 dark:text-gray-300 space-y-0.5">
                                      {detail.hwid.known_hwids.map((h) => (
                                        <div key={h}>{h}</div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                                    Alerts on this score ({detail.alerts.length})
                                  </div>
                                  {detail.alerts.length === 0 ? (
                                    <div className="text-xs text-gray-500">None.</div>
                                  ) : (
                                    <ul className="text-xs space-y-1">
                                      {detail.alerts.map((a) => (
                                        <li key={a.id} className="bg-card/50 border border-card rounded px-2 py-1">
                                          <span className={`inline-block px-1.5 py-0.5 rounded font-medium mr-2 ${severityBadgeClass(a.severity)}`}>
                                            {a.severity}
                                          </span>
                                          <span className="text-gray-700 dark:text-gray-200">{a.title}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="flex items-center justify-between px-3 py-2 bg-card/30 text-xs text-gray-600 dark:text-gray-400">
          <div>
            {total > 0
              ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} of ${total.toLocaleString()}`
              : '0 results'}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page === 0 || loading}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="px-2 py-1 rounded border border-card disabled:opacity-40 hover:bg-card transition-colors"
            >
              Prev
            </button>
            <span>
              Page {page + 1} / {pageCount}
            </span>
            <button
              type="button"
              disabled={page + 1 >= pageCount || loading}
              onClick={() => setPage((p) => p + 1)}
              className="px-2 py-1 rounded border border-card disabled:opacity-40 hover:bg-card transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnticheatReplays;
