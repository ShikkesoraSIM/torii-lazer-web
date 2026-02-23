import React from 'react';
import { Link } from 'react-router-dom';
import { FiUsers, FiTrendingUp } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import RankBadge from '../UI/RankBadge';
import LazyBackgroundImage from '../UI/LazyBackgroundImage';
import { GAME_MODE_COLORS } from '../../types';
import type { TeamRanking, Team, GameMode, RankingType } from '../../types';

interface Props {
  ranking: TeamRanking;
  team: Team | null;
  rank: number;
  selectedMode: GameMode;
  rankingType: RankingType;
  isLoading?: boolean;
}

const TeamRankingCard: React.FC<Props> = ({
  ranking,
  team,
  rank,
  selectedMode,
  rankingType,
  isLoading = false
}) => {
  const { t } = useTranslation();

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const isTopThree = rank <= 3;

  if (isLoading || !team) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(140deg,rgba(19,24,58,0.9),rgba(11,15,37,0.84))] animate-pulse">
        <div className="relative flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 sm:py-4">
          <div className="w-6 h-6 bg-white/15 rounded" />
          <div className="w-14 h-8 bg-white/15 rounded-md" />
          <div className="flex-1 min-w-0">
            <div className="h-5 bg-white/15 rounded w-36 mb-1.5" />
            <div className="h-3 bg-white/10 rounded w-40" />
          </div>
          <div className="w-20 h-7 bg-white/15 rounded" />
        </div>
      </div>
    );
  }

  const rawCoverUrl = team.cover_url;
  const defaultCoverUrls = [
    'https://assets-ppy.g0v0.top/user-profile-covers/default.jpeg',
    'https://assets.ppy.sh/user-profile-covers/default.jpeg',
  ];
  const coverUrl = rawCoverUrl && !defaultCoverUrls.includes(rawCoverUrl) ? rawCoverUrl : undefined;

  const valueText =
    rankingType === 'performance'
      ? `${formatNumber(ranking.performance || 0)}pp`
      : `${formatNumber(ranking.ranked_score || 0)}`;

  const cardBaseClass =
    'group relative overflow-hidden rounded-2xl border border-white/10 shadow-[0_12px_34px_rgba(0,0,0,0.28)] transition-all duration-300 hover:border-white/20 hover:shadow-[0_18px_44px_rgba(0,0,0,0.36)]';

  const content = (
    <div className="relative flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 sm:py-4">
      <div className="flex-shrink-0">
        <RankBadge rank={rank} size="sm" />
      </div>

      <div className="flex-shrink-0">
        <div className="w-12 h-6 sm:w-16 sm:h-8 rounded-md overflow-hidden border border-white/20 bg-white/5">
          <img
            src={team.flag_url}
            alt={`${team.name} flag`}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <span className="font-semibold text-sm sm:text-base text-white truncate block">
          {team.name}
        </span>
        <div className="flex items-center gap-3 sm:gap-5 mt-0.5 text-white/65">
          <div className="flex items-center gap-1">
            <FiUsers className="w-3 h-3" />
            <span className="text-xs">
              {ranking.member_count || 0} {t('common.members')}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <FiTrendingUp className="w-3 h-3" />
            <span className="text-xs">
              {ranking.play_count || 0} {t('common.playCount')}
            </span>
          </div>
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        <div className="text-base sm:text-[1.65rem] font-bold leading-none" style={{ color: GAME_MODE_COLORS[selectedMode] }}>
          {valueText}
        </div>
      </div>
    </div>
  );

  return (
    <Link to={`/teams/${team.id}?mode=${selectedMode}`} className="block">
      {!coverUrl ? (
        <div className={`${cardBaseClass} bg-[linear-gradient(140deg,rgba(19,24,58,0.9),rgba(11,15,37,0.84))]`}>
          <div className="absolute inset-0 bg-gradient-to-r from-white/6 via-transparent to-transparent opacity-70" />
          {isTopThree && (
            <div className="absolute inset-0 bg-gradient-to-r from-amber-300/15 via-orange-300/10 to-transparent" />
          )}
          {content}
        </div>
      ) : (
        <LazyBackgroundImage src={coverUrl} className={`${cardBaseClass} bg-[#090d25]`}>
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0f2edd] via-[#0a0f2eb8] to-[#090d25e6] group-hover:from-[#080c24e6] group-hover:via-[#080c24c9] group-hover:to-[#080c24ee] transition-all duration-300" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-white/5" />
          {isTopThree && (
            <div className="absolute inset-0 bg-gradient-to-r from-amber-300/18 via-orange-300/10 to-transparent" />
          )}
          {content}
        </LazyBackgroundImage>
      )}
    </Link>
  );
};

export default TeamRankingCard;
