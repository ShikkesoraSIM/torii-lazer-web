// Server-wide Top Plays page.
//
// Displays the highest-PP scores across the entire server, ordered
// PP-descending, paginated 50 at a time. Reuses the existing
// /api/private/top-scores/{ruleset} endpoint (which is open to
// unauthenticated callers despite the "private" prefix — the prefix
// is the server's internal-API namespace, not an auth gate).
//
// Pagination strategy: the backend returns just the array (no `total`
// or `has_more`). We treat an empty page as "past the end" and hide
// the Next button when the most recent page came back with fewer
// than 50 rows. That avoids needing a backend contract change.

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, Link } from 'react-router-dom';
import { rankingsAPI } from '../utils/api';
import GameModeSelector from '../components/UI/GameModeSelector';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import type { GameMode } from '../types';

const PAGE_SIZE = 50;

const ALLOWED_MODES: GameMode[] = [
  'osu', 'taiko', 'fruits', 'mania', 'osurx', 'taikorx', 'fruitsrx',
];

interface TopScoreRow {
  id: number;
  pp: number;
  accuracy: number;
  max_combo: number;
  rank: string;
  ended_at?: string;
  mods?: Array<{ acronym: string }>;
  user?: {
    id: number;
    username: string;
    avatar_url?: string;
    country?: { code: string; name: string };
  };
  beatmap?: {
    id: number;
    version?: string;
    difficulty_rating?: number;
  };
  beatmapset?: {
    id: number;
    title: string;
    artist: string;
    creator?: string;
    covers?: { card?: string; cover?: string; list?: string };
  };
}

const formatAccuracy = (n: number) => `${(n * 100).toFixed(2)}%`;
const formatPp = (n: number) => `${Math.round(n).toLocaleString()}pp`;
const formatMods = (mods?: Array<{ acronym: string }>): string => {
  if (!mods?.length) return '';
  return mods.map((m) => m.acronym).join('');
};

const TopPlaysPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialMode = searchParams.get('mode') as GameMode | null;
  const initialPageRaw = Number(searchParams.get('page'));
  const initialPage =
    Number.isFinite(initialPageRaw) && initialPageRaw > 0 ? Math.floor(initialPageRaw) : 1;

  const [mode, setMode] = useState<GameMode>(
    initialMode && ALLOWED_MODES.includes(initialMode) ? initialMode : 'osu'
  );
  const [page, setPage] = useState(initialPage);
  const [reloadKey, setReloadKey] = useState(0);
  const [scores, setScores] = useState<TopScoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const scrollToTop = useCallback(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  }, []);

  const sync = useCallback(
    (nextMode: GameMode, nextPage: number) => {
      setSearchParams({ mode: nextMode, page: String(nextPage) }, { replace: true });
    },
    [setSearchParams],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    rankingsAPI
      .getTopPlays(mode, page)
      .then((data) => {
        if (cancelled) return;
        setScores((data as unknown as TopScoreRow[]) || []);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to load top plays:', err);
        setError(t('rankings.errors.loadFailed', { defaultValue: 'Failed to load top plays.' }));
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mode, page, reloadKey, t]);

  const onModeChange = (next: GameMode) => {
    setMode(next);
    setPage(1);
    sync(next, 1);
    scrollToTop();
  };

  const onPrev = () => {
    if (page <= 1) return;
    const next = page - 1;
    setPage(next);
    sync(mode, next);
    scrollToTop();
  };

  const onNext = () => {
    const next = page + 1;
    setPage(next);
    sync(mode, next);
    scrollToTop();
  };

  const hasMore = scores.length === PAGE_SIZE;

  return (
    <div className="min-h-screen torii-page-stage">
      <div className="max-w-7xl 3xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary">
              {t('rankings.topPlays.title', { defaultValue: 'Top Plays' })}
            </h1>
            <p className="text-sm sm:text-base text-text-secondary mt-1.5">
              {t('rankings.topPlays.subtitle', { defaultValue: 'Highest-PP scores across the server, ordered by performance points.' })}
            </p>
          </div>
          <div className="torii-liquid-soft rounded-2xl p-2">
            <GameModeSelector selectedMode={mode} onModeChange={onModeChange} variant="compact" />
          </div>
        </div>

        <div className="torii-liquid rounded-3xl p-3 sm:p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/30 text-red-200 rounded-2xl p-5 flex items-center justify-between gap-3 flex-wrap">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setReloadKey((k) => k + 1)}
                className="torii-btn-primary text-sm"
              >
                {t('common.retry', { defaultValue: 'Retry' })}
              </button>
            </div>
          ) : scores.length === 0 ? (
            <div className="text-center py-16 text-text-muted">
              {t('rankings.topPlays.empty', { defaultValue: 'No scores on this page.' })}
            </div>
          ) : (
            <ul className="space-y-2.5">
              {scores.map((s, idx) => {
                const rankNumber = (page - 1) * PAGE_SIZE + idx + 1;
                const cover = s.beatmapset?.covers?.list || s.beatmapset?.covers?.card;
                const mods = formatMods(s.mods);
                return (
                  <li
                    key={s.id}
                    className="flex flex-wrap sm:flex-nowrap items-center gap-3 p-3 rounded-2xl bg-card border border-white/10 hover:border-torii/45 transition-colors"
                  >
                    <div className="w-9 text-right font-bold text-text-muted tabular-nums flex-shrink-0">
                      #{rankNumber}
                    </div>

                    <Link
                      to={`/beatmapsets/${s.beatmapset?.id ?? ''}#${s.beatmap?.id ?? ''}`}
                      className="flex-shrink-0 w-16 h-12 rounded-xl overflow-hidden bg-white/5"
                    >
                      {cover && (
                        <img
                          src={cover}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      )}
                    </Link>

                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-text-primary truncate">
                        {s.beatmapset?.artist} — {s.beatmapset?.title}
                      </div>
                      <div className="text-xs text-text-muted truncate">
                        [{s.beatmap?.version || '—'}]
                        {s.beatmap?.difficulty_rating != null && (
                          <span className="ml-2">★ {s.beatmap.difficulty_rating.toFixed(2)}</span>
                        )}
                      </div>
                    </div>

                    {s.user && (
                      <Link
                        to={`/users/${s.user.id}`}
                        className="flex items-center gap-2 px-2 py-1 rounded-xl hover:bg-white/5 min-w-0"
                      >
                        {s.user.avatar_url && (
                          <img
                            src={s.user.avatar_url}
                            alt=""
                            className="hidden sm:block w-7 h-7 rounded-full flex-shrink-0"
                            loading="lazy"
                          />
                        )}
                        <span className="text-xs sm:text-sm font-medium text-text-primary truncate max-w-[7rem] sm:max-w-[8rem]">
                          {s.user.username}
                        </span>
                  </Link>
                )}

                {/* Stats */}
                <div className="flex items-center gap-3 text-right">
                  {mods && (
                    <span className="hidden md:inline text-xs font-mono text-torii">
                      +{mods}
                    </span>
                  )}
                  <span className="text-sm tabular-nums text-text-secondary">
                    {formatAccuracy(s.accuracy)}
                  </span>
                  <span className="text-sm font-bold tabular-nums text-torii min-w-[5rem]">
                    {formatPp(s.pp)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
        </div>

      {/* Pagination — only render when there's actually more data to
          show or to walk back to. Hides on a fresh-load empty page. */}
      {!loading && !error && (page > 1 || hasMore) && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onPrev}
            disabled={page <= 1}
            className="torii-btn-glass text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Prev
          </button>
          <span className="text-sm text-text-secondary tabular-nums">
            Page {page}
          </span>
          <button
            type="button"
            onClick={onNext}
            disabled={!hasMore}
            className="torii-btn-glass text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}
      </div>
    </div>
  );
};

export default TopPlaysPage;
