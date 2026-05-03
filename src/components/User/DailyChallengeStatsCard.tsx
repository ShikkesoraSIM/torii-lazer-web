// Daily Challenge stats card for the user profile.
//
// Pure presentational. Backend already serializes
// `daily_challenge_user_stats` into the user payload (see USER_INCLUDES
// in g0v0-server/app/database/user.py), so this component just reads
// from props -- no fetches, no state.
//
// Renders four tiles in a responsive 2/4-column grid:
//   1. Daily Streak    -- current and best
//   2. Weekly Streak   -- current and best
//   3. Play Count      -- total daily-challenge plays
//   4. Top Placements  -- top-10% and top-50% finishes combined
//
// Returns null when there's no stats record OR when the user has zero
// engagement (playcount == 0 AND no streak history). Showing "0/0" on
// every fresh account would be visual noise — the card is only useful
// once the user has actually played a daily challenge.

import React from 'react';

interface DailyChallengeStats {
  daily_streak_best: number;
  daily_streak_current: number;
  weekly_streak_best: number;
  weekly_streak_current: number;
  playcount: number;
  top_10p_placements: number;
  top_50p_placements: number;
  user_id: number;
  last_update?: string | null;
}

interface DailyChallengeStatsCardProps {
  stats?: DailyChallengeStats;
  className?: string;
}

interface TileProps {
  label: string;
  primary: number | string;
  secondary?: string;
  tone?: 'default' | 'accent';
}

const Tile: React.FC<TileProps> = ({ label, primary, secondary, tone = 'default' }) => (
  <div
    className={`flex flex-col items-start gap-0.5 rounded-xl px-4 py-3 border border-white/10 ${
      tone === 'accent' ? 'bg-profile-color/10' : 'bg-white/5'
    }`}
  >
    <span className="text-[11px] uppercase tracking-wider text-white/55">{label}</span>
    <span className="text-2xl font-bold text-white tabular-nums">{primary}</span>
    {secondary && <span className="text-xs text-white/65">{secondary}</span>}
  </div>
);

const DailyChallengeStatsCard: React.FC<DailyChallengeStatsCardProps> = ({ stats, className = '' }) => {
  if (!stats) return null;

  // Skip the card entirely for users who have never engaged with the
  // daily challenge — a row of zeroes is clutter, not information.
  const hasAnyActivity =
    stats.playcount > 0 ||
    stats.daily_streak_best > 0 ||
    stats.weekly_streak_best > 0 ||
    stats.top_10p_placements > 0 ||
    stats.top_50p_placements > 0;

  if (!hasAnyActivity) return null;

  const placementsTotal = stats.top_10p_placements + stats.top_50p_placements;
  // Surface the more impressive count when both are non-zero — the
  // "top 10%" placement is rarer and more impressive, so it leads.
  const placementsSecondary =
    stats.top_10p_placements > 0
      ? `${stats.top_10p_placements} top 10% · ${stats.top_50p_placements} top 50%`
      : `${stats.top_50p_placements} top 50%`;

  return (
    <section
      className={`rounded-2xl bg-gradient-to-br from-[rgba(20,24,52,0.85)] to-[rgba(12,16,42,0.92)] border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl p-5 ${className}`}
      aria-label="Daily Challenge statistics"
    >
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-base font-semibold text-white">Daily Challenge</h3>
        {stats.last_update && (
          <span className="text-xs text-white/50">
            updated {new Date(stats.last_update).toLocaleDateString()}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile
          label="Daily Streak"
          primary={stats.daily_streak_current}
          secondary={`best ${stats.daily_streak_best}`}
          tone={stats.daily_streak_current > 0 ? 'accent' : 'default'}
        />
        <Tile
          label="Weekly Streak"
          primary={stats.weekly_streak_current}
          secondary={`best ${stats.weekly_streak_best}`}
          tone={stats.weekly_streak_current > 0 ? 'accent' : 'default'}
        />
        <Tile
          label="Play Count"
          primary={stats.playcount.toLocaleString()}
        />
        <Tile
          label="Placements"
          primary={placementsTotal.toLocaleString()}
          secondary={placementsSecondary}
        />
      </div>
    </section>
  );
};

export default DailyChallengeStatsCard;
