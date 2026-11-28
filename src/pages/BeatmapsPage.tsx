import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import GameModeSelector from '../components/UI/GameModeSelector';
import LazyBackgroundImage from '../components/UI/LazyBackgroundImage';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import EmptyState from '../components/UI/EmptyState';
import type { GameMode } from '../types';
import type { SearchBeatmapsetsResponse } from '../types/beatmap';
import { beatmapAPI } from '../utils/api';
import { formatNumber } from '../utils/format';
import { isAiSet } from '../utils/beatmapFlags';

const modeToInt = (mode: GameMode): number => {
  if (mode === 'taiko' || mode === 'taikorx') return 1;
  if (mode === 'fruits' || mode === 'fruitsrx') return 2;
  if (mode === 'mania') return 3;
  return 0;
};



const statusOptions = ['any', 'ranked', 'approved', 'qualified', 'loved', 'pending', 'wip', 'graveyard'] as const;

const BeatmapsPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryFromUrl = (searchParams.get('q') || '').trim();
  const initialMode = (searchParams.get('m') as GameMode | null) || 'osu';
  const initialStatus = searchParams.get('s') || 'any';
  const initialLocal = searchParams.get('local') === '1';
  const initialAi = searchParams.get('ai') === '1';

  const [selectedMode, setSelectedMode] = useState<GameMode>(initialMode);
  const [searchQuery, setSearchQuery] = useState(queryFromUrl);
  const [status, setStatus] = useState<string>(initialStatus);
  const [isLocalOnly, setIsLocalOnly] = useState(initialLocal);
  const [isAiOnly, setIsAiOnly] = useState(initialAi);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SearchBeatmapsetsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setSearchQuery((prev) => (prev.trim() === queryFromUrl ? prev : queryFromUrl));
  }, [queryFromUrl]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const fetchBeatmaps = useCallback(async (q: string, mode: GameMode, s: string, local: boolean, ai: boolean) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    setError(null);

    try {
      const response = await beatmapAPI.searchBeatmaps({
        q,
        m: modeToInt(mode),
        s: s === 'any' ? 'leaderboard' : s,
        sort: 'relevance_desc',
        is_local: local || undefined,
        ai: ai || undefined,
      });

      if (!abortController.signal.aborted) {
        setData(response);
      }
    } catch (err) {
      if (!abortController.signal.aborted) {
        console.error('Failed to fetch beatmaps:', err);
        setError(t('beatmap.error', { defaultValue: 'Failed to load beatmaps' }));
      }
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
  }, [t]);

  useEffect(() => {
    const nextParams: Record<string, string> = {};
    if (searchQuery.trim()) nextParams.q = searchQuery.trim();
    if (selectedMode !== 'osu') nextParams.m = selectedMode;
    if (status !== 'any') nextParams.s = status;
    if (isLocalOnly) nextParams.local = '1';
    if (isAiOnly) nextParams.ai = '1';
    setSearchParams(nextParams, { replace: true });

    const timer = setTimeout(() => {
      void fetchBeatmaps(searchQuery, selectedMode, status, isLocalOnly, isAiOnly);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedMode, status, isLocalOnly, isAiOnly, fetchBeatmaps, setSearchParams]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedMode('osu');
    setStatus('any');
    setIsLocalOnly(false);
    setIsAiOnly(false);
  };

  return (
    <div className="min-h-screen torii-page-stage">
      <div className="max-w-7xl 3xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6">
          <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary mb-1.5">{t('nav.beatmaps')}</h1>
          <p className="text-sm sm:text-base text-text-secondary">
            {t('beatmap.listingDescription', { defaultValue: 'Find your favorite beatmaps' })}
          </p>
        </div>

        <div className="relative overflow-hidden mb-8 bg-card border border-border-color rounded-2xl p-4 md:p-5 shadow-elev-1">
          {loading && data && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-torii animate-pulse" aria-hidden="true" />
          )}
          <div className="relative mb-4">
            <input
              type="text"
              aria-label={t('beatmap.searchPlaceholder', { defaultValue: 'Search beatmaps' })}
              placeholder={t('beatmap.searchPlaceholder', { defaultValue: 'Search beatmaps...' })}
              className="form-input rounded-xl px-4 py-3 placeholder:text-text-muted"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="bg-btn-bg rounded-xl p-1.5 border border-border-color">
                <GameModeSelector selectedMode={selectedMode} onModeChange={setSelectedMode} variant="compact" />
              </div>

              <button
                type="button"
                aria-pressed={isLocalOnly}
                className={`relative inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold border transition-all duration-150 active:scale-[0.98] ${
                  isLocalOnly
                    ? 'bg-red-500/20 border-red-400/50 text-red-700 dark:text-red-100 shadow-[0_0_0_2px_rgba(239,68,68,0.15)]'
                    : 'bg-btn-bg border-border-color text-text-secondary hover:border-border-hover hover:text-text-primary'
                }`}
                onClick={() => setIsLocalOnly((prev) => !prev)}
              >
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${isLocalOnly ? 'bg-red-500 dark:bg-red-300' : 'bg-slate-400'}`} />
                {t('beatmap.customMaps', { defaultValue: 'Custom Maps' })}
              </button>

              <button
                type="button"
                aria-pressed={isAiOnly}
                className={`relative inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold border transition-all duration-150 active:scale-[0.98] ${
                  isAiOnly
                    ? 'bg-sky-500/20 border-sky-400/50 text-sky-700 dark:text-sky-100 shadow-[0_0_0_2px_rgba(56,189,248,0.15)]'
                    : 'bg-btn-bg border-border-color text-text-secondary hover:border-border-hover hover:text-text-primary'
                }`}
                onClick={() => setIsAiOnly((prev) => !prev)}
              >
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${isAiOnly ? 'bg-sky-500 dark:bg-sky-300' : 'bg-slate-400'}`} />
                {t('beatmap.aiGenerated', { defaultValue: 'AI generated' })}
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {statusOptions.map((option) => {
                const active = status === option;
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setStatus(option)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wide border transition-all duration-150 ${
                      active
                        ? 'bg-torii text-white border-torii shadow-elev-1'
                        : 'text-text-secondary border-border-color bg-btn-bg hover:border-border-hover hover:text-text-primary'
                    }`}
                  >
                    {t(`beatmap.status.${option}`, { defaultValue: option })}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {loading && !data ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <EmptyState
            tone="error"
            title={error}
            retryLabel={t('common.retry', { defaultValue: 'Retry' })}
            onRetry={() => void fetchBeatmaps(searchQuery, selectedMode, status, isLocalOnly, isAiOnly)}
          />
        ) : data?.beatmapsets.length === 0 ? (
          <EmptyState
            title={t('beatmap.noResults', { defaultValue: 'No beatmaps found' })}
            description={t('beatmap.tryAdjustingFilters', { defaultValue: 'Try clearing or adjusting your active filters.' })}
            action={
              (searchQuery || status !== 'any' || isLocalOnly || isAiOnly || selectedMode !== 'osu') ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-4 py-2 rounded-xl border border-border-color bg-btn-bg text-sm font-medium text-text-primary hover:bg-btn-bg-hover transition-colors"
                >
                  {t('common.resetFilters', { defaultValue: 'Reset filters' })}
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 transition-opacity duration-150 ${loading ? 'opacity-60' : 'opacity-100'}`}>
            {data?.beatmapsets.map((set) => (
              <article
                key={set.id}
                className="group relative bg-card rounded-2xl overflow-hidden border border-border-color hover:border-torii/50 hover:shadow-elev-2 transition-all duration-200 hover:-translate-y-0.5"
              >
                <Link
                  to={`/beatmapsets/${set.id}`}
                  aria-label={`${set.title} by ${set.artist}`}
                  className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-torii rounded-2xl"
                >
                  <LazyBackgroundImage src={set.covers?.card || '/default.jpg'} className="h-32 w-full object-cover">
                    <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
                      <span className={`px-2 py-1 rounded text-3xs font-bold uppercase tracking-wider ${
                        set.status === 'ranked' ? 'bg-green-500 text-white' :
                        set.status === 'approved' ? 'bg-blue-500 text-white' :
                        set.status === 'qualified' ? 'bg-purple-500 text-white' :
                        set.status === 'loved' ? 'bg-pink-500 text-white' :
                        'bg-slate-600 text-white'
                      }`}>
                        {t(`beatmap.status.${set.status}`, { defaultValue: set.status })}
                      </span>
                      {set.is_local && (
                        <span className="px-2 py-1 rounded text-3xs font-bold uppercase tracking-wider bg-red-600/95 text-white shadow-md">
                          {t('beatmap.toriiBadge', { defaultValue: 'Torii' })}
                        </span>
                      )}
                      {isAiSet(set) && (
                        <span className="px-2 py-1 rounded text-3xs font-bold uppercase tracking-wider bg-sky-500/95 text-white shadow-md">
                          {t('beatmap.aiGenBadge', { defaultValue: 'AI gen' })}
                        </span>
                      )}
                    </div>
                  </LazyBackgroundImage>

                  <div className="p-4">
                    <h3 className="text-text-primary font-bold truncate leading-tight group-hover:text-torii transition-colors">
                      {set.title}
                    </h3>
                    <p className="text-text-secondary text-sm truncate mb-2">{set.artist}</p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-color">
                      <div className="text-xs text-text-muted truncate pr-2">
                        {t('beatmap.mappedBy', { defaultValue: 'mapped by' })}:{' '}
                        <span className="text-text-secondary font-medium">{set.creator}</span>
                      </div>
                      <div className="text-xs text-text-muted flex items-center gap-1 flex-shrink-0 tabular-nums">
                        <span className="opacity-70" aria-hidden="true">▶</span> {formatNumber(set.play_count)}
                      </div>
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BeatmapsPage;
