import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaFire, FaUsers, FaChartLine } from 'react-icons/fa';
import {
  matchmakingAPI,
  type MatchmakingPoolStats,
  type MatchmakingPoolStatsActivityPoint,
} from '../../utils/api';
import BeatmapThumb from './BeatmapThumb';

/**
 * Pool-level stats panel. Renders three side-by-side cards under the
 * leaderboard:
 *
 *   1. Top picked maps — sorted by selection_count desc, with cover
 *      thumbs so the panel reads as "the rotation people actually pick"
 *      rather than a sterile list of titles.
 *   2. Most active players (last 7 days) — wins / losses per user.
 *      The leaderboard shows ratings; this shows recent grind.
 *   3. Activity timeseries — last 30 days of match counts as a tiny
 *      bar chart. No external chart library — bars are absolutely
 *      positioned divs with proportional heights.
 *
 * Self-hides when the API 404s (matchmaking endpoint missing on a
 * stale deploy) or returns completely empty data.
 */
interface PoolStatsPanelProps {
  poolId: number;
}

const PoolStatsPanel: React.FC<PoolStatsPanelProps> = ({ poolId }) => {
  const [stats, setStats] = useState<MatchmakingPoolStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrored(false);
    matchmakingAPI
      .getPoolStats(poolId)
      .then((s) => {
        if (cancelled) return;
        setStats(s);
      })
      .catch(() => {
        if (cancelled) return;
        setErrored(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [poolId]);

  if (errored) return null;
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 animate-pulse">
        <div className="mm-glass h-64" />
        <div className="mm-glass h-64" />
        <div className="mm-glass h-64" />
      </div>
    );
  }
  if (!stats) return null;

  const hasAnyData =
    stats.top_maps.length > 0 ||
    stats.most_active_players.length > 0 ||
    stats.activity_timeseries.length > 0;
  if (!hasAnyData) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {/* ── Top picked maps ── */}
      <section className="mm-glass overflow-hidden">
        <header className="px-5 pt-4 pb-2 flex items-center gap-2">
          <FaFire className="text-amber-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Top picked
          </h3>
        </header>
        {stats.top_maps.length === 0 ? (
          <p className="px-5 py-8 text-center text-xs text-gray-500">
            No matches played yet.
          </p>
        ) : (
          <ul className="px-2 pb-3">
            {stats.top_maps.map((m, idx) => (
              <li key={m.beatmap_id} className="mm-row px-3 py-2 flex items-center gap-3 rounded-lg">
                <span className="w-5 text-xs font-mono text-gray-500 text-right">
                  {idx + 1}
                </span>
                <BeatmapThumb
                  setId={m.beatmapset_id ?? null}
                  starRating={m.difficulty_rating ?? null}
                  size={36}
                />
                <Link
                  to={`/beatmaps/${m.beatmap_id}`}
                  className="flex-1 min-w-0 group"
                >
                  <p className="text-sm text-foreground truncate group-hover:text-osu-pink transition-colors">
                    {m.title || 'Unknown'}
                  </p>
                  <p className="text-[11px] text-gray-500 truncate">
                    {m.artist || ''} · [{m.version || '—'}]
                  </p>
                </Link>
                <span className="text-xs font-mono text-amber-400 shrink-0">
                  ×{m.selection_count}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Most active players (last 7d) ── */}
      <section className="mm-glass overflow-hidden">
        <header className="px-5 pt-4 pb-2 flex items-center gap-2">
          <FaUsers className="text-osu-pink" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Most active
          </h3>
          <span className="text-[10px] text-gray-500 font-normal ml-auto">last 7 days</span>
        </header>
        {stats.most_active_players.length === 0 ? (
          <p className="px-5 py-8 text-center text-xs text-gray-500">
            Quiet week.
          </p>
        ) : (
          <ul className="px-2 pb-3">
            {stats.most_active_players.map((p, idx) => {
              const total = p.wins + p.losses;
              const winRate = total ? Math.round((p.wins / total) * 100) : null;
              return (
                <li
                  key={p.user_id}
                  className="mm-row px-3 py-2 flex items-center gap-3 rounded-lg"
                >
                  <span className="w-5 text-xs font-mono text-gray-500 text-right">
                    {idx + 1}
                  </span>
                  <Link
                    to={`/users/${p.user_id}`}
                    className="flex items-center gap-2 flex-1 min-w-0 group"
                  >
                    {p.user?.avatar_url ? (
                      <img
                        src={p.user.avatar_url}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-card-hover" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground truncate group-hover:text-osu-pink transition-colors">
                        {p.user?.username ?? `user ${p.user_id}`}
                      </p>
                      <p className="text-[11px] text-gray-500 font-mono">
                        <span className="text-green-400">{p.wins}W</span>{' '}
                        <span className="text-red-400">{p.losses}L</span>
                        {winRate != null && (
                          <span className="text-gray-400 ml-1">· {winRate}%</span>
                        )}
                      </p>
                    </div>
                  </Link>
                  <span className="text-xs font-mono text-osu-pink shrink-0">
                    ×{p.matches}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── Activity timeseries (last 30d) ── */}
      <section className="mm-glass overflow-hidden">
        <header className="px-5 pt-4 pb-2 flex items-center gap-2">
          <FaChartLine className="text-cyan-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Match activity
          </h3>
          <span className="text-[10px] text-gray-500 font-normal ml-auto">last 30 days</span>
        </header>
        <div className="px-5 py-4">
          <ActivityChart points={stats.activity_timeseries} />
        </div>
      </section>
    </div>
  );
};

/**
 * No-dependency mini bar chart. Pads the last 30 days inline so empty
 * days render as faint placeholder bars (otherwise a quiet week looks
 * like the chart is broken).
 */
const ActivityChart: React.FC<{ points: MatchmakingPoolStatsActivityPoint[] }> = ({
  points,
}) => {
  // Build a map for O(1) lookup, then walk back 30 days to fill gaps.
  const byDay = new Map(points.map((p) => [p.day, p.matches]));
  const days: { day: string; matches: number }[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    // YYYY-MM-DD without timezone shenanigans.
    const iso = d.toISOString().slice(0, 10);
    days.push({ day: iso, matches: byDay.get(iso) ?? 0 });
  }

  const max = Math.max(1, ...days.map((d) => d.matches));
  const total = days.reduce((a, b) => a + b.matches, 0);

  if (total === 0) {
    return (
      <p className="text-center text-xs text-gray-500 py-6">
        No matches in the last 30 days.
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-end gap-[3px] h-24 mb-2">
        {days.map((d) => {
          const heightPct = d.matches > 0 ? Math.max(8, (d.matches / max) * 100) : 4;
          return (
            <div
              key={d.day}
              className="flex-1 rounded-sm transition-colors"
              style={{
                height: `${heightPct}%`,
                background:
                  d.matches > 0
                    ? 'linear-gradient(to top, rgba(34,211,238,0.8), rgba(34,211,238,0.4))'
                    : 'rgba(255,255,255,0.05)',
              }}
              title={`${d.day}: ${d.matches} ${d.matches === 1 ? 'match' : 'matches'}`}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-gray-500 font-mono">
        <span>30d ago</span>
        <span>
          {total} {total === 1 ? 'match' : 'matches'} total
        </span>
        <span>today</span>
      </div>
    </div>
  );
};

export default PoolStatsPanel;
