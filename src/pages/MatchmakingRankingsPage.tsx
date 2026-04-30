import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTrophy, FaFire, FaCrown, FaUsers } from 'react-icons/fa';
import {
  matchmakingAPI,
  type MatchmakingLeaderboardEntry,
  type MatchmakingPool,
  type MatchmakingPoolBeatmap,
} from '../utils/api';
import LoadingSpinner from '../components/UI/LoadingSpinner';

/**
 * Public matchmaking rankings page (`/rankings/matchmaking`).
 *
 * Renders one tab per active pool. For the selected pool it shows two
 * panels:
 *   - the top-N players ranked by rating (the leaderboard)
 *   - the active beatmap rotation, sorted by selection_count desc so
 *     the maps players see the most often surface at the top
 *
 * Theme: same liquid-glass dark-blue card stack the rest of the site
 * uses (`bg-card` translucent rgba(23,23,45,0.8) + backdrop-blur).
 */

const RULESET_LABEL: Record<number, string> = {
  0: 'osu!',
  1: 'osu!taiko',
  2: 'osu!catch',
  3: 'osu!mania',
};

const POOL_TYPE_LABEL = {
  quick_play: 'Quick Play',
  ranked_play: 'Ranked',
} as const;

const POOL_TYPE_ACCENT = {
  quick_play: 'from-blue-500/20 to-cyan-500/10 ring-blue-400/30',
  ranked_play: 'from-pink-500/20 to-fuchsia-500/10 ring-pink-400/40',
} as const;

const RANK_BADGES: Record<number, { color: string; icon: React.ReactNode }> = {
  1: { color: 'text-yellow-300', icon: <FaCrown /> },
  2: { color: 'text-gray-300', icon: <FaTrophy /> },
  3: { color: 'text-amber-600', icon: <FaTrophy /> },
};

const RATING_TIERS = [
  { min: 2000, label: 'Master', color: 'text-pink-400' },
  { min: 1700, label: 'Diamond', color: 'text-cyan-300' },
  { min: 1500, label: 'Gold', color: 'text-yellow-400' },
  { min: 1300, label: 'Silver', color: 'text-gray-300' },
  { min: 0, label: 'Bronze', color: 'text-amber-700' },
];

const ratingTier = (rating: number) =>
  RATING_TIERS.find((t) => rating >= t.min) ?? RATING_TIERS[RATING_TIERS.length - 1];

const formatLengthSeconds = (s: number | null | undefined): string => {
  if (!s || s <= 0) return '—';
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
};

const MatchmakingRankingsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [pools, setPools] = useState<MatchmakingPool[] | null>(null);
  const [poolsError, setPoolsError] = useState<string | null>(null);

  const initialPoolId = (() => {
    const raw = Number(searchParams.get('pool'));
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  })();

  const [selectedPoolId, setSelectedPoolId] = useState<number | null>(initialPoolId);

  const [leaderboard, setLeaderboard] = useState<MatchmakingLeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);

  const [poolBeatmaps, setPoolBeatmaps] = useState<MatchmakingPoolBeatmap[]>([]);
  const [poolBeatmapsLoading, setPoolBeatmapsLoading] = useState(false);

  // Load active pools on mount.
  useEffect(() => {
    let cancelled = false;
    matchmakingAPI
      .listPools({ include_inactive: false })
      .then((p) => {
        if (cancelled) return;
        setPools(p);
        // Pick a default pool: URL > first active pool.
        if (p.length > 0 && (selectedPoolId === null || !p.some((x) => x.id === selectedPoolId))) {
          setSelectedPoolId(p[0].id);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const status = (err as { response?: { status?: number } }).response?.status;
        setPoolsError(status === 404 ? 'Matchmaking is not available on this server yet.' : 'Could not load matchmaking pools.');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load leaderboard + beatmaps when the selected pool changes.
  useEffect(() => {
    if (!selectedPoolId) return;
    let cancelled = false;
    setLeaderboardLoading(true);
    setLeaderboardError(null);
    setPoolBeatmapsLoading(true);

    Promise.allSettled([
      matchmakingAPI.getPoolLeaderboard(selectedPoolId, { limit: 50 }),
      matchmakingAPI.listPoolBeatmaps(selectedPoolId, { limit: 100 }),
    ])
      .then(([leaderboardRes, beatmapsRes]) => {
        if (cancelled) return;
        if (leaderboardRes.status === 'fulfilled') {
          setLeaderboard(leaderboardRes.value);
        } else {
          setLeaderboardError('Could not load leaderboard.');
          setLeaderboard([]);
        }
        if (beatmapsRes.status === 'fulfilled') {
          // Most-played first (lobby's hot picks).
          const sorted = [...beatmapsRes.value].sort(
            (a, b) => (b.selection_count ?? 0) - (a.selection_count ?? 0),
          );
          setPoolBeatmaps(sorted);
        } else {
          setPoolBeatmaps([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLeaderboardLoading(false);
          setPoolBeatmapsLoading(false);
        }
      });

    // Keep URL in sync so the pool selection survives refresh / sharing.
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('pool', String(selectedPoolId));
      return next;
    });

    return () => {
      cancelled = true;
    };
  }, [selectedPoolId, setSearchParams]);

  const selectedPool = useMemo(
    () => pools?.find((p) => p.id === selectedPoolId) ?? null,
    [pools, selectedPoolId],
  );

  // ─────── empty / error states ───────

  if (poolsError) {
    return (
      <div className="torii-page-stage min-h-screen px-4 py-12">
        <div className="max-w-3xl mx-auto bg-card backdrop-blur-md rounded-2xl shadow-lg border border-card p-10 text-center">
          <FaTrophy className="mx-auto text-5xl text-osu-pink mb-4 opacity-60" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Matchmaking</h1>
          <p className="text-gray-400">{poolsError}</p>
        </div>
      </div>
    );
  }

  if (pools === null) {
    return (
      <div className="torii-page-stage min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (pools.length === 0) {
    return (
      <div className="torii-page-stage min-h-screen px-4 py-12">
        <div className="max-w-3xl mx-auto bg-card backdrop-blur-md rounded-2xl shadow-lg border border-card p-10 text-center">
          <FaTrophy className="mx-auto text-5xl text-osu-pink mb-4 opacity-60" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Matchmaking</h1>
          <p className="text-gray-400">
            No pools are currently active. Check back later — admins are still curating the rotation.
          </p>
        </div>
      </div>
    );
  }

  // ─────── main layout ───────

  return (
    <div className="torii-page-stage min-h-screen">
      <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-10 space-y-6">
        {/* hero */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden bg-card backdrop-blur-md rounded-3xl shadow-2xl border border-card p-6 md:p-8"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-osu-pink/15 via-transparent to-cyan-500/10 pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-1.5 h-7 bg-osu-pink rounded-full" />
                <span className="uppercase tracking-[0.2em] text-xs text-osu-pink font-bold">
                  Live rankings
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                Matchmaking
              </h1>
              <p className="text-gray-400 mt-2 max-w-xl">
                Climb the ladder pool by pool. Each victory shifts your Elo, each defeat tightens the
                window — your rating is the only thing the matchmaker cares about.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="px-3 py-1.5 rounded-lg bg-osu-pink/10 text-osu-pink font-semibold flex items-center gap-2">
                <FaUsers /> {pools.length} active pool{pools.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>
        </motion.div>

        {/* pool tabs */}
        <div className="flex flex-wrap gap-2">
          {pools.map((p) => {
            const active = p.id === selectedPoolId;
            const accent = POOL_TYPE_ACCENT[p.type];
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPoolId(p.id)}
                className={`group relative px-4 py-2.5 rounded-xl border transition-all backdrop-blur-md
                  ${
                    active
                      ? `bg-gradient-to-br ${accent} border-transparent ring-2 shadow-lg`
                      : 'bg-card/60 border-card hover:bg-card hover:border-osu-pink/40'
                  }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`text-xs uppercase tracking-wider font-bold ${
                      active ? 'text-white' : 'text-gray-400 group-hover:text-osu-pink'
                    }`}
                  >
                    {RULESET_LABEL[p.ruleset_id] ?? `mode ${p.ruleset_id}`}
                  </span>
                  <span
                    className={`text-sm ${active ? 'text-white font-semibold' : 'text-gray-300'}`}
                  >
                    {POOL_TYPE_LABEL[p.type]}
                  </span>
                </div>
                {active && (
                  <motion.div
                    layoutId="active-pool-glow"
                    className="absolute inset-0 rounded-xl shadow-[0_0_24px_rgba(236,72,153,0.35)] pointer-events-none"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* selected pool body */}
        {selectedPool && (
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedPool.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Leaderboard — left two columns on lg */}
              <section className="lg:col-span-2 bg-card backdrop-blur-md rounded-2xl border border-card shadow-xl overflow-hidden">
                <header className="px-5 py-4 border-b border-card flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <FaTrophy className="text-osu-pink" />
                    <h2 className="font-bold text-foreground">
                      {selectedPool.name}
                    </h2>
                  </div>
                  <span className="text-xs text-gray-500 uppercase tracking-wider">
                    Top players
                  </span>
                </header>

                {leaderboardLoading ? (
                  <div className="py-10 flex justify-center">
                    <LoadingSpinner size="md" />
                  </div>
                ) : leaderboardError ? (
                  <p className="px-5 py-8 text-center text-red-400 text-sm">{leaderboardError}</p>
                ) : leaderboard.length === 0 ? (
                  <div className="px-5 py-12 text-center">
                    <FaFire className="mx-auto text-3xl text-gray-600 mb-3" />
                    <p className="text-gray-400 text-sm">
                      No matches played yet in this pool. Be the first to claim the top.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-card/60">
                    {leaderboard.map((entry, idx) => {
                      const rankBadge = RANK_BADGES[entry.rank];
                      const tier = ratingTier(entry.rating);
                      return (
                        <li
                          key={entry.user_id}
                          className="px-5 py-3 flex items-center gap-4 hover:bg-card-hover/40 transition-colors"
                        >
                          {/* rank cell */}
                          <div
                            className={`w-10 flex items-center justify-center text-lg font-bold ${
                              rankBadge?.color ?? 'text-gray-400'
                            }`}
                          >
                            {rankBadge?.icon ?? <span>#{entry.rank}</span>}
                          </div>
                          {/* avatar + username */}
                          <Link
                            to={`/users/${entry.user_id}`}
                            className="flex items-center gap-3 flex-1 min-w-0 group"
                          >
                            {entry.user?.avatar_url ? (
                              <img
                                src={entry.user.avatar_url}
                                alt=""
                                className="w-10 h-10 rounded-full object-cover ring-2 ring-card-hover group-hover:ring-osu-pink/60 transition-all"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-card-hover" />
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground truncate group-hover:text-osu-pink transition-colors">
                                {entry.user?.username ?? `user ${entry.user_id}`}
                              </p>
                              <p className={`text-xs ${tier.color}`}>{tier.label}</p>
                            </div>
                          </Link>
                          {/* stats cells */}
                          <div className="hidden md:block text-right">
                            <p className="text-sm text-gray-400">Plays</p>
                            <p className="font-mono font-semibold text-gray-200">
                              {entry.plays.toLocaleString()}
                            </p>
                          </div>
                          <div className="hidden md:block text-right">
                            <p className="text-sm text-gray-400">1st</p>
                            <p className="font-mono font-semibold text-gray-200">
                              {entry.first_placements.toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right min-w-[5rem]">
                            <p className="text-xs uppercase tracking-wider text-gray-500">Rating</p>
                            <p
                              className={`font-mono font-bold text-lg ${tier.color}`}
                            >
                              {entry.rating}
                            </p>
                          </div>
                          {/* subtle stripe so rows feel sequential */}
                          <span
                            className="absolute left-0 w-1 h-8 rounded-r-full bg-osu-pink opacity-0"
                            style={{ opacity: idx === 0 ? 1 : 0 }}
                          />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              {/* Beatmap rotation — right column on lg */}
              <section className="bg-card backdrop-blur-md rounded-2xl border border-card shadow-xl overflow-hidden">
                <header className="px-5 py-4 border-b border-card flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <FaFire className="text-amber-400" />
                    <h2 className="font-bold text-foreground">Map rotation</h2>
                  </div>
                  <span className="text-xs text-gray-500">
                    {poolBeatmaps.length} map{poolBeatmaps.length === 1 ? '' : 's'}
                  </span>
                </header>

                {poolBeatmapsLoading ? (
                  <div className="py-10 flex justify-center">
                    <LoadingSpinner size="md" />
                  </div>
                ) : poolBeatmaps.length === 0 ? (
                  <p className="px-5 py-12 text-center text-sm text-gray-400">
                    No beatmaps in this pool yet.
                  </p>
                ) : (
                  <ul className="divide-y divide-card/60 max-h-[640px] overflow-y-auto">
                    {poolBeatmaps.map((bm) => (
                      <li
                        key={bm.id}
                        className="px-5 py-3 flex items-center gap-3 hover:bg-card-hover/40 transition-colors"
                      >
                        <Link
                          to={`/beatmaps/${bm.beatmap_id}`}
                          className="flex items-center gap-3 flex-1 min-w-0 group"
                        >
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-card-hover to-card flex items-center justify-center font-mono text-xs text-osu-pink/80 shrink-0">
                            {bm.difficulty_rating != null
                              ? bm.difficulty_rating.toFixed(2) + '★'
                              : '—'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground truncate group-hover:text-osu-pink transition-colors">
                              {bm.artist} — {bm.title}
                            </p>
                            <p className="text-xs text-gray-400 truncate">
                              [{bm.version}] · {formatLengthSeconds(bm.total_length)}
                            </p>
                          </div>
                        </Link>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Picks</p>
                          <p className="font-mono text-sm text-gray-200">
                            {bm.selection_count.toLocaleString()}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </motion.div>
          </AnimatePresence>
        )}
      </main>
    </div>
  );
};

export default MatchmakingRankingsPage;
