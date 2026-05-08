import React, { useState } from 'react';

/**
 * Tiny "album art" thumb for a beatmap row.
 *
 * Shows the parent beatmapset's `list.jpg` cover (small, ~160×60) as a
 * background, dimmed to ~40-55% so the star-rating label on top stays
 * readable on light covers as well as dark ones. Falls back to the old
 * "gradient panel + osu-pink star rating" treatment if:
 *   - `setId` is null (beatmap has no resolved beatmapset locally)
 *   - the cover request 404s (deleted set, broken upload, etc.)
 *
 * Lives in `components/Matchmaking/` because the styling is tuned to
 * the ranking-page row height (48×48). For other pages that want
 * cover thumbs, the `UserMostPlayedBeatmaps` component already
 * exposes a richer `<BeatmapsetCover>` pattern — we don't generalise
 * here so that we can stay on the public CDN URL (which is reliable
 * even when the local beatmapset row is missing) without buying into
 * g0v0's covers.cover proxy.
 */
interface BeatmapThumbProps {
  setId: number | null;
  starRating: number | null | undefined;
  /**
   * Size in pixels (defaults to 48). The cover image is loaded at
   * `list@2x.jpg` (320×120) which is enough resolution for sizes up to
   * ~80px without obvious blurring.
   */
  size?: number;
  className?: string;
}

const BeatmapThumb: React.FC<BeatmapThumbProps> = ({
  setId,
  starRating,
  size = 48,
  className = '',
}) => {
  const [coverFailed, setCoverFailed] = useState(false);
  const showCover = setId != null && !coverFailed;
  // Public CDN URL — works for every ranked map upstream. Doesn't depend on
  // g0v0's cover proxy so it keeps working even if our beatmapsets row is
  // a placeholder.
  const coverUrl = setId != null
    ? `https://assets.ppy.sh/beatmaps/${setId}/covers/list@2x.jpg`
    : null;

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-xl flex items-center justify-center font-mono text-xs font-bold ${className}`}
      style={{ width: size, height: size }}
    >
      {showCover && coverUrl && (
        <>
          {/*
            Cover image. Hidden behind a dimming overlay so the star
            rating label remains legible regardless of how bright the
            specific cover is. eager-load is fine — list@2x is ~10KB
            and we render at most ~8 of these on screen at once.
          */}
          <img
            src={coverUrl}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setCoverFailed(true)}
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Dark overlay tuned for readability against arbitrary covers. */}
          <div
            className="absolute inset-0 bg-gradient-to-br from-black/55 via-black/40 to-black/65 pointer-events-none"
            aria-hidden
          />
        </>
      )}
      {!showCover && (
        // Fallback: subtle gradient surface, keeps the same visual
        // weight as the cover variant so a row without a resolved set
        // doesn't visually shrink relative to its neighbours.
        <div className="absolute inset-0 bg-gradient-to-br from-card-hover to-card" aria-hidden />
      )}
      <span
        className="relative z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]"
        style={{ color: showCover ? 'rgba(255,255,255,0.95)' : 'rgba(236,72,153,0.85)' }}
      >
        {starRating != null ? starRating.toFixed(2) + '★' : '—'}
      </span>
    </div>
  );
};

export default BeatmapThumb;
