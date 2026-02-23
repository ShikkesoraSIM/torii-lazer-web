import React from 'react';
import { Link } from 'react-router-dom';
import { Tooltip } from 'react-tooltip';
import { useTranslation } from 'react-i18next';
import RankBadge from '../UI/RankBadge';
import LazyBackgroundImage from '../UI/LazyBackgroundImage';
import LazyAvatar from '../UI/LazyAvatar';
import LazyFlag from '../UI/LazyFlag';
import { GAME_MODE_COLORS } from '../../types';
import type { UserRanking, GameMode, RankingType } from '../../types';

interface Props {
  ranking: UserRanking;
  rank: number;
  selectedMode: GameMode;
  rankingType: RankingType;
}

const UserRankingCard: React.FC<Props> = ({ ranking, rank, selectedMode, rankingType }) => {
  const { t } = useTranslation();
  const isTopThree = rank <= 3;

  const rawCoverUrl = ranking.user.cover_url || ranking.user.cover?.url || ranking.user.cover?.custom_url;
  const defaultCoverUrls = [
    'https://assets-ppy.g0v0.top/user-profile-covers/default.jpeg',
    'https://assets.ppy.sh/user-profile-covers/default.jpeg',
  ];
  const coverUrl = rawCoverUrl && !defaultCoverUrls.includes(rawCoverUrl) ? rawCoverUrl : undefined;

  const profilePath = `/users/${ranking.user.id}?mode=${selectedMode}`;

  const primaryValue =
    rankingType === 'performance'
      ? `${Math.round(ranking.pp || 0).toLocaleString()}pp`
      : `${(ranking.ranked_score || 0).toLocaleString()}`;

  const secondaryValue =
    rankingType === 'performance'
      ? ranking.ranked_score !== undefined
        ? `${t('common.score')}: ${ranking.ranked_score.toLocaleString()}`
        : null
      : ranking.pp !== undefined
        ? `PP: ${Math.round(ranking.pp).toLocaleString()}`
        : null;

  const accuracyValue =
    ranking.hit_accuracy !== undefined
      ? `${t('rankings.userCard.accuracy')}: ${ranking.hit_accuracy.toFixed(2)}%`
      : null;

  const cardBaseClass =
    'group relative overflow-hidden rounded-2xl border border-white/10 shadow-[0_12px_34px_rgba(0,0,0,0.28)] transition-all duration-300 hover:border-white/20 hover:shadow-[0_18px_44px_rgba(0,0,0,0.36)]';

  const renderRow = () => (
    <div className="relative flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 sm:py-4">
      <div className="flex-shrink-0">
        <RankBadge rank={rank} size="sm" />
      </div>

      <Link to={profilePath} className="flex-shrink-0">
        <LazyAvatar
          src={ranking.user.avatar_url}
          alt={ranking.user.username}
          size="md"
          className="ring-1 ring-white/25 hover:ring-white/45 transition-all duration-200"
        />
      </Link>

      <div className="flex-1 min-w-0">
        <Link
          to={profilePath}
          className="font-semibold text-sm sm:text-base text-white hover:text-white/85 transition-colors truncate block"
        >
          {ranking.user.username}
        </Link>
        <div className="flex items-center gap-1 mt-0.5">
          {ranking.user.country_code && (
            <>
              <LazyFlag
                src={`/image/flag/${ranking.user.country_code.toLowerCase()}.svg`}
                alt={ranking.user.country_code}
                className="w-3 h-2 sm:w-4 sm:h-3 rounded-sm flex-shrink-0"
                data-tooltip-id={`country-tooltip-ranking-${ranking.user.id}`}
                data-tooltip-content={ranking.user.country?.name || ranking.user.country_code}
              />
              <Tooltip
                id={`country-tooltip-ranking-${ranking.user.id}`}
                place="bottom"
                float={true}
                style={{ zIndex: 9999 }}
              />
            </>
          )}
          {ranking.user.team && (
            <>
              <LazyFlag
                src={ranking.user.team.flag_url}
                alt={ranking.user.team.short_name}
                className="w-3 h-2 sm:w-4 sm:h-3 rounded-sm flex-shrink-0 ml-1"
                data-tooltip-id={`team-tooltip-ranking-${ranking.user.id}`}
                data-tooltip-content={ranking.user.team.short_name}
              />
              <Tooltip
                id={`team-tooltip-ranking-${ranking.user.id}`}
                place="bottom"
                float={true}
                style={{ zIndex: 9999 }}
              />
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1 text-right flex-shrink-0">
        <div className="text-base sm:text-[1.65rem] font-bold leading-none" style={{ color: GAME_MODE_COLORS[selectedMode] }}>
          {primaryValue}
        </div>

        <div className="flex flex-col sm:flex-row sm:gap-3 text-[11px] sm:text-xs text-white/65">
          {secondaryValue && <div className="whitespace-nowrap">{secondaryValue}</div>}
          {accuracyValue && <div className="whitespace-nowrap">{accuracyValue}</div>}
        </div>
      </div>
    </div>
  );

  if (!coverUrl) {
    return (
      <div className={`${cardBaseClass} bg-[linear-gradient(140deg,rgba(19,24,58,0.9),rgba(11,15,37,0.84))]`}>
        <div className="absolute inset-0 bg-gradient-to-r from-white/6 via-transparent to-transparent opacity-70" />
        {isTopThree && (
          <div className="absolute inset-0 bg-gradient-to-r from-amber-300/15 via-orange-300/10 to-transparent" />
        )}
        {renderRow()}
      </div>
    );
  }

  return (
    <LazyBackgroundImage src={coverUrl} className={`${cardBaseClass} bg-[#090d25]`}>
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0f2edd] via-[#0a0f2eb8] to-[#090d25e6] group-hover:from-[#080c24e6] group-hover:via-[#080c24c9] group-hover:to-[#080c24ee] transition-all duration-300" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-white/5" />
      {isTopThree && (
        <div className="absolute inset-0 bg-gradient-to-r from-amber-300/18 via-orange-300/10 to-transparent" />
      )}
      {renderRow()}
    </LazyBackgroundImage>
  );
};

export default UserRankingCard;
