import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaTrophy, FaChartLine, FaUsers } from 'react-icons/fa';
import {
  matchmakingAPI,
  type MatchmakingHistoryEntry,
  type MatchmakingPool,
  type MatchmakingUserPoolStats,
} from '../../utils/api';
import { apiCache } from '../../utils/apiCache';

/**
 * Profile-page section that surfaces a user's matchmaking activity:
 *
 *   - one row per pool the user has played in, showing rating /
 *     1-based rank-in-pool / plays / first placements
 *   - the eight most recent matches (newest first), with elo delta
 *
 * Renders nothing if the user has no matchmaking activity at all
 * (no stats rows, no history). That keeps the profile clean for the
 * majority of users who never queue.
 */

interface MatchmakingStatsCardProps {
  userId: number;
}

const RESULT_COLORS: Record<MatchmakingHistoryEntry['result'], string> = {
  win: 'text-green-500',
  loss: 'text-red-500',
  draw: 'text-gray-400',
};

const POOL_TYPE_LABEL: Record<MatchmakingPool['type'], string> = {
  quick_play: 'Quick Play',
  ranked_play: 'Ranked',
};

const formatRelative = (iso: string): string => {
  const now = Date.now();
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const sec = Math.max(0, Math.floor((now - then) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
};

const MatchmakingStatsCard: React.FC<MatchmakingStatsCardProps> = ({ userId }) => {
  const [stats, setStats] = useState<MatchmakingUserPoolStats[] | null>(null);
  const [history, setHistory] = useState<MatchmakingHistoryEntry[] | null>(null);
  // Pool name lookup so the per-pool stats row can show "osu! standard
  // (quick play)" instead of bare pool ids. We hit /matchmaking/pools
  // once with include_inactive=true so users who once played in a now-
  // disabled pool still see the pool name on their history.
  const [poolsById, setPoolsById] = useState<Map<number, MatchmakingPool>>(new Map());
  // Opponent username lookup populated from history.opponent_id batch.
  // Falls back to "user N" when the user has been deleted / can't be
  // hydrated. The cached lookups are shared with the rest of the app
  // via apiCache so navigating from leaderboard → profile won't redo
  // the same fetches.
  const [opponentNames, setOpponentNames] = useState<Map<number, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      matchmakingAPI.getUserStats(userId),
      matchmakingAPI.getUserHistory(userId, { limit: 8 }),
      matchmakingAPI.listPools({ include_inactive: true }),
    ])
      .then(([statsRes, historyRes, poolsRes]) => {
        if (cancelled) return;
        setStats(statsRes);
        setHistory(historyRes);
        const map = new Map<number, MatchmakingPool>();
        for (const p of poolsRes) map.set(p.id, p);
        setPoolsById(map);

        // Kick off the opponent-username hydration — never blocks the
        // primary render. apiCache.getUsers de-dupes inflight requests
        // and caches for 5 min so this is cheap on repeat visits.
        const opponentIds = Array.from(new Set(historyRes.map((h) => h.opponent_id)));
        if (opponentIds.length > 0) {
          apiCache
            .getUsers(opponentIds)
            .then((usersMap) => {
              if (cancelled) return;
              const lookup = new Map<number, string>();
              usersMap.forEach((u, id) => {
                if (u?.username) lookup.set(id, u.username);
              });
              setOpponentNames(lookup);
            })
            .catch(() => {
              // Best effort — fall back to "user N" placeholder.
            });
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // Endpoint missing on older g0v0 deploys (deploy lag) is not a
        // user-facing error — collapse into "no matchmaking data" state.
        const status = (err as { response?: { status?: number } }).response?.status;
        if (status === 404) {
          setStats([]);
          setHistory([]);
        } else {
          setError('Could not load matchmaking stats.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Hide the section entirely when there's nothing to show. Keeps the
  // profile clean for the 99% of users who haven't queued yet.
  if (!loading && !error && (!stats || stats.length === 0) && (!history || history.length === 0)) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-card rounded-2xl shadow-lg p-5 space-y-5"
    >
      <div className="flex items-center gap-2">
        <FaTrophy className="text-osu-pink" />
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Matchmaking</h2>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-6 text-gray-400">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-osu-pink" />
        </div>
      )}

      {error && !loading && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {!loading && !error && stats && stats.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            <FaUsers className="opacity-70" />
            Per-pool stats
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <th className="py-1 pr-4 font-medium">Pool</th>
                  <th className="py-1 pr-4 font-medium text-right">Rating</th>
                  <th className="py-1 pr-4 font-medium text-right">Rank</th>
                  <th className="py-1 pr-4 font-medium text-right">Plays</th>
                  <th className="py-1 font-medium text-right">1st Places</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => {
                  const pool = poolsById.get(s.pool_id);
                  return (
                    <tr
                      key={`${s.user_id}-${s.pool_id}`}
                      className="border-t border-gray-100 dark:border-gray-700 hover:bg-osu-pink/5 transition-colors group"
                    >
                      <td className="py-2 pr-4 text-gray-900 dark:text-white">
                        {/*
                          Each per-pool stats row deep-links to that pool's
                          public leaderboard. Anchors the discoverability —
                          a user landing here from their profile clicks
                          straight into the ranking they care about.
                        */}
                        <Link
                          to={`/rankings/matchmaking?pool=${s.pool_id}`}
                          className="inline-flex items-center gap-1 group-hover:text-osu-pink transition-colors"
                        >
                          {pool ? (
                            <>
                              <span>{pool.name}</span>
                              <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                                · {POOL_TYPE_LABEL[pool.type]}
                              </span>
                            </>
                          ) : (
                            <span className="text-gray-500">Pool #{s.pool_id}</span>
                          )}
                          <span className="text-osu-pink opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                            →
                          </span>
                        </Link>
                      </td>
                      <td className="py-2 pr-4 text-right font-mono font-semibold">
                        {s.rating}
                      </td>
                      <td className="py-2 pr-4 text-right text-gray-700 dark:text-gray-300">
                        {s.rank ? `#${s.rank}` : '—'}
                      </td>
                      <td className="py-2 pr-4 text-right text-gray-700 dark:text-gray-300">
                        {s.plays.toLocaleString()}
                      </td>
                      <td className="py-2 text-right text-gray-700 dark:text-gray-300">
                        {s.first_placements.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && history && history.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            <FaChartLine className="opacity-70" />
            Recent matches
          </div>
          <ul className="space-y-1.5">
            {history.map((h) => {
              const pool = poolsById.get(h.pool_id);
              const deltaSign = h.elo_delta >= 0 ? '+' : '';
              const opponentName = opponentNames.get(h.opponent_id);
              return (
                <li
                  key={h.id}
                  className="flex items-center justify-between text-sm py-1.5 border-t border-gray-100 dark:border-gray-700"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      className={`uppercase text-xs font-bold tracking-wider shrink-0 ${RESULT_COLORS[h.result]}`}
                    >
                      {h.result}
                    </span>
                    <span className="text-gray-700 dark:text-gray-300 truncate">
                      {pool ? pool.name : `Pool #${h.pool_id}`}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      vs{' '}
                      <Link
                        to={`/users/${h.opponent_id}`}
                        className="hover:text-osu-pink transition-colors"
                      >
                        {opponentName ?? `user ${h.opponent_id}`}
                      </Link>
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span
                      className={`font-mono text-sm ${
                        h.elo_delta >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}
                    >
                      {deltaSign}
                      {h.elo_delta}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatRelative(h.created_at)}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </motion.div>
  );
};

export default MatchmakingStatsCard;
