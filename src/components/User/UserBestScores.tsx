import React, { useState, useEffect, useCallback } from 'react';
import { hexToRgb } from '../../utils/color';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { userAPI } from '../../utils/api';
import type { BestScore, GameMode, User } from '../../types';
import { useProfileColor } from '../../contexts/ProfileColorContext';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../UI/LoadingSpinner';
import LazyBackgroundImage from '../UI/LazyBackgroundImage';
import BeatmapLink from '../UI/BeatmapLink';
import ScoreActionsMenu from '../Score/ScoreActionsMenu';
import ScoreModsDisplay from './ScoreModsDisplay';
import ClientVersionDisplay from './ClientVersionDisplay';
import type { ScoreClientDisplayMode } from '../../utils/clientVersion';

interface UserBestScoresProps {
  userId: number;
  selectedMode: GameMode;
  user?: User;
  clientDisplayMode?: ScoreClientDisplayMode;
  className?: string;
  refreshRef?: React.MutableRefObject<(() => void) | null>;
  onPinnedListRefresh?: () => void;
  pinActionRef?: React.MutableRefObject<{
    handlePin: (score: BestScore) => void;
    handleUnpin: (scoreId: number) => void;
  } | null>;
  bestScoresActionRef?: React.MutableRefObject<{
    updatePinStatus: (scoreId: number, isPinned: boolean) => void;
  } | null>;
  initialScores?: BestScore[] | null;
  initialScoresKey?: string | null;
}

const formatTimeAgo = (dateString: string, t: any): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return t('profile.activities.timeAgo.justNow');
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return t('profile.activities.timeAgo.minutesAgo', { count: minutes });
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return t('profile.activities.timeAgo.hoursAgo', { count: hours });
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return t('profile.activities.timeAgo.daysAgo', { count: days });
  } else if (diffInSeconds < 31536000) {
    const months = Math.floor(diffInSeconds / 2592000);
    return t('profile.activities.timeAgo.monthsAgo', { count: months });
  } else {
    const years = Math.floor(diffInSeconds / 31536000);
    return t('profile.activities.timeAgo.yearsAgo', { count: years });
  }
};

// Rank-to-icon mapping
const getRankIcon = (rank: string) => {
  const rankImageMap: Record<string, string> = {
    // SS tier
    XH: '/image/grades/SS-Silver.svg', // silver SS (SSH)
    X:  '/image/grades/SS.svg',        // gold SS

    // S tier
    SH: '/image/grades/S-Silver.svg',  // silver S
    S:  '/image/grades/S.svg',         // gold S

    // Other tiers
    A:  '/image/grades/A.svg',
    B:  '/image/grades/B.svg',
    C:  '/image/grades/C.svg',
    D:  '/image/grades/D.svg',
    F:  '/image/grades/F.svg', 
  };

  return rankImageMap[rank] || rankImageMap['F'];
};


// Single score-card component, based on the official osu! design
const ScoreCard: React.FC<{
  score: BestScore;
  t: any; 
  profileColor: string;
  clientDisplayMode?: ScoreClientDisplayMode;
  canEdit?: boolean;
  onPinChange?: (scoreId: number, isPinned: boolean) => void;
  onPinnedListChange?: () => void;
  className?: string;
}> = ({ score, t, profileColor, clientDisplayMode = 'icon', canEdit = false, onPinChange, onPinnedListChange, className = '' }) => {
  // Required fields
  const rank = score.rank; // grade badge (S/A/B/C/D/F)
  const title = score.beatmapset?.title_unicode || score.beatmapset?.title || 'Unknown Title';
  const artist = score.beatmapset?.artist_unicode || score.beatmapset?.artist || 'Unknown Artist';
  const version = score.beatmap?.version || 'Unknown'; // difficulty name
  const endedAt = formatTimeAgo(score.ended_at, t); // relative time
  const accuracy = (score.accuracy * 100).toFixed(2); // accuracy (percentage)
  const originalPp = Math.round(score.pp || 0); // raw pp
  const mods = score.mods || []; // mod list
  const isPinned = score.current_user_attributes?.pin?.is_pinned || false; // whether pinned
  const hasReplay = score.has_replay || false; // whether a replay exists

  const beatmapUrl =
    score.beatmap?.url ||
    (score.beatmapset?.id
      ? `/beatmapsets/${score.beatmapset.id}${score.beatmap?.id ? `#osu/${score.beatmap.id}` : ''}`
      : '#');
  const coverImage = score.beatmapset?.covers?.['cover@2x'] || score.beatmapset?.covers?.cover;

  // Convert the theme color to RGB so we can apply opacity


  const themeRgb = hexToRgb(profileColor);

  return (
    <LazyBackgroundImage 
      src={coverImage}
      className={`relative overflow-hidden rounded-lg border border-gray-200/70 dark:border-gray-600/40 bg-card ${className}`}
    >
      {/* Cover scrim: dark on the left for text legibility, fading right so the
          cover art still reads as a subtle texture instead of a muddy wash.
          Lightly tinted with the user's profile colour. Plain gradients, so it
          stays clean in perf-mode (no backdrop blur involved). */}
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(90deg, rgba(9,11,24,0.94) 0%, rgba(9,11,24,0.82) 46%, rgba(9,11,24,0.42) 100%)` }}
      />
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(90deg, rgba(${themeRgb}, 0.22) 0%, rgba(${themeRgb}, 0.06) 45%, transparent 80%)` }}
      />
      
      <div className="relative bg-transparent hover:bg-white/20 dark:hover:bg-gray-800/20 transition-colors duration-150 group">
        {/* Desktop layout */}
        <div className="hidden sm:block">
          {/* Main content area */}
          <div className="flex items-center h-12 pl-5 pr-24">
            {/* Grade badge */}
            <div className="flex-shrink-0 mr-3">
              <img
                src={getRankIcon(rank)}
                alt={rank}
                className="w-14 h-10 object-contain"
              />
            </div>

            {/* Beatmap info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col -space-y-0.5">
                {/* Title and artist */}
                <div className="flex items-baseline gap-1 text-sm leading-tight">
                  <BeatmapLink
                    beatmapUrl={beatmapUrl}
                    className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate transition-colors"
                    title={title}
                  >
                    {title}
                  </BeatmapLink>
                  <span className="text-gray-600 dark:text-gray-400 text-xs flex-shrink-0">
                    {t('profile.bestScores.by')}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400 text-xs truncate">
                    {artist}
                  </span>
                </div>
                
                {/* Difficulty name and time */}
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                    {version}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    {endedAt}
                  </span>
                  <ClientVersionDisplay
                    clientVersion={score.client_version}
                    mode={clientDisplayMode}
                    className="text-gray-500 dark:text-gray-400 truncate max-w-[220px]"
                  />
                  <Link
                    to={`/scores/${score.id}`}
                    className="text-osu-pink hover:text-osu-pink/80 transition-colors font-medium"
                  >
                    View score
                  </Link>
                </div>
              </div>
            </div>

            {/* Score data in the middle */}
            <div className="flex-shrink-0 flex items-center gap-2 mr-6">
              {/* Mod icons + accuracy */}
              <ScoreModsDisplay mods={mods} />
              <div className="text-sm font-bold text-cyan-600 dark:text-cyan-300 ml-2 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)] dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                {accuracy}%
              </div>
            </div>
          </div>

          {/* Performance area on the right */}
          <div className="absolute right-0 top-0 h-full flex items-center justify-center gap-2 pr-2">
            {/* PP value */}
            <div className="text-sm font-bold torii-pp-gradient drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)] dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              {originalPp} PP
            </div>
            {/* Actions menu */}
            {canEdit && (
              <ScoreActionsMenu
                scoreId={score.id}
                isPinned={isPinned}
                hasReplay={hasReplay}
                onPinChange={onPinChange}
                onPinnedListChange={onPinnedListChange}
              />
            )}
          </div>
        </div>

        {/* Mobile layout */}
        <div className="block sm:hidden p-4">
          <div className="flex items-start gap-3">
            {/* Grade badge */}
            <div className="flex-shrink-0">
              <img
                src={getRankIcon(rank)}
                alt={rank}
                className="w-12 h-8 object-contain"
              />
            </div>

            {/* Main content */}
            <div className="flex-1 min-w-0">
              {/* Row 1: title and artist */}
              <div className="flex items-baseline gap-1 text-sm leading-tight mb-1">
                <BeatmapLink
                  beatmapUrl={beatmapUrl}
                  className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate transition-colors"
                  title={title}
                >
                  {title}
                </BeatmapLink>
                <span className="text-gray-600 dark:text-gray-400 text-xs flex-shrink-0">
                  {t('profile.bestScores.by')}
                </span>
                <span className="text-gray-600 dark:text-gray-400 text-xs truncate">
                  {artist}
                </span>
              </div>
              
              {/* Row 2: difficulty name and time */}
              <div className="flex items-center gap-3 text-xs mb-2">
                <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                  {version}
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  {endedAt}
                </span>
                <ClientVersionDisplay
                  clientVersion={score.client_version}
                  mode={clientDisplayMode}
                  className="text-gray-500 dark:text-gray-400 truncate max-w-[160px]"
                />
                <Link
                  to={`/scores/${score.id}`}
                  className="text-osu-pink hover:text-osu-pink/80 transition-colors font-medium"
                >
                  View score
                </Link>
              </div>

              {/* Row 3: mods, accuracy and PP */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ScoreModsDisplay mods={mods} />
                  <div className="text-sm font-bold text-cyan-600 dark:text-cyan-300 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)] dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                    {accuracy}%
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-bold torii-pp-gradient drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)] dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                    {originalPp} PP
                  </div>
                  {/* Actions menu */}
                  {canEdit && (
                    <ScoreActionsMenu
                      scoreId={score.id}
                      isPinned={isPinned}
                      hasReplay={hasReplay}
                      onPinChange={onPinChange}
                      onPinnedListChange={onPinnedListChange}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LazyBackgroundImage>
  );
};

const UserBestScores: React.FC<UserBestScoresProps> = ({
  userId,
  selectedMode,
  user,
  clientDisplayMode = 'icon',
  className = '',
  refreshRef,
  onPinnedListRefresh,
  pinActionRef,
  bestScoresActionRef,
  initialScores,
  initialScoresKey,
}) => {
  const { t } = useTranslation();
  const { profileColor } = useProfileColor();
  const { user: currentUser } = useAuth();
  const [scores, setScores] = useState<BestScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);

  const canEdit = currentUser?.id === userId;
  const currentScoresKey = `${userId}:${selectedMode}`;
  const cacheKey = `best_scores_${userId}_${selectedMode}`;

  const loadFromCache = useCallback((): BestScore[] | null => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;

      const parsed = JSON.parse(cached) as { scores?: BestScore[]; timestamp?: number };
      if (!Array.isArray(parsed.scores) || !parsed.timestamp) return null;
      if (Date.now() - parsed.timestamp > 5 * 60 * 1000) return null;

      return parsed.scores;
    } catch (e) {
      console.error('Failed to load best scores from cache:', e);
      return null;
    }
  }, [cacheKey]);

  const saveToCache = useCallback((nextScores: BestScore[]) => {
    try {
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          scores: nextScores,
          timestamp: Date.now(),
        }),
      );
    } catch (e) {
      console.error('Failed to save best scores to cache:', e);
    }
  }, [cacheKey]);

  const loadScores = useCallback(async (reset = false, silentRefresh = false) => {
    try {
      const currentOffset = reset ? 0 : offset;

      if (reset) {
        if (!silentRefresh) {
          setLoading(true);
        }
        if (!silentRefresh) {
          setError(null);
        }
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }

      const response = await userAPI.getBestScores(userId, selectedMode, 6, currentOffset);
      const newScores = Array.isArray(response) ? response : [];

      let hasMoreData: boolean;

      if (reset) {
        hasMoreData = newScores.length === 6;
        setScores(newScores);
        setOffset(newScores.length);
        saveToCache(newScores);
      } else {
        const totalScores = user?.scores_best_count || 0;
        const currentTotal = scores.length + newScores.length;
        hasMoreData = newScores.length === 6 && currentTotal < totalScores;
        // CRUCIAL: persist the larger combined list to cache after
        // load-more. Without this, the cache lags behind state at the
        // initial 6 entries — and any re-render that re-runs the mount
        // effect (e.g. parent passing a fresh `initialScores` reference,
        // window-focus refetches) restores from cache and visibly
        // collapses the list back to 6 the moment the user clicks "Show
        // more". Use the functional setScores so we read the latest
        // committed state instead of the closure-captured `scores`.
        setScores(prev => {
          const combined = [...prev, ...newScores];
          saveToCache(combined);
          return combined;
        });
        setOffset(prev => prev + newScores.length);
      }

      setHasMore(hasMoreData);
    } catch (err) {
      console.error('Failed to load user best scores:', err);
      if (!silentRefresh) {
        setError(t('profile.bestScores.loadFailed'));
        setHasMore(false);
      }
    } finally {
      if (!silentRefresh) {
        setLoading(false);
      }
      setLoadingMore(false);
    }
  }, [offset, saveToCache, scores.length, t, selectedMode, user?.scores_best_count, userId]);

  useEffect(() => {
    if (!userId) return;

    setOffset(0);
    setError(null);

    // hasMore needs to be derived from `scores_best_count` rather than
    // the simplistic `length === 6` heuristic. After a load-more chain
    // the cache holds 12 / 18 / 24+ entries; `length === 6` would be
    // false for those and would incorrectly hide the "Show more" button
    // when restoring from cache, even though there are still more pages
    // available on the server.
    const totalAvailable = user?.scores_best_count ?? Number.POSITIVE_INFINITY;

    if (initialScoresKey === currentScoresKey && initialScores) {
      setScores(initialScores);
      setHasMore(initialScores.length < totalAvailable);
      setOffset(initialScores.length);
      saveToCache(initialScores);
      setLoading(false);
      return;
    }

    const cachedScores = loadFromCache();
    if (cachedScores) {
      setScores(cachedScores);
      setHasMore(cachedScores.length < totalAvailable);
      setOffset(cachedScores.length);
      setLoading(false);
      void loadScores(true, true);
      return;
    }

    setScores([]);
    setHasMore(true);
    void loadScores(true);
    // Two intentional omissions from the deps list:
    //
    //   1. loadScores / loadFromCache / saveToCache — those callbacks
    //      are recreated whenever `offset` / `scores.length` change
    //      (they're in loadScores' useCallback deps). Including them
    //      here would make the effect re-fire after every "Show more",
    //      re-read the cache, and clobber the freshly-fetched pages.
    //
    //   2. `initialScores` — the prop is a fresh array reference on
    //      every parent render even when the underlying user/mode
    //      hasn't changed. Including it here was the second half of
    //      the "Show more is broken" bug: a parent re-render → new
    //      reference → effect fires → restore from cache (or
    //      initialScores) → list collapses back to 6. We key the
    //      effect on `initialScoresKey` instead, which is a stable
    //      string identifier of the underlying user/mode pair, so the
    //      effect only fires when the user actually navigated.
    //
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScoresKey, initialScoresKey, userId]);
  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      void loadScores(false);
    }
  };

  const handleRefresh = () => {
    void loadScores(true);
  };

  // Expose the refresh function to the parent
  useEffect(() => {
    if (refreshRef) {
      refreshRef.current = handleRefresh;
    }
  }, [refreshRef]);

  // Update a score's pin status (called by the pinned list)
  const updatePinStatus = (scoreId: number, isPinned: boolean) => {
    setScores(prevScores => {
      const nextScores = prevScores.map(s =>
        s.id === scoreId
          ? {
              ...s,
              current_user_attributes: {
                ...s.current_user_attributes,
                pin: {
                  ...s.current_user_attributes?.pin,
                  is_pinned: isPinned,
                }
              }
            }
          : s
      );
      saveToCache(nextScores);
      return nextScores;
    });
  };

  // Expose updatePinStatus to the pinned list
  useEffect(() => {
    if (bestScoresActionRef) {
      bestScoresActionRef.current = {
        updatePinStatus,
      };
    }
  }, [bestScoresActionRef, updatePinStatus]);

  // Local update after pin/unpin
  const handlePinChange = useCallback((scoreId: number, isPinned: boolean) => {
    // 1. Find the score object
    const score = scores.find(s => s.id === scoreId);

    if (!score) {
      console.error('Score not found:', scoreId);
      return;
    }

    // 2. Build the updated score object
    const updatedScore = {
      ...score,
      current_user_attributes: {
        ...score.current_user_attributes,
        pin: {
          ...score.current_user_attributes?.pin,
          is_pinned: !isPinned,
        }
      }
    };

    // 3. Update local state
    setScores(prevScores => {
      const nextScores = prevScores.map(s => s.id === scoreId ? updatedScore : s);
      saveToCache(nextScores);
      return nextScores;
    });

    // 4. Sync the pinned list (outside the state update)
    if (pinActionRef?.current) {
      if (isPinned) {
        // Unpin
        pinActionRef.current.handleUnpin(scoreId);
      } else {
        // Pin the score, using the updated score object
        pinActionRef.current.handlePin(updatedScore);
      }
    }
  }, [scores, pinActionRef]);

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 rounded-full" style={{ backgroundColor: profileColor }}></div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {t('profile.bestScores.title')}
            </h3>
          </div>
        </div>
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 rounded-full" style={{ backgroundColor: profileColor }}></div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {t('profile.bestScores.title')}
            </h3>
          </div>
        </div>
        <div className="text-center text-red-500 dark:text-red-400 text-sm">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 rounded-full" style={{ backgroundColor: profileColor }}></div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {t('profile.bestScores.title')}
          </h3>
          {user?.scores_best_count && (
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
              ({user.scores_best_count})
            </span>
          )}
        </div>
      </div>
      
      {scores.length === 0 ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-6 text-sm">
          {t('profile.bestScores.noScores')}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            {scores.map((score) => (
              <ScoreCard
                key={score.id}
                score={score}
                t={t}
                profileColor={profileColor}
                clientDisplayMode={clientDisplayMode}
                canEdit={canEdit}
                onPinChange={handlePinChange}
                onPinnedListChange={onPinnedListRefresh}
              />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center mt-3">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="inline-flex h-9 min-w-[120px] items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white ring-1 ring-white/20 transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
                style={{ background: `linear-gradient(180deg, ${profileColor}, ${profileColor}d4)`, boxShadow: `0 8px 24px -10px ${profileColor}` }}
              >
                {loadingMore ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>{t('profile.bestScores.loading')}</span>
                  </>
                ) : (
                  <span>{t('profile.bestScores.loadMore')}</span>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default UserBestScores;


