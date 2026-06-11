import React from 'react';
import { Link } from 'react-router-dom';
import LazyBackgroundImage from '../UI/LazyBackgroundImage';
import LazyAvatar from '../UI/LazyAvatar';
import CountryFlag from '../UI/CountryFlag';
import { GAME_MODE_COLORS } from '../../types';
import type { UserRanking, GameMode, RankingType } from '../../types';
import { pickBestUserCoverUrl } from '../../utils/profileMedia';

interface Props {
  ranking: UserRanking;
  selectedMode: GameMode;
  rankingType: RankingType;
}

const TeamDetailUserCard: React.FC<Props> = ({ ranking, selectedMode, rankingType }) => {
  const coverUrl = pickBestUserCoverUrl(ranking.user);
  const profilePath = `/users/${ranking.user.id}?mode=${selectedMode}`;

  const primaryValue =
    rankingType === 'performance'
      ? `${Math.round(ranking.pp || 0).toLocaleString()}pp`
      : `${(ranking.ranked_score || 0).toLocaleString()}`;

  const row = (
    <div className="relative flex items-center gap-3 sm:gap-4 px-4 py-3">
      <Link to={profilePath} className="flex-shrink-0">
        <LazyAvatar
          src={ranking.user.avatar_url}
          alt={ranking.user.username}
          size="md"
          className="ring-1 ring-white/20 hover:ring-white/40 transition-all duration-200"
        />
      </Link>

      <div className="flex-1 min-w-0">
        <Link
          to={profilePath}
          className="font-semibold text-sm sm:text-base text-white hover:text-white/85 transition-colors truncate block"
        >
          {ranking.user.username}
        </Link>
        <div className="flex items-center gap-1.5 mt-0.5">
          {ranking.user.country_code && (
            <CountryFlag
              code={ranking.user.country_code}
              name={ranking.user.country?.name || ranking.user.country_code}
              className="h-2 sm:h-3"
              rounded="rounded-sm"
            />
          )}
          <span className="text-xs text-white/55 truncate">
            {ranking.user.country?.name || ranking.user.country_code}
          </span>
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        <div className="text-base sm:text-lg font-bold" style={{ color: GAME_MODE_COLORS[selectedMode] }}>
          {primaryValue}
        </div>
      </div>
    </div>
  );

  // No cover: a subtle translucent row that reads on the dark page.
  if (!coverUrl) {
    return (
      <div className="group relative overflow-hidden border-b border-white/5 transition-colors duration-200 hover:bg-white/[0.04]">
        {row}
      </div>
    );
  }

  // Cover: dark scrim on the left for legibility, letting the cover bleed right.
  return (
    <LazyBackgroundImage
      src={coverUrl}
      className="group relative overflow-hidden border-b border-white/5 bg-[#090d25]"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0f2e]/[0.92] via-[#0a0f2e]/[0.72] to-[#090d25]/[0.55] group-hover:from-[#080c24]/[0.94] group-hover:via-[#080c24]/[0.78] group-hover:to-[#080c24]/[0.6] transition-all duration-300" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-white/5" />
      {row}
    </LazyBackgroundImage>
  );
};

export default TeamDetailUserCard;
