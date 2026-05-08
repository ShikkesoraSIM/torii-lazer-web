import React from 'react';

/**
 * Matchmaking-specific skeleton primitives.
 *
 * Replaces the previous "spinner during load" treatment that had two
 * downsides:
 *   1. The spinner reserves no space, so when data lands the layout
 *      shifts and the user sees a jarring jump.
 *   2. Spinners convey "something is happening" but not "what's about
 *      to appear". Skeletons mirror the final shape so the user's
 *      eye is already at the right spot when content fills in.
 *
 * All variants share the same pulse animation + bg-card-hover gradient
 * so a page that mixes skeleton states still feels visually unified.
 *
 * Kept inside `components/Matchmaking/` rather than `components/UI/`
 * because the shapes are tuned to the matchmaking-specific layouts —
 * e.g. the leaderboard row reserves space for an avatar + tier label
 * + 4 stat columns + a rating cell, which is a strictly matchmaking
 * concern. Promote later if other pages need the same shape.
 */

const PulseBlock: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`animate-pulse rounded ${className}`}
    style={{ background: 'var(--card-bg-hover)', opacity: 0.6 }}
  />
);

/**
 * Skeleton for one row of the matchmaking leaderboard. Used
 * `<LeaderboardRowSkeleton key={i} />` × 5-8 to fill the column on
 * first render.
 */
export const LeaderboardRowSkeleton: React.FC = () => (
  // No row border — the live row also drops dividers in the new
  // glass theme (definition comes from spacing + hover wash).
  <li className="px-5 py-3 flex items-center gap-4">
    <PulseBlock className="w-10 h-6" />
    <PulseBlock className="w-10 h-10 rounded-full" />
    <div className="flex-1 min-w-0 space-y-2">
      <PulseBlock className="h-4 w-32" />
      <PulseBlock className="h-3 w-16" />
    </div>
    <div className="hidden md:block w-12 space-y-1.5">
      <PulseBlock className="h-3 w-full" />
      <PulseBlock className="h-4 w-2/3 ml-auto" />
    </div>
    <div className="hidden md:block w-12 space-y-1.5">
      <PulseBlock className="h-3 w-full" />
      <PulseBlock className="h-4 w-2/3 ml-auto" />
    </div>
    <div className="w-20 space-y-1.5">
      <PulseBlock className="h-3 w-full" />
      <PulseBlock className="h-5 w-3/4 ml-auto" />
    </div>
  </li>
);

/**
 * Skeleton for a beatmap rotation row. Mirrors the live `<li>` in
 * MatchmakingRankingsPage so the panel's height stays put when the
 * data lands.
 */
export const BeatmapRowSkeleton: React.FC = () => (
  <li className="px-5 py-3 flex items-center gap-3">
    <PulseBlock className="w-12 h-12 rounded-xl" />
    <div className="flex-1 min-w-0 space-y-2">
      <PulseBlock className="h-4 w-3/4" />
      <PulseBlock className="h-3 w-1/3" />
    </div>
    <div className="w-12 space-y-1.5 text-right">
      <PulseBlock className="h-3 w-full" />
      <PulseBlock className="h-4 w-2/3 ml-auto" />
    </div>
  </li>
);

/**
 * Full panel skeleton that renders both a leaderboard column and a
 * beatmap rotation column. Drop-in replacement for the section body
 * while the pool's data is loading.
 */
export const PoolBodySkeleton: React.FC<{ leaderboardRows?: number; beatmapRows?: number }> = ({
  leaderboardRows = 6,
  beatmapRows = 5,
}) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <section className="lg:col-span-2 mm-glass overflow-hidden">
      <header className="px-5 pt-4 pb-3 flex items-center justify-between">
        <PulseBlock className="h-5 w-44" />
        <PulseBlock className="h-3 w-20" />
      </header>
      <ul>
        {Array.from({ length: leaderboardRows }).map((_, i) => (
          <LeaderboardRowSkeleton key={i} />
        ))}
      </ul>
    </section>

    <section className="mm-glass overflow-hidden">
      <header className="px-5 pt-4 pb-3 flex items-center justify-between">
        <PulseBlock className="h-5 w-32" />
        <PulseBlock className="h-3 w-16" />
      </header>
      <ul>
        {Array.from({ length: beatmapRows }).map((_, i) => (
          <BeatmapRowSkeleton key={i} />
        ))}
      </ul>
    </section>
  </div>
);

/**
 * Skeleton for the pool tabs strip — used briefly while we don't yet
 * know how many pools are active. Renders three placeholders, since
 * almost every Torii deploy has at least three (osu QP / osu RP /
 * one more) and the strip never collapses below three tabs visually.
 */
export const PoolTabsSkeleton: React.FC = () => (
  <div className="flex flex-wrap gap-2">
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className="mm-glass-inset px-4 py-2.5 flex items-center gap-2.5"
      >
        <PulseBlock className="h-3 w-12" />
        <PulseBlock className="h-3 w-16" />
      </div>
    ))}
  </div>
);

/**
 * Skeleton row for the per-pool stats table on the profile card.
 * Render N of these inside the existing `<tbody>` while the API
 * call to /users/{id}/matchmaking/stats is in flight.
 */
export const ProfilePoolStatsRowSkeleton: React.FC = () => (
  <tr className="border-t border-gray-100 dark:border-gray-700">
    <td className="py-2 pr-4">
      <PulseBlock className="h-4 w-44" />
    </td>
    <td className="py-2 pr-4 text-right">
      <PulseBlock className="h-4 w-12 ml-auto" />
    </td>
    <td className="py-2 pr-4 text-right">
      <PulseBlock className="h-4 w-10 ml-auto" />
    </td>
    <td className="py-2 pr-4 text-right">
      <PulseBlock className="h-4 w-12 ml-auto" />
    </td>
    <td className="py-2 text-right">
      <PulseBlock className="h-4 w-12 ml-auto" />
    </td>
  </tr>
);

/**
 * Skeleton row for the recent-matches list on the profile card.
 */
export const ProfileHistoryRowSkeleton: React.FC = () => (
  <li className="flex items-center justify-between py-1.5 border-t border-gray-100 dark:border-gray-700">
    <div className="flex items-center gap-2 min-w-0">
      <PulseBlock className="h-3 w-8" />
      <PulseBlock className="h-3 w-32" />
      <PulseBlock className="h-3 w-20" />
    </div>
    <div className="flex items-center gap-3">
      <PulseBlock className="h-3 w-8" />
      <PulseBlock className="h-3 w-12" />
    </div>
  </li>
);

/**
 * Skeleton row for the admin pool list — used while the initial
 * `matchmakingAPI.listPools({ include_inactive: true })` is in flight.
 */
export const AdminPoolRowSkeleton: React.FC = () => (
  <li className="mm-glass p-4">
    <div className="flex items-center gap-3">
      <PulseBlock className="h-4 w-10" />
      <PulseBlock className="h-5 w-44" />
      <PulseBlock className="h-4 w-16" />
      <div className="flex-1" />
      <PulseBlock className="h-6 w-12" />
      <PulseBlock className="h-6 w-20" />
    </div>
    <PulseBlock className="h-3 w-3/4 mt-2" />
  </li>
);
