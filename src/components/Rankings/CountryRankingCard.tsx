import React from 'react';
import { useTranslation } from 'react-i18next';
import RankBadge from '../UI/RankBadge';
import LazyFlag from '../UI/LazyFlag';
import { GAME_MODE_COLORS } from '../../types';
import type { CountryRanking, GameMode } from '../../types';
import { getCountryName } from '../../utils/countryName';

interface Props {
  ranking: CountryRanking;
  rank: number;
  selectedMode: GameMode;
}

const CountryRankingCard: React.FC<Props> = ({ ranking, rank, selectedMode }) => {
  const { t } = useTranslation();
  const isTopThree = rank <= 3;
  const countryName = getCountryName(t, ranking.code, ranking.name);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(140deg,rgba(19,24,58,0.9),rgba(11,15,37,0.84))] shadow-[0_12px_34px_rgba(0,0,0,0.28)] transition-all duration-300 hover:border-white/20 hover:shadow-[0_18px_44px_rgba(0,0,0,0.36)]">
      <div className="absolute inset-0 bg-gradient-to-r from-white/6 via-transparent to-transparent opacity-70" />
      {isTopThree && (
        <div className="absolute inset-0 bg-gradient-to-r from-amber-300/15 via-orange-300/10 to-transparent" />
      )}

      <div className="relative flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 sm:py-4">
        <div className="flex-shrink-0">
          <RankBadge rank={rank} size="sm" />
        </div>

        <div className="flex-shrink-0">
          <LazyFlag
            src={`/image/flag/${ranking.code.toLowerCase()}.svg`}
            alt={ranking.code}
            className="w-10 h-7 rounded-md border border-white/20"
            title={countryName}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm sm:text-base text-white truncate">{countryName}</div>
          <div className="text-[11px] sm:text-xs text-white/65 mt-0.5">
            <span>{ranking.active_users.toLocaleString()} {t('rankings.countryCard.activeUsers')} • {ranking.play_count.toLocaleString()} {t('rankings.countryCard.playCount')}</span>
          </div>
        </div>

        <div className="flex flex-col gap-1 text-right flex-shrink-0">
          <div className="text-[11px] sm:text-xs text-white/65">
            <div className="whitespace-nowrap">
              {t('common.score')}: {ranking.ranked_score.toLocaleString()}
            </div>
          </div>

          <div className="text-base sm:text-[1.65rem] font-bold leading-none" style={{ color: GAME_MODE_COLORS[selectedMode] }}>
            {Math.round(ranking.performance).toLocaleString()}pp
          </div>
        </div>
      </div>
    </div>
  );
};

export default CountryRankingCard;
