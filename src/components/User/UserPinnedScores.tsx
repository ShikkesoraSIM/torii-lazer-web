import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { userAPI, scoreAPI } from '../../utils/api';
import type { BestScore, GameMode, User } from '../../types';
import { useProfileColor } from '../../contexts/ProfileColorContext';
import { hexToRgb, shiftHue  } from '../../utils/color';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../UI/LoadingSpinner';
import LazyBackgroundImage from '../UI/LazyBackgroundImage';
import BeatmapLink from '../UI/BeatmapLink';
import ScoreActionsMenu from '../Score/ScoreActionsMenu';
import ScoreModsDisplay from './ScoreModsDisplay';
import ClientVersionDisplay from './ClientVersionDisplay';
import type { ScoreClientDisplayMode } from '../../utils/clientVersion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import toast from 'react-hot-toast';

interface UserPinnedScoresProps {
  userId: number;
  selectedMode: GameMode;
  user?: User;
  clientDisplayMode?: ScoreClientDisplayMode;
  className?: string;
  refreshRef?: React.MutableRefObject<(() => void) | null>;
  onPinActionRef?: React.MutableRefObject<{
    handlePin: (score: BestScore) => void;
    handleUnpin: (scoreId: number) => void;
  } | null>;
  bestScoresActionRef?: React.MutableRefObject<{
    updatePinStatus: (scoreId: number, isPinned: boolean) => void;
  } | null>; // notify the best-scores list to update pin status
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
    XH: '/image/grades/SS-Silver.svg',
    X:  '/image/grades/SS.svg',
    SH: '/image/grades/S-Silver.svg',
    S:  '/image/grades/S.svg',
    A:  '/image/grades/A.svg',
    B:  '/image/grades/B.svg',
    C:  '/image/grades/C.svg',
    D:  '/image/grades/D.svg',
    F:  '/image/grades/F.svg', 
  };

  return rankImageMap[rank] || rankImageMap['F'];
};

// Draggable score-card component
const SortableScoreCard: React.FC<{
  score: BestScore;
  t: any;
  profileColor: string;
  clientDisplayMode?: ScoreClientDisplayMode;
  canEdit?: boolean;
  onPinChange?: (scoreId: number, isPinned: boolean) => void;
}> = ({ score, t, profileColor, clientDisplayMode = 'icon', canEdit, onPinChange }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: score.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ScoreCard
        score={score}
        t={t}
        profileColor={profileColor}
        clientDisplayMode={clientDisplayMode}
        canEdit={canEdit}
        onPinChange={onPinChange}
        dragHandleProps={canEdit ? { ...attributes, ...listeners } : undefined}
      />
    </div>
  );
};

// Single score-card component
const ScoreCard: React.FC<{
  score: BestScore;
  t: any; 
  profileColor: string;
  clientDisplayMode?: ScoreClientDisplayMode;
  canEdit?: boolean;
  onPinChange?: (scoreId: number, isPinned: boolean) => void;
  dragHandleProps?: any;
  className?: string;
}> = ({ score, t, profileColor, clientDisplayMode = 'icon', canEdit = false, onPinChange, dragHandleProps, className = '' }) => {
  const rank = score.rank;
  const title = score.beatmapset?.title_unicode || score.beatmapset?.title || 'Unknown Title';
  const artist = score.beatmapset?.artist_unicode || score.beatmapset?.artist || 'Unknown Artist';
  const version = score.beatmap?.version || 'Unknown';
  const endedAt = formatTimeAgo(score.ended_at, t);
  const accuracy = (score.accuracy * 100).toFixed(2);
  const originalPp = Math.round(score.pp || 0);
  const mods = score.mods || [];
  const isPinned = score.current_user_attributes?.pin?.is_pinned || false;
  const hasReplay = score.has_replay || false;

  const beatmapUrl =
    score.beatmap?.url ||
    (score.beatmapset?.id
      ? `/beatmapsets/${score.beatmapset.id}${score.beatmap?.id ? `#osu/${score.beatmap.id}` : ''}`
      : '#');
  const coverImage = score.beatmapset?.covers?.['cover@2x'] || score.beatmapset?.covers?.cover;



  const themeRgb = hexToRgb(profileColor);

  return (
    <LazyBackgroundImage 
      src={coverImage}
      className={`relative overflow-hidden rounded-lg border border-gray-200/70 dark:border-gray-600/40 bg-card ${className}`}
    >
      {/* Cover scrim: dark base for legibility on the left, fading right so the
          cover art still reads. Tinted with this section's accent. Plain
          gradients so it stays clean in perf-mode. */}
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
          <div className="flex items-center h-12 pl-5 pr-24">
            <div className="flex-shrink-0 mr-3 flex items-center gap-2">
              {/* Drag handle */}
              {canEdit && dragHandleProps && (
                <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing p-1">
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"></path>
                  </svg>
                </div>
              )}
              <img 
                src={getRankIcon(rank)} 
                alt={rank}
                className="w-14 h-10 object-contain"
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-col -space-y-0.5">
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

            <div className="flex-shrink-0 flex items-center gap-2 mr-6">
              <ScoreModsDisplay mods={mods} />
              <div className="text-sm font-bold text-cyan-600 dark:text-cyan-300 ml-2 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)] dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                {accuracy}%
              </div>
            </div>
          </div>

          <div className="absolute right-0 top-0 h-full flex items-center justify-center gap-2 pr-2">
            <div className="text-sm font-bold torii-pp-gradient drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)] dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              {originalPp} PP
            </div>
            {canEdit && (
              <ScoreActionsMenu
                scoreId={score.id}
                isPinned={isPinned}
                hasReplay={hasReplay}
                onPinChange={onPinChange}
              />
            )}
          </div>
        </div>

        {/* Mobile layout */}
        <div className="block sm:hidden p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 flex items-center gap-2">
              {/* Drag handle */}
              {canEdit && dragHandleProps && (
                <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing p-1">
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"></path>
                  </svg>
                </div>
              )}
              <img 
                src={getRankIcon(rank)} 
                alt={rank}
                className="w-12 h-8 object-contain"
              />
            </div>

            <div className="flex-1 min-w-0">
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
                  {canEdit && (
                    <ScoreActionsMenu
                      scoreId={score.id}
                      isPinned={isPinned}
                      hasReplay={hasReplay}
                      onPinChange={onPinChange}
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

const UserPinnedScores: React.FC<UserPinnedScoresProps> = ({
  userId,
  selectedMode,
  clientDisplayMode = 'icon',
  className = '',
  refreshRef,
  onPinActionRef,
  bestScoresActionRef,
}) => {
  const { t } = useTranslation();
  const { profileColor: baseProfileColor } = useProfileColor();
  // Adjacent hue so Pinned reads as distinct from Best / Most Played.
  const profileColor = shiftHue(baseProfileColor, -38);
  const { user: currentUser } = useAuth();
  const [scores, setScores] = useState<BestScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const canEdit = currentUser?.id === userId;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Local cache key
  const getCacheKey = useCallback(() => `pinned_scores_${userId}_${selectedMode}`, [userId, selectedMode]);

  // Load from local cache
  const loadFromCache = useCallback((): BestScore[] | null => {
    try {
      const cached = localStorage.getItem(getCacheKey());
      if (cached) {
        const parsed = JSON.parse(cached);
        // Valid for 30 minutes (the server caches too)
        if (parsed.timestamp && Date.now() - parsed.timestamp < 30 * 60 * 1000) {
          return parsed.scores;
        }
      }
    } catch (e) {
      console.error('Failed to load from cache:', e);
    }
    return null;
  }, [getCacheKey]);

  // Save to local cache
  const saveToCache = useCallback((scores: BestScore[]) => {
    try {
      localStorage.setItem(getCacheKey(), JSON.stringify({
        scores,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.error('Failed to save to cache:', e);
    }
  }, [getCacheKey]);

  const loadScores = async (useCache = true) => {
    try {
      setLoading(true);
      setError(null);

      // Try the cache first
      if (useCache) {
        const cachedScores = loadFromCache();
        if (cachedScores) {
          setScores(cachedScores);
          setLoading(false);
          // Refresh in the background
          const response = await userAPI.getPinnedScores(userId, selectedMode);
          const newScores = Array.isArray(response) ? response : [];
          if (JSON.stringify(newScores) !== JSON.stringify(cachedScores)) {
            setScores(newScores);
            saveToCache(newScores);
          }
          return;
        }
      }

      // Load from the server
      const response = await userAPI.getPinnedScores(userId, selectedMode);
      const newScores = Array.isArray(response) ? response : [];
      setScores(newScores);
      saveToCache(newScores);
    } catch (err) {
      console.error('Failed to load user pinned scores:', err);
      setError(t('profile.pinnedScores.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      loadScores();
    }
  }, [userId, selectedMode]);

  const handleRefresh = () => {
    // Prefer the local cache, then refresh in the background
    loadScores(true);
  };

  // Add a score to the list when pinned
  const handlePinScore = useCallback((score: BestScore) => {
    // Optimistic update: append to the end of the pinned list
    setScores(prevScores => {
      // Skip duplicates
      if (prevScores.some(s => s.id === score.id)) {
        return prevScores;
      }
      const newScores = [...prevScores, score];  // append to the end
      saveToCache(newScores);
      return newScores;
    });
  }, [saveToCache]);

  // Remove a score from the list when unpinned
  const handleUnpinScore = useCallback((scoreId: number) => {
    // Optimistic update: remove from the pinned list immediately
    setScores(prevScores => {
      const newScores = prevScores.filter(s => s.id !== scoreId);
      saveToCache(newScores);
      return newScores;
    });
  }, [saveToCache]);

  // Handle pin-state changes coming from ScoreActionsMenu
  const handlePinChangeFromMenu = useCallback((scoreId: number, isPinned: boolean) => {
    if (isPinned) {
      // Currently pinned, so clicking unpins it
      handleUnpinScore(scoreId);
      // Tell the best-scores list to mark this score as not pinned
      bestScoresActionRef?.current?.updatePinStatus(scoreId, false);
    }
    // Note: the pinned list never shows unpinned scores, so there's nothing to do for the pin case
  }, [handleUnpinScore, bestScoresActionRef]);

  // Expose the refresh function to the parent
  useEffect(() => {
    if (refreshRef) {
      refreshRef.current = handleRefresh;
    }
  }, [refreshRef]);

  // Expose pin/unpin actions to the parent and sibling components
  useEffect(() => {
    if (onPinActionRef) {
      onPinActionRef.current = {
        handlePin: handlePinScore,
        handleUnpin: handleUnpinScore,
      };
    }
  }, [onPinActionRef, handlePinScore, handleUnpinScore]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = scores.findIndex((score) => score.id === active.id);
    const newIndex = scores.findIndex((score) => score.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // 1. Update the UI immediately (optimistic)
    const newScores = arrayMove(scores, oldIndex, newIndex);
    setScores(newScores);

    // 2. Persist to the local cache immediately
    saveToCache(newScores);

    // 3. Show a success toast immediately
    toast.success(t('profile.pinnedScores.reorderSuccess'));

    // 4. Send to the server in the background (don't await, don't roll back)
    try {
      const movedScoreId = active.id as number;

      if (newIndex === 0) {
        // Moved to the first position, use before_score_id
        scoreAPI.reorderPinnedScore(movedScoreId, {
          before_score_id: newScores[1]?.id,
        }).catch(err => {
          console.error('Reorder API failed:', err);
          // Don't roll back on server failure, it may just be a cache issue
        });
      } else {
        // Moved elsewhere, use after_score_id
        scoreAPI.reorderPinnedScore(movedScoreId, {
          after_score_id: newScores[newIndex - 1]?.id,
        }).catch(err => {
          console.error('Reorder API failed:', err);
          // Don't roll back on server failure, it may just be a cache issue
        });
      }
    } catch (error) {
      // Catch synchronous errors
      console.error('Reorder failed:', error);
    }
  };

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 rounded-full" style={{ backgroundColor: profileColor }}></div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {t('profile.pinnedScores.title')}
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
              {t('profile.pinnedScores.title')}
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
            {t('profile.pinnedScores.title')}
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
            ({scores.length})
          </span>
        </div>
      </div>
      
      {scores.length === 0 ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-6 text-sm">
          {t('profile.pinnedScores.empty')}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="flex flex-col gap-1">
            <SortableContext
              items={scores.map(score => score.id)}
              strategy={verticalListSortingStrategy}
            >
              {scores.map((score) => (
                <SortableScoreCard
                  key={score.id} 
                  score={score} 
                  t={t} 
                  profileColor={profileColor}
                  clientDisplayMode={clientDisplayMode}
                  canEdit={canEdit}
                  onPinChange={handlePinChangeFromMenu}
                />
              ))}
            </SortableContext>
          </div>
        </DndContext>
      )}
    </div>
  );
};

export default UserPinnedScores;
