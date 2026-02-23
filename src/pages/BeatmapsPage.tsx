import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import GameModeSelector from '../components/UI/GameModeSelector';
import LazyBackgroundImage from '../components/UI/LazyBackgroundImage';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { useProfileColor } from '../contexts/ProfileColorContext';
import type { GameMode } from '../types';
import type { SearchBeatmapsetsResponse } from '../types/beatmap';
import { beatmapAPI } from '../utils/api';
import { formatNumber } from '../utils/format';

const modeToInt = (mode: GameMode): number => {
  if (mode === 'osu') return 0;
  if (mode === 'taiko') return 1;
  if (mode === 'fruits' || mode === 'fruitsrx') return 2;
  if (mode === 'mania') return 3;
  return 0;
};

const statusOptions = ['any', 'ranked', 'approved', 'qualified', 'loved', 'pending', 'wip', 'graveyard'] as const;

const BeatmapsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profileColor } = useProfileColor();

  const [selectedMode, setSelectedMode] = useState<GameMode>('osu');
  const [searchQuery, setSearchQuery] = useState('');
  const [status, setStatus] = useState<string>('any');
  const [isLocalOnly, setIsLocalOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SearchBeatmapsetsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchBeatmaps = useCallback(async (q: string, mode: GameMode, s: string, local: boolean) => {
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
        is_local: local,
      });

      if (!abortController.signal.aborted) {
        setData(response);
      }
    } catch (err) {
      if (!abortController.signal.aborted) {
        console.error('Failed to fetch beatmaps:', err);
        setError(t('beatmap.error') || 'Failed to load beatmaps');
      }
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
  }, [t]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBeatmaps(searchQuery, selectedMode, status, isLocalOnly);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedMode, status, isLocalOnly, fetchBeatmaps]);

  return (
    <div className="min-h-screen torii-page-stage">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">{t('nav.beatmaps')}</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {t('beatmap.listingDescription') || 'Find your favorite beatmaps'}
          </p>
        </div>

        <div className="mb-8 bg-card border-card rounded-2xl p-4 md:p-5 shadow-sm">
          <div className="relative mb-4">
            <input
              type="text"
              placeholder={t('beatmap.searchPlaceholder') || 'Search beatmaps...'}
              className="w-full bg-card border-card rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500/60 focus:border-pink-400/30 outline-none transition-all duration-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="bg-black/10 dark:bg-white/5 rounded-xl p-1.5 border border-white/10">
                <GameModeSelector selectedMode={selectedMode} onModeChange={setSelectedMode} variant="compact" />
              </div>

              <button
                type="button"
                className={`relative inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold border transition-all duration-200 active:scale-[0.98] ${
                  isLocalOnly
                    ? 'bg-blue-500/20 border-blue-400/40 text-blue-100 shadow-[0_0_0_2px_rgba(59,130,246,0.15)]'
                    : 'bg-slate-700/30 border-white/10 text-slate-200 hover:border-white/25'
                }`}
                onClick={() => setIsLocalOnly((prev) => !prev)}
              >
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${isLocalOnly ? 'bg-blue-300 animate-pulse' : 'bg-slate-400'}`} />
                {t('beatmap.customMaps') || 'Custom Maps'}
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {statusOptions.map((option) => {
                const active = status === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setStatus(option)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide border transition-all duration-200 ${
                      active
                        ? 'text-white border-transparent shadow-sm'
                        : 'text-slate-400 border-white/10 hover:border-white/25 hover:text-slate-200'
                    }`}
                    style={active ? { backgroundColor: profileColor } : undefined}
                  >
                    {t(`beatmap.status.${option}`) || option}
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
          <div className="text-center py-20 text-red-500">{error}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {data?.beatmapsets.map((set) => (
              <div
                key={set.id}
                className="group relative bg-card rounded-2xl overflow-hidden border-card hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
                onClick={() => navigate(`/beatmapsets/${set.id}`)}
              >
                <LazyBackgroundImage src={set.covers?.card || '/default.jpg'} className="h-32 w-full object-cover">
                  <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                      set.status === 'ranked' ? 'bg-green-500 text-white' :
                      set.status === 'approved' ? 'bg-blue-500 text-white' :
                      set.status === 'qualified' ? 'bg-purple-500 text-white' :
                      set.status === 'loved' ? 'bg-pink-500 text-white' :
                      'bg-gray-500 text-white'
                    }`}>
                      {t(`beatmap.status.${set.status}`) || set.status}
                    </span>
                    {set.is_local && (
                      <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-600 text-white shadow-lg backdrop-blur-sm bg-opacity-90">
                        {t('beatmap.uploaded') || 'Uploaded'}
                      </span>
                    )}
                  </div>
                </LazyBackgroundImage>

                <div className="p-4 bg-card">
                  <h3 className="text-gray-900 dark:text-white font-bold truncate leading-tight group-hover:text-pink-500 transition-colors">
                    {set.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm truncate mb-2">{set.artist}</p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <div className="text-xs text-gray-500 dark:text-gray-500">
                      {t('beatmap.mappedBy') || 'mapped by'}:{' '}
                      <span className="text-gray-700 dark:text-gray-300 font-medium">{set.creator}</span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1">
                      <span className="opacity-70">▶</span> {formatNumber(set.play_count)}
                    </div>
                  </div>
                </div>

                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-10 pointer-events-none transition-opacity duration-300"
                  style={{ backgroundColor: profileColor }}
                />
              </div>
            ))}

            {data?.beatmapsets.length === 0 && (
              <div className="col-span-full text-center py-20 text-gray-500">
                {t('beatmap.noResults') || 'No beatmaps found'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BeatmapsPage;
