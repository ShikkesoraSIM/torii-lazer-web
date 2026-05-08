import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaTrophy, FaCrown } from 'react-icons/fa';
import {
  matchmakingAPI,
  type MatchmakingHistoryEntry,
  type MatchmakingPool,
  type MatchmakingUserPoolStats,
} from '../../utils/api';
import { apiCache } from '../../utils/apiCache';
import type { User } from '../../types';

/**
 * Profile-page section that surfaces a user's matchmaking activity.
 *
 * Two visual blocks:
 *
 *   1. Per-pool tile — rating front-and-centre with a tier-coloured
 *      gradient wash, a mini W/L bar (derived from recent history),
 *      a sparkline of the rating curve, and a stats strip
 *      (rank · plays · 1st placements).
 *   2. Recent matches list — opponent avatar + result pill + delta,
 *      tight one-line-per-match.
 *
 * Renders nothing if the user has no matchmaking activity at all.
 */

interface MatchmakingStatsCardProps {
  userId: number;
}

// Reused from MatchmakingRankingsPage — keeps the tier vocabulary
// consistent across rankings, profile, and any future surfaces.
// The numbers must match what the rankings page uses or users will
// see one tier on their profile and a different one on the ladder.
const RATING_TIERS = [
  { min: 2000, label: 'Master', color: 'text-pink-300', accent: 'rgba(236,72,153,1)', bg: 'from-pink-500/30 to-fuchsia-600/15' },
  { min: 1700, label: 'Diamond', color: 'text-cyan-300', accent: 'rgba(34,211,238,1)', bg: 'from-cyan-400/25 to-sky-500/10' },
  { min: 1500, label: 'Gold', color: 'text-yellow-300', accent: 'rgba(253,224,71,1)', bg: 'from-yellow-400/25 to-amber-500/10' },
  { min: 1300, label: 'Silver', color: 'text-gray-200', accent: 'rgba(229,231,235,1)', bg: 'from-gray-300/25 to-gray-400/10' },
  { min: 0, label: 'Bronze', color: 'text-amber-700', accent: 'rgba(180,83,9,1)', bg: 'from-amber-700/25 to-orange-700/10' },
] as const;

const ratingTier = (rating: number) =>
  RATING_TIERS.find((t) => rating >= t.min) ?? RATING_TIERS[RATING_TIERS.length - 1];

const RESULT_BG: Record<MatchmakingHistoryEntry['result'], string> = {
  win: 'bg-green-500/15 text-green-400 border-green-500/30',
  loss: 'bg-red-500/15 text-red-400 border-red-500/30',
  draw: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
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
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d`;
  return new Date(iso).toLocaleDateString();
};

const MatchmakingStatsCard: React.FC<MatchmakingStatsCardProps> = ({ userId }) => {
  const [stats, setStats] = useState<MatchmakingUserPoolStats[] | null>(null);
  const [history, setHistory] = useState<MatchmakingHistoryEntry[] | null>(null);
  const [poolsById, setPoolsById] = useState<Map<number, MatchmakingPool>>(new Map());
  // Full opponent records (username + avatar) keyed by user id. We use
  // apiCache so navigating across leaderboard / profile shares lookups
  // and we don't refetch the same usernames every visit.
  const [opponents, setOpponents] = useState<Map<number, User>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      // Pull more history (24) than we render (8) so the sparkline +
      // W/L bar can use a wider window without a second API call.
      matchmakingAPI.getUserStats(userId),
      matchmakingAPI.getUserHistory(userId, { limit: 24 }),
      matchmakingAPI.listPools({ include_inactive: true }),
    ])
      .then(([statsRes, historyRes, poolsRes]) => {
        if (cancelled) return;
        setStats(statsRes);
        setHistory(historyRes);
        const map = new Map<number, MatchmakingPool>();
        for (const p of poolsRes) map.set(p.id, p);
        setPoolsById(map);

        const opponentIds = Array.from(new Set(historyRes.map((h) => h.opponent_id)));
        if (opponentIds.length > 0) {
          apiCache
            .getUsers(opponentIds)
            .then((usersMap) => {
              if (cancelled) return;
              setOpponents(new Map(usersMap));
            })
            .catch(() => {
              // Best effort — fall back to placeholder name + grey avatar.
            });
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
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

  if (loading) return null;
  if (!error && (!stats || stats.length === 0) && (!history || history.length === 0)) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* Section header — accent line + title, matches the visual
          rhythm of the rest of the profile (UserMostPlayedBeatmaps,
          UserRecentScores all use this pattern). The matchmaking
          content lives directly in the profile row's bg-card, not in
          a nested glass card, so the section feels native instead of
          a floating overlay. */}
      <div className="flex items-center gap-3">
        <div className="w-1 h-6 rounded-full bg-osu-pink" />
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <FaTrophy className="text-osu-pink text-base" />
          Matchmaking
        </h2>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {!error && stats && stats.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {stats.map((s) => (
            <PoolTile
              key={`${s.user_id}-${s.pool_id}`}
              stats={s}
              pool={poolsById.get(s.pool_id) ?? null}
              history={history ?? []}
            />
          ))}
        </div>
      )}

      {!error && history && history.length > 0 && (
        <RecentMatchesList
          // Display only the 8 newest — the wider window we fetched is
          // for the sparkline / W/L derivation in the tile.
          history={history.slice(0, 8)}
          poolsById={poolsById}
          opponents={opponents}
        />
      )}
    </motion.div>
  );
};

// ─────────────────────────────── Pool tile ───────────────────────────────

interface PoolTileProps {
  stats: MatchmakingUserPoolStats;
  pool: MatchmakingPool | null;
  /** Full unfiltered history; we filter to this pool internally. */
  history: MatchmakingHistoryEntry[];
}

const PoolTile: React.FC<PoolTileProps> = ({ stats, pool, history }) => {
  const tier = ratingTier(stats.rating);

  // Filter history to this pool only, oldest-first for sparkline drawing.
  const poolHistory = useMemo(
    () =>
      history
        .filter((h) => h.pool_id === stats.pool_id)
        .slice()
        .reverse(),
    [history, stats.pool_id],
  );

  const wins = poolHistory.filter((h) => h.result === 'win').length;
  const losses = poolHistory.filter((h) => h.result === 'loss').length;
  const total = wins + losses;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : null;

  return (
    <Link
      to={`/rankings/matchmaking?pool=${stats.pool_id}`}
      className="group relative overflow-hidden mm-glass-inset transition-all hover:shadow-[0_0_24px_rgba(0,0,0,0.45)]"
      style={{ display: 'block' }}
    >
      {/* Tier-coloured gradient wash — heaviest in the corner, fades
          across the tile. Master glows pink; Bronze fades amber. */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${tier.bg} pointer-events-none opacity-90`}
      />

      <div className="relative p-4 flex items-stretch gap-4">
        {/* Big rating block — the eye-catcher. Tier label above, mono
            digit below, accent-coloured stripe on the very left. */}
        <div className="flex flex-col items-start justify-between min-w-[92px]">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-gray-400 font-semibold">
              {tier.label}
            </p>
            <p className={`mt-1 font-mono font-bold text-3xl leading-none ${tier.color}`}>
              {stats.rating.toLocaleString()}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-gray-500">
              Rating
            </p>
          </div>
        </div>

        {/* Right column — pool name, stats strip, W/L bar. Flex-grows
            to fill so the tile reads naturally even when the pool name
            is long. */}
        <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-foreground truncate group-hover:text-osu-pink transition-colors">
              {pool ? pool.name : `Pool #${stats.pool_id}`}
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {pool ? POOL_TYPE_LABEL[pool.type] : 'unknown'}
            </p>
          </div>

          {/* Stats strip — rank / plays / 1st placements as discrete
              labelled chunks. Crown when there's at least one 1st. */}
          <div className="flex items-baseline gap-3 text-xs">
            <Stat
              label="Rank"
              value={stats.rank ? `#${stats.rank}` : '—'}
              accent={stats.rank ? tier.color : 'text-gray-500'}
            />
            <Stat
              label="Plays"
              value={stats.plays.toLocaleString()}
              accent="text-gray-200"
            />
            {stats.first_placements > 0 && (
              <Stat
                label="1st"
                value={
                  <span className="inline-flex items-center gap-1">
                    <FaCrown className="text-yellow-400 text-[10px]" />
                    {stats.first_placements}
                  </span>
                }
                accent="text-yellow-300"
              />
            )}
          </div>

          {/* W/L bar — only renders when there's recent history for
              this pool. Tiny, two-segment, hard split. */}
          {total > 0 && (
            <div>
              <div className="flex items-center gap-2 text-[10px] text-gray-500 mb-1">
                <span>
                  <span className="text-green-400 font-mono">{wins}W</span>
                  {' '}
                  <span className="text-red-400 font-mono">{losses}L</span>
                </span>
                {winRate != null && (
                  <span className="ml-auto text-gray-400">
                    {winRate}% in last {total}
                  </span>
                )}
              </div>
              <div className="h-1 rounded-full overflow-hidden flex bg-white/[0.03]">
                <div
                  className="bg-green-400/70 transition-all"
                  style={{ width: `${(wins / total) * 100}%` }}
                />
                <div
                  className="bg-red-400/70 transition-all"
                  style={{ width: `${(losses / total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Sparkline of elo_after over the recent history window for
            this pool. Anchors the tile visually on the right and gives
            the user an "are you trending up or down" answer at a
            glance without a chart library. */}
        {poolHistory.length >= 2 && (
          <div className="hidden md:block w-20 shrink-0">
            <Sparkline points={poolHistory.map((h) => h.elo_after)} accent={tier.accent} />
          </div>
        )}
      </div>
    </Link>
  );
};

// Tiny labelled stat used inside the pool tile.
const Stat: React.FC<{ label: string; value: React.ReactNode; accent: string }> = ({
  label,
  value,
  accent,
}) => (
  <span className="flex flex-col">
    <span className={`font-mono font-semibold text-sm ${accent}`}>{value}</span>
    <span className="text-[9px] uppercase tracking-wider text-gray-500">{label}</span>
  </span>
);

// No-dependency rating sparkline. Computes a normalised polyline +
// fills the area under it with a faint version of the accent. We
// resize-aware via viewBox + preserveAspectRatio so the parent's
// width determines visual size. Domain is min/max of `points` so a
// flat 1500-1500-1500 history collapses to a midline.
const Sparkline: React.FC<{ points: number[]; accent: string }> = ({ points, accent }) => {
  const W = 80;
  const H = 36;
  const padY = 3;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = Math.max(1, max - min);
  const stepX = points.length > 1 ? W / (points.length - 1) : W;

  const coords = points.map((p, i) => {
    const x = i * stepX;
    const y = padY + (1 - (p - min) / span) * (H - padY * 2);
    return [x, y] as const;
  });

  const linePath = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${W} ${H} L0 ${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
      <path d={areaPath} fill={accent} opacity={0.15} />
      <path d={linePath} fill="none" stroke={accent} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
      {coords.length > 0 && (
        <circle
          cx={coords[coords.length - 1][0]}
          cy={coords[coords.length - 1][1]}
          r={2}
          fill={accent}
        />
      )}
    </svg>
  );
};

// ──────────────────────────── Recent matches ────────────────────────────

interface RecentMatchesListProps {
  history: MatchmakingHistoryEntry[];
  poolsById: Map<number, MatchmakingPool>;
  opponents: Map<number, User>;
}

const RecentMatchesList: React.FC<RecentMatchesListProps> = ({
  history,
  poolsById,
  opponents,
}) => (
  <div className="space-y-2.5 relative">
    <p className="text-xs uppercase tracking-[0.15em] text-gray-400 font-semibold">
      Recent matches
    </p>
    <ul className="divide-y divide-white/[0.04]">
      {history.map((h) => {
        const pool = poolsById.get(h.pool_id);
        const opponent = opponents.get(h.opponent_id);
        const deltaSign = h.elo_delta >= 0 ? '+' : '';
        return (
          <li
            key={h.id}
            className="mm-row flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg"
          >
            {/* Result indicator — coloured pill with translucent fill
                + matching border so it reads as a clear status. */}
            <span
              className={`shrink-0 w-12 text-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${RESULT_BG[h.result]}`}
            >
              {h.result}
            </span>

            {/* Opponent — avatar + name, tightly grouped. Falls back
                to a grey circle + "user N" when the lookup hasn't
                resolved (or the opponent's been deleted). */}
            <Link
              to={`/users/${h.opponent_id}`}
              className="flex items-center gap-2 min-w-0 group flex-1"
            >
              {opponent?.avatar_url ? (
                <img
                  src={opponent.avatar_url}
                  alt=""
                  className="w-7 h-7 rounded-full object-cover ring-1 ring-white/[0.06] group-hover:ring-osu-pink/60 transition-all"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-card-hover ring-1 ring-white/[0.06]" />
              )}
              <div className="min-w-0">
                <p className="text-sm text-foreground truncate group-hover:text-osu-pink transition-colors">
                  {opponent?.username ?? `user ${h.opponent_id}`}
                </p>
                <p className="text-[10px] text-gray-500 truncate">
                  {pool ? pool.name : `Pool #${h.pool_id}`}
                </p>
              </div>
            </Link>

            {/* Delta + age, right-aligned. Mono digits + tabular-nums
                so multi-row stacks line up cleanly. */}
            <div className="flex items-baseline gap-3 shrink-0">
              <span
                className={`font-mono font-semibold text-sm tabular-nums ${
                  h.elo_delta >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {deltaSign}
                {h.elo_delta}
              </span>
              <span className="text-[10px] text-gray-500 tabular-nums w-7 text-right">
                {formatRelative(h.created_at)}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  </div>
);

export default MatchmakingStatsCard;
