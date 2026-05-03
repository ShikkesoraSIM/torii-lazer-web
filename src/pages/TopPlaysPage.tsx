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
  const [scores, setScores] = useState<TopScoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        setError(t('rankings.errors.loadFailed', 'Failed to load top plays.'));
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mode, page, t]);

  const onModeChange = (next: GameMode) => {
    setMode(next);
    setPage(1);
    sync(next, 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onPrev = () => {
    if (page <= 1) return;
    const next = page - 1;
    setPage(next);
    sync(mode, next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onNext = () => {
    const next = page + 1;
    setPage(next);
    sync(mode, next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // The backend doesn't tell us total count — when the current page
  // has fewer than PAGE_SIZE rows we know we're at the end and can
  // hide the Next button. Same heuristic the upstream UI uses.
  const hasMore = scores.length === PAGE_SIZE;

  return (
    <div className="max-w-5xl mx-auto px-3 md:px-6 py-6">
      <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            Top Plays
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Highest-PP scores across the server, ordered by performance points.
          </p>
        </div>
        <GameModeSelector selectedMode={mode} onModeChange={onModeChange} />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/30 text-red-200 rounded-2xl p-5 flex items-center justify-between gap-3">
          <span>{error}</span>
          <button
            onClick={() => setPage(page)}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
          >
            Retry
          </button>
        </div>
      ) : scores.length === 0 ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          No scores on this page.
        </div>
      ) : (
        <ul className="space-y-2">
          {scores.map((s, idx) => {
            const rankNumber = (page - 1) * PAGE_SIZE + idx + 1;
            const cover = s.beatmapset?.covers?.list || s.beatmapset?.covers?.card;
            const mods = formatMods(s.mods);
            return (
              <li
                key={s.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-card hover:border-osu-pink/40 transition-colors"
              >
                <div className="w-10 text-right font-bold text-gray-500 dark:text-gray-400 tabular-nums">
                  #{rankNumber}
                </div>

                {/* Beatmap thumbnail */}
                <Link
                  to={`/beatmapsets/${s.beatmapset?.id ?? ''}#${s.beatmap?.id ?? ''}`}
                  className="flex-shrink-0 w-16 h-12 rounded-md overflow-hidden bg-gray-200 dark:bg-gray-800"
                >
                  {cover && (
                    <img
                      src={cover}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  )}
                </Link>

                {/* Beatmap title + diff */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {s.beatmapset?.artist} — {s.beatmapset?.title}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    [{s.beatmap?.version || '—'}]
                    {s.beatmap?.difficulty_rating != null && (
                      <span className="ml-2">★ {s.beatmap.difficulty_rating.toFixed(2)}</span>
                    )}
                  </div>
                </div>

                {/* User */}
                {s.user && (
                  <Link
                    to={`/users/${s.user.id}`}
                    className="hidden sm:flex items-center gap-2 px-2 py-1 rounded-md hover:bg-white/5"
                  >
                    {s.user.avatar_url && (
                      <img
                        src={s.user.avatar_url}
                        alt={s.user.username}
                        className="w-7 h-7 rounded-full"
                      />
                    )}
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate max-w-[8rem]">
                      {s.user.username}
                    </span>
                  </Link>
                )}

                {/* Stats */}
                <div className="flex items-center gap-3 text-right">
                  {mods && (
                    <span className="hidden md:inline text-xs font-mono text-osu-pink">
                      +{mods}
                    </span>
                  )}
                  <span className="text-sm tabular-nums text-gray-700 dark:text-gray-300">
                    {formatAccuracy(s.accuracy)}
                  </span>
                  <span className="text-sm font-bold tabular-nums text-osu-pink min-w-[5rem]">
                    {formatPp(s.pp)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Pagination — only render when there's actually more data to
          show or to walk back to. Hides on a fresh-load empty page. */}
      {!loading && !error && (page > 1 || hasMore) && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={onPrev}
            disabled={page <= 1}
            className="px-4 py-2 rounded-xl bg-card border border-card disabled:opacity-40 hover:border-osu-pink/40 transition-colors"
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400 tabular-nums">
            Page {page}
          </span>
          <button
            onClick={onNext}
            disabled={!hasMore}
            className="px-4 py-2 rounded-xl bg-card border border-card disabled:opacity-40 hover:border-osu-pink/40 transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

export default TopPlaysPage;
