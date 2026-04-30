import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCrown, FaTrophy, FaFire, FaUsers, FaChartLine } from 'react-icons/fa';
import {
  matchmakingAPI,
  type MatchmakingLeaderboardEntry,
  type MatchmakingPool,
  type MatchmakingPoolBeatmap,
  type MatchmakingUserPoolStats,
} from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import {
  BeatmapRowSkeleton,
  LeaderboardRowSkeleton,
  PoolTabsSkeleton,
} from '../components/Matchmaking/MatchmakingSkeletons';

/**
 * Public matchmaking rankings page (`/rankings/matchmaking`).
 *
 * Page composition (top → bottom):
 *
 *   1. Hero — features the current #1 player (avatar + tier + rating)
 *      with a soft purple/pink wash so the page reads "esports", not
 *      "spreadsheet." Falls back to a plain title when no leaderboard
 *      data exists yet.
 *   2. Stat cards — 3-up grid showing the pool's headline counters
 *      (players ever, today, this week). Heavy enough to be a real
 *      focal point.
 *   3. Ruleset chips — one per active mode (osu! / taiko / catch /
 *      mania). The previous "Quick Play vs Ranked Play" type
 *      distinction is removed: in line with upstream osu! direction
 *      every pool is ranked, so we only need to pick a ruleset.
 *   4. Pool body —
 *        - Top-3 podium (when ≥3 players have stats): elevated cards
 *          with bigger avatars and bold rating digits.
 *        - Top 4-50: compact list, current user highlighted with a
 *          pink stripe + "you" pill.
 *      Right column on lg+: map rotation panel (most-played first).
 *
 * Theme: liquid-glass dark blue (var(--card-bg) at rgba(23,23,45,0.8)
 * + backdrop-blur). Accent is osu-pink. Tier colors borrow from
 * standard ranked-ladder visual language (gold → diamond → master).
 */

const RULESET_LABEL: Record<number, string> = {
  0: 'osu!',
  1: 'osu!taiko',
  2: 'osu!catch',
  3: 'osu!mania',
};

const RANK_BADGES: Record<number, { color: string; icon: React.ReactNode; ring: string }> = {
  1: { color: 'text-yellow-300', icon: <FaCrown />, ring: 'ring-yellow-400/70' },
  2: { color: 'text-gray-200', icon: <FaTrophy />, ring: 'ring-gray-300/60' },
  3: { color: 'text-amber-500', icon: <FaTrophy />, ring: 'ring-amber-500/60' },
};

const RATING_TIERS = [
  { min: 2000, label: 'Master', color: 'text-pink-300', bg: 'from-pink-500/30 to-fuchsia-600/20' },
  { min: 1700, label: 'Diamond', color: 'text-cyan-300', bg: 'from-cyan-400/25 to-sky-500/15' },
  { min: 1500, label: 'Gold', color: 'text-yellow-300', bg: 'from-yellow-400/25 to-amber-500/15' },
  { min: 1300, label: 'Silver', color: 'text-gray-200', bg: 'from-gray-300/25 to-gray-400/15' },
  { min: 0, label: 'Bronze', color: 'text-amber-700', bg: 'from-amber-700/25 to-orange-700/15' },
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
  const { user: currentUser } = useAuth();
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

  const [myPoolStats, setMyPoolStats] = useState<MatchmakingUserPoolStats | null>(null);

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
        if (p.length > 0 && (selectedPoolId === null || !p.some((x) => x.id === selectedPoolId))) {
          setSelectedPoolId(p[0].id);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const status = (err as { response?: { status?: number } }).response?.status;
        setPoolsError(
          status === 404
            ? 'Matchmaking is not available on this server yet.'
            : 'Could not load matchmaking pools.',
        );
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load leaderboard + beatmaps + my-stats when the selected pool changes.
  useEffect(() => {
    if (!selectedPoolId) return;
    let cancelled = false;
    setLeaderboardLoading(true);
    setLeaderboardError(null);
    setPoolBeatmapsLoading(true);
    setMyPoolStats(null);

    const myStatsPromise =
      currentUser?.id != null
        ? matchmakingAPI
            .getUserStats(currentUser.id, selectedPoolId)
            .then((rows) => rows.find((r) => r.pool_id === selectedPoolId) ?? null)
            .catch(() => null)
        : Promise.resolve(null);

    Promise.allSettled([
      matchmakingAPI.getPoolLeaderboard(selectedPoolId, { limit: 50 }),
      matchmakingAPI.listPoolBeatmaps(selectedPoolId, { limit: 100 }),
      myStatsPromise,
    ])
      .then(([leaderboardRes, beatmapsRes, myStatsRes]) => {
        if (cancelled) return;
        if (leaderboardRes.status === 'fulfilled') {
          setLeaderboard(leaderboardRes.value);
        } else {
          setLeaderboardError('Could not load leaderboard.');
          setLeaderboard([]);
        }
        if (beatmapsRes.status === 'fulfilled') {
          // Most-played first surfaces "what people actually pick" at
          // the top of the rotation panel.
          const sorted = [...beatmapsRes.value].sort(
            (a, b) => (b.selection_count ?? 0) - (a.selection_count ?? 0),
          );
          setPoolBeatmaps(sorted);
        } else {
          setPoolBeatmaps([]);
        }
        if (myStatsRes.status === 'fulfilled') {
          setMyPoolStats(myStatsRes.value);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLeaderboardLoading(false);
          setPoolBeatmapsLoading(false);
        }
      });

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('pool', String(selectedPoolId));
      return next;
    });

    return () => {
      cancelled = true;
    };
  }, [selectedPoolId, setSearchParams, currentUser?.id]);

  const selectedPool = useMemo(
    () => pools?.find((p) => p.id === selectedPoolId) ?? null,
    [pools, selectedPoolId],
  );

  const top1 = leaderboard[0] ?? null;
  const top2 = leaderboard[1] ?? null;
  const top3 = leaderboard[2] ?? null;
  const restOfBoard = leaderboard.slice(3);

  // ─────────────────── empty / error / loading states ───────────────────

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
      <div className="torii-page-stage min-h-screen">
        <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-10 space-y-6">
          <div className="bg-card backdrop-blur-md rounded-3xl shadow-2xl border border-card p-6 md:p-8 animate-pulse h-48" />
          <PoolTabsSkeleton />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <section className="lg:col-span-2 bg-card backdrop-blur-md rounded-2xl border border-card shadow-xl overflow-hidden">
              <ul>
                {Array.from({ length: 6 }).map((_, i) => (
                  <LeaderboardRowSkeleton key={i} />
                ))}
              </ul>
            </section>
            <section className="bg-card backdrop-blur-md rounded-2xl border border-card shadow-xl overflow-hidden">
              <ul>
                {Array.from({ length: 5 }).map((_, i) => (
                  <BeatmapRowSkeleton key={i} />
                ))}
              </ul>
            </section>
          </div>
        </main>
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
            No pools are currently active. Check back later — admins are still curating the
            rotation.
          </p>
        </div>
      </div>
    );
  }

  // ──────────────────────────── main layout ─────────────────────────────

  return (
    <div className="torii-page-stage min-h-screen">
      <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-10 space-y-6">
        {/* ─── HERO: champion showcase ─── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden bg-card backdrop-blur-md rounded-3xl shadow-2xl border border-card"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-osu-pink/20 via-fuchsia-500/5 to-cyan-500/15 pointer-events-none" />
          {/* Decorative grid */}
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />

          <div className="relative z-10 p-6 md:p-8 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-center">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="inline-block w-1.5 h-5 bg-osu-pink rounded-full" />
                <span className="uppercase tracking-[0.25em] text-[11px] text-osu-pink font-bold">
                  Live ranked ladder
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight">
                Matchmaking
              </h1>
              <p className="text-gray-400 text-sm md:text-base max-w-xl leading-relaxed">
                Climb the elo ladder pool by pool. Each victory shifts your rating, each defeat
                tightens your search radius — your position is the only thing the matchmaker cares
                about.
              </p>
            </div>

            {/* Champion mini-card. Only shows when a #1 exists. */}
            {top1 && (
              <Link
                to={`/users/${top1.user_id}`}
                className="group relative flex items-center gap-4 px-5 py-4 rounded-2xl bg-gradient-to-br from-osu-pink/15 via-osu-pink/5 to-transparent border border-osu-pink/30 hover:border-osu-pink/70 hover:shadow-[0_0_28px_rgba(236,72,153,0.4)] transition-all min-w-[18rem]"
              >
                <FaCrown className="absolute -top-2.5 -right-2.5 text-yellow-300 text-2xl drop-shadow-[0_0_8px_rgba(252,211,77,0.7)]" />
                {top1.user?.avatar_url ? (
                  <img
                    src={top1.user.avatar_url}
                    alt=""
                    className="w-16 h-16 rounded-2xl object-cover ring-2 ring-yellow-300/70 shadow-[0_0_18px_rgba(252,211,77,0.45)]"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-card-hover" />
                )}
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">
                    Top of the ladder
                  </p>
                  <p className="font-bold text-foreground truncate group-hover:text-osu-pink transition-colors">
                    {top1.user?.username ?? `user ${top1.user_id}`}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider ${ratingTier(top1.rating).color}`}
                    >
                      {ratingTier(top1.rating).label}
                    </span>
                    <span className="font-mono font-bold text-lg text-foreground">
                      {top1.rating.toLocaleString()}
                    </span>
                  </div>
                </div>
              </Link>
            )}
          </div>
        </motion.div>

        {/* ─── STAT CARDS: 3-up grid ─── */}
        {selectedPool && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <StatCard
              icon={<FaUsers className="text-osu-pink" />}
              label="Players ever"
              value={selectedPool.unique_players ?? 0}
            />
            <StatCard
              icon={<FaFire className="text-amber-400" />}
              label="Matches today"
              value={selectedPool.matches_today ?? 0}
              live={(selectedPool.matches_today ?? 0) > 0}
            />
            <StatCard
              icon={<FaChartLine className="text-cyan-400" />}
              label="Matches this week"
              value={selectedPool.matches_this_week ?? 0}
            />
          </div>
        )}

        {/* ─── RULESET CHIPS ─── */}
        <div className="flex flex-wrap gap-2">
          {pools.map((p) => {
            const active = p.id === selectedPoolId;
            const liveCount = p.matches_today ?? 0;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPoolId(p.id)}
                className={`group relative px-5 py-2.5 rounded-xl border transition-all backdrop-blur-md text-sm font-semibold
                  ${
                    active
                      ? 'bg-gradient-to-br from-osu-pink/25 to-fuchsia-500/15 border-osu-pink/60 text-foreground shadow-[0_0_16px_rgba(236,72,153,0.25)]'
                      : 'bg-card/60 border-card text-gray-300 hover:bg-card hover:border-osu-pink/40 hover:text-osu-pink'
                  }`}
              >
                <div className="flex items-center gap-2.5">
                  <span>{RULESET_LABEL[p.ruleset_id] ?? `mode ${p.ruleset_id}`}</span>
                  {liveCount > 0 && (
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-500/20 text-green-300"
                      title={`${liveCount} matches in the last 24h`}
                    >
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
                      </span>
                      {liveCount}
                    </span>
                  )}
                </div>
                {active && (
                  <motion.span
                    layoutId="active-pool-underline"
                    className="absolute -bottom-1 left-3 right-3 h-0.5 bg-osu-pink rounded-full"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* ─── POOL BODY ─── */}
        {selectedPool && (
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedPool.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {/* Pool description (admin-curated) */}
              {selectedPool.description && (
                <div className="bg-card backdrop-blur-md rounded-2xl border border-card px-5 py-4">
                  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
                    {selectedPool.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Leaderboard column */}
                <section className="lg:col-span-2 space-y-4">
                  {/* Your placement pill */}
                  {myPoolStats && (
                    <Link
                      to={`/users/${myPoolStats.user_id}`}
                      className="block px-5 py-3 rounded-2xl bg-gradient-to-r from-osu-pink/15 via-osu-pink/5 to-transparent border border-osu-pink/30 hover:border-osu-pink/70 transition-all group"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="px-2 py-0.5 rounded text-xs font-bold tracking-wider uppercase bg-osu-pink/20 text-osu-pink">
                            Your placement
                          </span>
                          <span className="text-sm text-foreground font-semibold truncate">
                            {myPoolStats.rank ? `#${myPoolStats.rank}` : 'unranked'}
                            <span className="ml-2 text-gray-400 font-normal">
                              · {myPoolStats.plays} play{myPoolStats.plays === 1 ? '' : 's'}
                            </span>
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                            Rating
                          </p>
                          <p
                            className={`font-mono font-bold text-base ${ratingTier(myPoolStats.rating).color}`}
                          >
                            {myPoolStats.rating.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </Link>
                  )}

                  {/* Top 3 podium — only when ≥3 players */}
                  {!leaderboardLoading && top1 && top2 && top3 && (
                    <Podium top1={top1} top2={top2} top3={top3} currentUserId={currentUser?.id} />
                  )}

                  {/* Rest of leaderboard */}
                  <div className="bg-card backdrop-blur-md rounded-2xl border border-card shadow-xl overflow-hidden">
                    <header className="px-5 py-3.5 border-b border-card flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <FaTrophy className="text-osu-pink" />
                        <h2 className="font-bold text-foreground text-sm uppercase tracking-wider">
                          Leaderboard
                        </h2>
                      </div>
                      <span className="text-xs text-gray-500">
                        {leaderboard.length === 0
                          ? 'no entries'
                          : `${leaderboard.length} player${leaderboard.length === 1 ? '' : 's'}`}
                      </span>
                    </header>

                    {leaderboardLoading ? (
                      <ul>
                        {Array.from({ length: 6 }).map((_, i) => (
                          <LeaderboardRowSkeleton key={i} />
                        ))}
                      </ul>
                    ) : leaderboardError ? (
                      <p className="px-5 py-8 text-center text-red-400 text-sm">
                        {leaderboardError}
                      </p>
                    ) : leaderboard.length === 0 ? (
                      <div className="px-5 py-12 text-center">
                        <FaFire className="mx-auto text-3xl text-gray-600 mb-3" />
                        <p className="text-gray-400 text-sm">
                          No matches played yet in this pool. Be the first to claim the top.
                        </p>
                      </div>
                    ) : (
                      <ul className="divide-y divide-card/40">
                        {(top1 && top2 && top3 ? restOfBoard : leaderboard).map((entry) => (
                          <LeaderboardRow
                            key={entry.user_id}
                            entry={entry}
                            isMe={currentUser?.id === entry.user_id}
                          />
                        ))}
                      </ul>
                    )}
                  </div>
                </section>

                {/* Map rotation */}
                <section className="bg-card backdrop-blur-md rounded-2xl border border-card shadow-xl overflow-hidden h-fit lg:sticky lg:top-4">
                  <header className="px-5 py-3.5 border-b border-card flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <FaFire className="text-amber-400" />
                      <h2 className="font-bold text-foreground text-sm uppercase tracking-wider">
                        Map rotation
                      </h2>
                    </div>
                    <span className="text-xs text-gray-500">
                      {poolBeatmaps.length} {poolBeatmaps.length === 1 ? 'map' : 'maps'}
                    </span>
                  </header>

                  {poolBeatmapsLoading ? (
                    <ul>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <BeatmapRowSkeleton key={i} />
                      ))}
                    </ul>
                  ) : poolBeatmaps.length === 0 ? (
                    <p className="px-5 py-12 text-center text-sm text-gray-400">
                      No beatmaps in this pool yet.
                    </p>
                  ) : (
                    <ul className="divide-y divide-card/40 max-h-[680px] overflow-y-auto">
                      {poolBeatmaps.map((bm) => (
                        <li
                          key={bm.id}
                          className="px-5 py-3 flex items-center gap-3 hover:bg-card-hover/40 transition-colors"
                        >
                          <Link
                            to={`/beatmaps/${bm.beatmap_id}`}
                            className="flex items-center gap-3 flex-1 min-w-0 group"
                          >
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-card-hover to-card flex items-center justify-center font-mono text-xs text-osu-pink/80 shrink-0 ring-1 ring-card">
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
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                              Picks
                            </p>
                            <p className="font-mono text-sm text-gray-200">
                              {bm.selection_count.toLocaleString()}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </main>
    </div>
  );
};

// ──────────────────────────── sub-components ────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  live?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, live = false }) => (
  <div className="relative bg-card backdrop-blur-md rounded-2xl border border-card px-5 py-4 overflow-hidden group hover:border-osu-pink/30 transition-all">
    <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wider font-semibold">
      <span className="text-base">{icon}</span>
      {label}
      {live && (
        <span className="ml-1 relative flex h-2 w-2" aria-label="active">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
        </span>
      )}
    </div>
    <p className="mt-2 font-bold text-3xl text-foreground font-mono">{value.toLocaleString()}</p>
  </div>
);

interface PodiumProps {
  top1: MatchmakingLeaderboardEntry;
  top2: MatchmakingLeaderboardEntry;
  top3: MatchmakingLeaderboardEntry;
  currentUserId?: number;
}

const Podium: React.FC<PodiumProps> = ({ top1, top2, top3, currentUserId }) => {
  // Visual order: 2nd left, 1st center (tallest), 3rd right
  const slots: Array<{ entry: MatchmakingLeaderboardEntry; place: 1 | 2 | 3 }> = [
    { entry: top2, place: 2 },
    { entry: top1, place: 1 },
    { entry: top3, place: 3 },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {slots.map(({ entry, place }) => {
        const tier = ratingTier(entry.rating);
        const badge = RANK_BADGES[place];
        const isMe = currentUserId === entry.user_id;
        return (
          <Link
            key={entry.user_id}
            to={`/users/${entry.user_id}`}
            className={`group relative bg-card backdrop-blur-md rounded-2xl border transition-all overflow-hidden
              ${
                place === 1
                  ? 'border-yellow-400/40 hover:border-yellow-300/80 shadow-[0_0_20px_rgba(252,211,77,0.2)]'
                  : place === 2
                    ? 'border-gray-400/30 hover:border-gray-300/60'
                    : 'border-amber-700/40 hover:border-amber-600/70'
              }
              ${place === 1 ? 'pt-7 pb-5' : 'pt-5 pb-4'}
              ${isMe ? 'ring-1 ring-osu-pink/60 ring-inset' : ''}`}
          >
            <div
              className={`absolute inset-0 bg-gradient-to-b ${tier.bg} pointer-events-none opacity-50`}
            />

            {/* Place badge — top center */}
            <div
              className={`absolute top-2 left-1/2 -translate-x-1/2 text-2xl ${badge.color} drop-shadow-[0_0_6px_rgba(0,0,0,0.4)]`}
            >
              {badge.icon}
            </div>

            <div className="relative z-10 flex flex-col items-center text-center px-3">
              {entry.user?.avatar_url ? (
                <img
                  src={entry.user.avatar_url}
                  alt=""
                  className={`rounded-2xl object-cover shadow-lg ring-2 transition-all
                    ${place === 1 ? 'w-20 h-20' : 'w-14 h-14'} ${badge.ring}
                    ${isMe ? 'ring-osu-pink/80' : ''}`}
                />
              ) : (
                <div
                  className={`rounded-2xl bg-card-hover ${place === 1 ? 'w-20 h-20' : 'w-14 h-14'}`}
                />
              )}

              <p
                className={`mt-3 font-bold text-foreground truncate w-full group-hover:text-osu-pink transition-colors ${
                  place === 1 ? 'text-lg' : 'text-sm'
                }`}
              >
                {entry.user?.username ?? `user ${entry.user_id}`}
                {isMe && (
                  <span className="ml-1 align-middle inline-block px-1 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-osu-pink/20 text-osu-pink">
                    you
                  </span>
                )}
              </p>
              <p
                className={`mt-0.5 text-[10px] uppercase tracking-wider font-bold ${tier.color}`}
              >
                {tier.label}
              </p>

              <p
                className={`mt-2 font-mono font-bold ${tier.color} ${
                  place === 1 ? 'text-2xl' : 'text-lg'
                }`}
              >
                {entry.rating.toLocaleString()}
              </p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Rating</p>

              <div className="mt-2 flex items-center gap-3 text-[11px] text-gray-400">
                <span>
                  <span className="font-mono text-gray-200">{entry.plays}</span> plays
                </span>
                {entry.first_placements > 0 && (
                  <span>
                    <span className="font-mono text-gray-200">{entry.first_placements}</span> 1st
                  </span>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
};

interface LeaderboardRowProps {
  entry: MatchmakingLeaderboardEntry;
  isMe: boolean;
}

const LeaderboardRow: React.FC<LeaderboardRowProps> = ({ entry, isMe }) => {
  const tier = ratingTier(entry.rating);
  return (
    <li
      className={`relative px-5 py-3 flex items-center gap-4 transition-colors ${
        isMe ? 'bg-osu-pink/10' : 'hover:bg-card-hover/40'
      }`}
    >
      {isMe && (
        <span className="absolute left-0 top-0 bottom-0 w-1 bg-osu-pink" aria-hidden />
      )}
      <div className="w-10 flex items-center justify-center text-base font-bold text-gray-400">
        #{entry.rank}
      </div>
      <Link
        to={`/users/${entry.user_id}`}
        className="flex items-center gap-3 flex-1 min-w-0 group"
      >
        {entry.user?.avatar_url ? (
          <img
            src={entry.user.avatar_url}
            alt=""
            className={`w-10 h-10 rounded-full object-cover ring-2 transition-all ${
              isMe
                ? 'ring-osu-pink/70 shadow-[0_0_12px_rgba(236,72,153,0.5)]'
                : 'ring-card-hover group-hover:ring-osu-pink/60'
            }`}
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-card-hover" />
        )}
        <div className="min-w-0">
          <p className="font-semibold text-foreground truncate group-hover:text-osu-pink transition-colors flex items-center gap-2">
            <span className="truncate">{entry.user?.username ?? `user ${entry.user_id}`}</span>
            {isMe && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-osu-pink/20 text-osu-pink shrink-0">
                you
              </span>
            )}
          </p>
          <p className={`text-xs ${tier.color}`}>{tier.label}</p>
        </div>
      </Link>
      <div className="hidden md:block text-right">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider">Plays</p>
        <p className="font-mono font-semibold text-gray-200 text-sm">
          {entry.plays.toLocaleString()}
        </p>
      </div>
      <div className="hidden md:block text-right">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider">1st</p>
        <p className="font-mono font-semibold text-gray-200 text-sm">
          {entry.first_placements.toLocaleString()}
        </p>
      </div>
      <div className="text-right min-w-[5rem]">
        <p className="text-[10px] uppercase tracking-wider text-gray-500">Rating</p>
        <p className={`font-mono font-bold text-lg ${tier.color}`}>
          {entry.rating.toLocaleString()}
        </p>
      </div>
    </li>
  );
};

export default MatchmakingRankingsPage;
