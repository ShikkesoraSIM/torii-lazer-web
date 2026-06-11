import React from "react";
import { useTranslation } from 'react-i18next';

interface Stats {
  hit_accuracy?: number;
  pp?: number;
  ranked_score?: number;
  total_score?: number;
  play_count?: number;
  total_hits?: number;
  maximum_combo?: number;
  replays_watched_by_others?: number;
}

interface StatsCardProps {
  stats?: Stats;
}

const StatsCard: React.FC<StatsCardProps> = ({ stats }) => {
  const { t } = useTranslation();
  // Hits per play = total hits / play count
  const avgHitsPerPlay =
    stats?.play_count && stats?.play_count > 0
      ? Math.round((stats.total_hits ?? 0) / stats.play_count)
      : 0;

  return (
    <div>
      <div className="flex flex-col gap-2 sm:gap-3 md:gap-4 text-xs">
        {/* Ranked score */}
        <div className="flex justify-between items-center">
          <span className="text-white/75">{t('profile.stats.rankedScore')}</span>
          <span className="text-white font-bold">
            {stats?.ranked_score?.toLocaleString() ?? 0}
          </span>
        </div>

        {/* Accuracy */}
        <div className="flex justify-between items-center">
          <span className="text-white/75">{t('profile.stats.accuracy')}</span>
          <span className="text-white font-bold">
            {(stats?.hit_accuracy ?? 0).toFixed(2)}%
          </span>
        </div>

        {/* Play count */}
        <div className="flex justify-between items-center">
          <span className="text-white/75">{t('profile.stats.playCount')}</span>
          <span className="text-white font-bold">
            {stats?.play_count?.toLocaleString() ?? 0}
          </span>
        </div>

        {/* Total score */}
        <div className="flex justify-between items-center">
          <span className="text-white/75">{t('profile.stats.totalScore')}</span>
          <span className="text-white font-bold">
            {stats?.total_score?.toLocaleString() ?? 0}
          </span>
        </div>

        {/* Total hits */}
        <div className="flex justify-between items-center">
          <span className="text-white/75">{t('profile.stats.totalHits')}</span>
          <span className="text-white font-bold">
            {stats?.total_hits?.toLocaleString() ?? 0}
          </span>
        </div>

        {/* Hits per play */}
        <div className="flex justify-between items-center">
          <span className="text-white/75">{t('profile.stats.hitsPerPlay')}</span>
          <span className="text-white font-bold">
            {avgHitsPerPlay.toLocaleString()}
          </span>
        </div>

        {/* Max combo */}
        <div className="flex justify-between items-center">
          <span className="text-white/75">{t('profile.stats.maxCombo')}</span>
          <span className="text-white font-bold">
            {stats?.maximum_combo?.toLocaleString() ?? 0}
          </span>
        </div>

        {/* Replays watched by others */}
        <div className="flex justify-between items-center">
          <span className="text-white/75">{t('profile.stats.replaysWatched')}</span>
          <span className="text-white font-bold">
            {stats?.replays_watched_by_others?.toLocaleString() ?? 0}
          </span>
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
