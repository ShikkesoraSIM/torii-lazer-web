import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tooltip } from 'react-tooltip';
import { useProfileColor } from '../../contexts/ProfileColorContext';
import LazyBackgroundImage from '../UI/LazyBackgroundImage';
import { userAPI } from '../../utils/api';
import { FaPlay } from 'react-icons/fa';
import { type User } from '../../types';

interface MostPlayedBeatmap {
  count: number;
  beatmap: {
    id: number;
    beatmapset_id: number;
    version: string;
    total_length: number;
    drain_length: number;
    bpm: number;
    ar: number;
    od: number;
    cs: number;
    hp: number;
    difficulty_rating: number;
    playcount?: number;
    passcount?: number;
  };
  beatmapset: {
    id: number;
    title: string;
    artist: string;
    creator: string;
    display_title?: string;
    covers?: {
      cover?: string;
      card?: string;
      list?: string;
      slimcover?: string;
    };
  };
}

interface UserMostPlayedBeatmapsProps {
  userId: number;
  user?: User;
  max?: number;
  className?: string;
}

interface BeatmapCardProps {
  item: any;
  idx: number;
  profileColor: string;
}

const BeatmapCard: React.FC<BeatmapCardProps> = ({ item, idx, profileColor }) => {
  const { t } = useTranslation();
  
  // Normalize response shape: support both
  // 1) { count, beatmap: {...}, beatmapset: {...} }
  // 2) { beatmap_id, beatmap: {... (with beatmapset nested) } }
  const beatmapObj = (item as any).beatmap ?? undefined;
  const beatmapsetObj = (item as any).beatmapset ?? (item as any).beatmap?.beatmapset ?? undefined;
  const count = (item as any).count ?? (item as any).playcount ?? (item as any).beatmap?.playcount ?? undefined;

  const bmId = beatmapObj?.id ?? (item as any).beatmap_id ?? (item as any).id;
  const bsId = beatmapsetObj?.id ?? (item as any).beatmapset_id ?? (beatmapObj?.beatmapset?.id);

  const title = beatmapsetObj?.title ?? beatmapObj?.title ?? '--';
  const artist = beatmapsetObj?.artist ?? '--';
  const version = beatmapObj?.version ?? '--';
  const difficultyRating = beatmapObj?.difficulty_rating ?? 0;

  // Prefer @2x covers for higher quality
  const covers = beatmapsetObj?.covers ?? beatmapObj?.beatmapset?.covers ?? {};
  const coverUrl = covers['cover@2x'] || covers['card@2x'] || covers['card'] || covers['cover'] || '';

  const tooltipId = `beatmap-${bmId}-${idx}`;

  // Convert theme color to RGB for gradient overlay
  const hexToRgb = (hex: string): string => {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  };

  const themeRgb = hexToRgb(profileColor);

  return (
    <LazyBackgroundImage
      src={coverUrl}
      className="relative overflow-hidden border-b border-gray-100 dark:border-gray-700/50 last:border-b-0"
    >
      {/* Gradient overlay for readability with theme color */}
      <div
        className="absolute inset-0 bg-gradient-to-r"
        style={{
          background: `linear-gradient(to right, rgba(${themeRgb}, 0.15) 0%, rgba(${themeRgb}, 0.08) 50%, rgba(${themeRgb}, 0.03) 100%)`
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/75 to-white/60 dark:from-gray-800/90 dark:via-gray-800/75 dark:to-gray-800/60" />

      <div className="relative bg-transparent hover:bg-white/20 dark:hover:bg-gray-800/20 transition-colors duration-150 group">
        {/* Desktop layout */}
        <div className="hidden sm:block">
          <div className="flex items-center h-12 pl-5 pr-24">
            {/* Beatmap Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col -space-y-0.5">
                {/* Title and Artist */}
                <div className="flex items-baseline gap-1 text-sm leading-tight">
                  <a
                    href={`/beatmapsets/${bsId}#osu/${bmId}`}
                    className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate transition-colors"
                    title={title}
                    data-tooltip-id={tooltipId}
                    data-tooltip-content={count ? `Played ${count} times` : undefined}
                  >
                    {title}
                  </a>
                  <span className="text-gray-600 dark:text-gray-400 text-xs flex-shrink-0">
                    {t('profile.bestScores.by') || 'by'}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400 text-xs truncate">
                    {artist}
                  </span>
                </div>

                {/* Difficulty and Stats */}
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                    {version}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    {difficultyRating.toFixed(2)}?
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right side play count */}
          <div className="absolute right-0 top-0 h-full flex items-center justify-center pr-2">
            {count && (
              <div className="flex items-center gap-1 text-sm font-bold text-pink-600 dark:text-pink-400 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)] dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                <FaPlay className="text-xs" />
                {count}
              </div>
            )}
          </div>
        </div>

        {/* Mobile layout */}
        <div className="block sm:hidden p-4">
          <div className="flex-1">
            {/* Title and Artist */}
            <div className="flex items-baseline gap-1 text-sm leading-tight mb-1">
              <a
                href={`/beatmapsets/${bsId}#osu/${bmId}`}
                className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate transition-colors"
                title={title}
                data-tooltip-id={tooltipId}
                data-tooltip-content={count ? `Played ${count} times` : undefined}
              >
                {title}
              </a>
              <span className="text-gray-600 dark:text-gray-400 text-xs flex-shrink-0">
                {t('profile.bestScores.by') || 'by'}
              </span>
              <span className="text-gray-600 dark:text-gray-400 text-xs truncate">
                {artist}
              </span>
            </div>

            {/* Difficulty and Play Count */}
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                  {version}
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  {difficultyRating.toFixed(2)}?
                </span>
              </div>
              {count && (
                <div className="flex items-center gap-1 text-sm font-bold text-pink-600 dark:text-pink-400">
                  <FaPlay className="text-xs" />
                  {count}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Tooltip id={tooltipId} place="top" />
    </LazyBackgroundImage>
  );
};

const UserMostPlayedBeatmaps: React.FC<UserMostPlayedBeatmapsProps> = ({ userId, user, max = 6, className = '' }) => {
  const { t } = useTranslation();
  const { profileColor } = useProfileColor();
  const [beatmaps, setBeatmaps] = useState<MostPlayedBeatmap[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const translatedMostPlayedTitle = t('profile.mostPlayed.title');
  const mostPlayedTitle =
    translatedMostPlayedTitle && translatedMostPlayedTitle !== 'profile.mostPlayed.title'
      ? translatedMostPlayedTitle
      : 'Most Played Beatmaps';

  useEffect(() => {
    const fetchMostPlayedBeatmaps = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // Fetch the limited results for display
        const data = await userAPI.getMostPlayedBeatmaps(userId, max, 0);
        if (!data) {
          setBeatmaps([]);
        } else if (Array.isArray(data)) {
          setBeatmaps(data as MostPlayedBeatmap[]);
        } else if (data.beatmapsets && Array.isArray(data.beatmapsets)) {
          setBeatmaps(data.beatmapsets as MostPlayedBeatmap[]);
        } else if (data.data && Array.isArray(data.data)) {
          setBeatmaps(data.data as MostPlayedBeatmap[]);
        } else {
          console.warn('Unexpected most-played response shape:', data);
          setBeatmaps([]);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        setError(t('profile.mostPlayed.loadFailed') || `Error: ${errorMsg}`);
        console.error('Error fetching most played beatmaps:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMostPlayedBeatmaps();
  }, [userId, max]);

  // Set total count from user object when available
  useEffect(() => {
    if (user?.beatmap_playcounts_count) {
      setTotalCount(user.beatmap_playcounts_count);
    }
  }, [user]);

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-6 rounded-full" style={{ backgroundColor: profileColor }}></div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {mostPlayedTitle} {totalCount > 0 ? `(${totalCount.toLocaleString()})` : ''}
          </h3>
        </div>
        <div className="shadow-sm overflow-hidden rounded-lg">
          <div className="bg-card h-[30px] rounded-t-lg border-x border-t border-gray-200/50 dark:border-gray-600/30 flex items-center justify-center">
            <div className="w-16 h-1 rounded-full" style={{ backgroundColor: profileColor }}></div>
          </div>
          <div className="bg-card border-x border-gray-200/50 dark:border-gray-600/30 animate-pulse space-y-3 p-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-200 dark:bg-slate-700 rounded" />
            ))}
          </div>
          <div className="bg-card h-[30px] rounded-b-lg border-x border-b border-gray-200/50 dark:border-gray-600/30" />
        </div>
      </div>
    );
  }

  if (error || beatmaps.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-6 rounded-full" style={{ backgroundColor: profileColor }}></div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {mostPlayedTitle} {totalCount > 0 ? `(${totalCount.toLocaleString()})` : ''}
          </h3>
        </div>
        <div className="text-center text-gray-500 dark:text-gray-400 py-6 text-sm">
          {error || 'No most played beatmaps data available'}
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-6 rounded-full" style={{ backgroundColor: profileColor }}></div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {mostPlayedTitle} {totalCount > 0 ? `(${totalCount.toLocaleString()})` : ''}
        </h3>
      </div>

      <div className="shadow-sm overflow-hidden rounded-lg">
        {/* Top decorative bar */}
        <div className="bg-card h-[30px] rounded-t-lg border-x border-t border-gray-200/50 dark:border-gray-600/30 flex items-center justify-center">
          <div className="w-16 h-1 rounded-full" style={{ backgroundColor: profileColor }}></div>
        </div>

        {/* Beatmaps list */}
        <div className="bg-card border-x border-gray-200/50 dark:border-gray-600/30">
          {beatmaps.map((item, idx) => (
            <BeatmapCard key={`${(item as any).beatmap?.id ?? idx}-${idx}`} item={item} idx={idx} profileColor={profileColor} />
          ))}
        </div>

        {/* Bottom decorative bar */}
        <div className="bg-card h-[30px] rounded-b-lg border-x border-b border-gray-200/50 dark:border-gray-600/30 flex items-center justify-center" />
      </div>
    </div>
  );
};
export default UserMostPlayedBeatmaps;

