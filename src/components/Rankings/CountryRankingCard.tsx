import React from 'react';
import { useTranslation } from 'react-i18next';
import RankBadge from '../UI/RankBadge';
import CountryFlag from '../UI/CountryFlag';
import type { CountryRanking, GameMode } from '../../types';
import { getCountryName } from '../../utils/countryName';

interface Props {
  ranking: CountryRanking;
  rank: number;
  selectedMode: GameMode;
}

const CountryRankingCard: React.FC<Props> = ({ ranking, rank, selectedMode: _selectedMode }) => {
  const { t } = useTranslation();
  const isTopThree = rank <= 3;
  const countryName = getCountryName(t, ranking.code, ranking.name);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border-color bg-card shadow-elev-1 transition-all duration-300 hover:border-border-hover hover:shadow-elev-2">
      <div className="absolute inset-0 bg-gradient-to-r from-white/6 via-transparent to-transparent opacity-70" />
      {isTopThree && (
        <div className="absolute inset-0 bg-gradient-to-r from-torii/15 via-sky-400/10 to-transparent" />
      )}

      <div className="relative flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 sm:py-4">
        <div className="flex-shrink-0">
          <RankBadge rank={rank} size="sm" />
        </div>

        <div className="flex-shrink-0">
          <CountryFlag
            code={ranking.code}
            name={countryName}
            className="h-7 border border-border-color"
            rounded="rounded-md"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm sm:text-base text-text-primary truncate">{countryName}</div>
          <div className="text-[11px] sm:text-xs text-text-secondary mt-0.5 tabular-nums">
            <span>{ranking.active_users.toLocaleString()} {t('rankings.countryCard.activeUsers')} · {ranking.play_count.toLocaleString()} {t('rankings.countryCard.playCount')}</span>
          </div>
        </div>

        <div className="flex flex-col gap-1 text-right flex-shrink-0">
          <div className="text-[11px] sm:text-xs text-text-secondary tabular-nums">
            <div className="whitespace-nowrap">
              {t('common.score')}: {ranking.ranked_score.toLocaleString()}
            </div>
          </div>

          <div className="text-base sm:text-[1.65rem] font-bold leading-none tabular-nums text-torii">
            {Math.round(ranking.performance).toLocaleString()}pp
          </div>
        </div>
      </div>
    </div>
  );
};

export default CountryRankingCard;
