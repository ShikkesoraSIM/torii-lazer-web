import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { scoreAPI } from '../../utils/api';
import type { Beatmap } from '../../types';
import type { BestScore } from '../../types/scores';

interface BeatmapLeaderboardProps {
  beatmapId: number;
  beatmap?: Beatmap;
  limit?: number;
}

const BeatmapLeaderboard: React.FC<BeatmapLeaderboardProps> = ({ beatmapId, beatmap, limit = 50 }) => {
  const { t } = useTranslation();
  const [scores, setScores] = useState<BestScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchScores = async () => {
      setLoading(true);
      setError(null);
      try {
        const mode = beatmap?.mode || 'osu';
        const data = await scoreAPI.getBeatmapScores(beatmapId, mode, limit);
        setScores(Array.isArray(data.scores) ? data.scores : []);
      } catch (err) {
        console.error('Failed to fetch beatmap scores:', err);
        setError(err instanceof Error ? err.message : 'Failed to load scores');
        setScores([]);
      } finally {
        setLoading(false);
      }
    };

    fetchScores();
  }, [beatmapId, beatmap?.mode, limit]);

  const getRankColor = (rank: string): string => {
    switch (rank) {
      case 'F': return '#FF0000';
      case 'D': return '#FF6B6B';
      case 'C': return '#FFB85C';
      case 'B': return '#FFE181';
      case 'A': return '#A4D65E';
      case 'S': return '#FFDAB9';
      case 'X': return '#FFD700';
      case 'SH': return '#E0E0E0';
      case 'XH': return '#FFD700';
      default: return '#999999';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-osu-pink" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-2">!</div>
          <p className="text-slate-600 dark:text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  if (scores.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-5xl mb-3">-</div>
          <p className="text-slate-600 dark:text-slate-400">
            {t('beatmap.noScores') || 'No scores yet'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-slate-50 dark:bg-slate-700/50">
          <tr className="border-b border-slate-200 dark:border-slate-700">
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">#</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">
              {t('beatmap.player') || 'Player'}
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">
              {t('beatmap.grade') || 'Grade'}
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">PP</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">
              {t('beatmap.accuracy') || 'Accuracy'}
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">
              {t('beatmap.combo') || 'Max Combo'}
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">
              {t('beatmap.mods') || 'Mods'}
            </th>
          </tr>
        </thead>
        <tbody>
          {scores.map((score, index) => (
            <tr
              key={score.id}
              className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <td className="px-4 py-3 text-sm font-bold text-osu-pink">{index + 1}</td>
              <td className="px-4 py-3 text-sm">
                <div className="flex items-center gap-3">
                  <img
                    src={score.user.avatar_url}
                    alt={score.user.username}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{score.user.username}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{score.user.country_code}</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-center">
                <span
                  className="inline-block px-2 py-1 rounded font-bold text-white text-xs"
                  style={{ backgroundColor: getRankColor(score.rank) }}
                >
                  {score.rank}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-bold text-osu-pink">{(score.pp || 0).toFixed(2)}</td>
              <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900 dark:text-white">
                {(score.accuracy * 100).toFixed(2)}%
              </td>
              <td className="px-4 py-3 text-right text-sm text-slate-600 dark:text-slate-400">
                {score.max_combo}
                {beatmap?.max_combo ? `/${beatmap.max_combo}` : ''}
              </td>
              <td className="px-4 py-3 text-center">
                <div className="flex flex-wrap gap-1 justify-center">
                  {score.mods && score.mods.length > 0 ? (
                    score.mods.map((mod, idx) => (
                      <span
                        key={`${score.id}-${idx}`}
                        className="px-2 py-0.5 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded"
                      >
                        {mod.acronym}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500 dark:text-slate-400 text-xs">NM</span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BeatmapLeaderboard;
