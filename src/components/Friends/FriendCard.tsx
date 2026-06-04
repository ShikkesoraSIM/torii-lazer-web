import React from 'react';
import { Link } from 'react-router-dom';
import { Tooltip } from 'react-tooltip';
import { useTranslation } from 'react-i18next';
import LazyAvatar from '../UI/LazyAvatar';
import LazyFlag from '../UI/LazyFlag';

export interface FriendCardUser {
  id: number;
  username: string;
  avatar_url?: string;
  country_code?: string;
  country?: { name?: string } | null;
}

interface Props {
  user: FriendCardUser;
  mutual?: boolean;
}

const FriendCard: React.FC<Props> = ({ user, mutual }) => {
  const { t } = useTranslation();
  const profilePath = `/users/${user.id}`;

  return (
    <Link
      to={profilePath}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(140deg,rgba(19,24,58,0.9),rgba(11,15,37,0.84))] shadow-[0_12px_34px_rgba(0,0,0,0.28)] transition-all duration-300 hover:border-white/20 hover:shadow-[0_18px_44px_rgba(0,0,0,0.36)] flex items-center gap-3 sm:gap-4 px-4 py-3.5"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-white/6 via-transparent to-transparent opacity-70" />
      <LazyAvatar
        src={user.avatar_url}
        alt={user.username}
        size="md"
        className="relative ring-1 ring-white/25 group-hover:ring-white/45 transition-all duration-200 flex-shrink-0"
      />
      <div className="relative flex-1 min-w-0">
        <div className="font-semibold text-sm sm:text-base text-white truncate">{user.username}</div>
        {user.country_code && (
          <div className="flex items-center gap-1 mt-0.5">
            <LazyFlag
              src={`/image/flag/${user.country_code.toLowerCase()}.svg`}
              alt={user.country_code}
              className="w-4 h-3 rounded-sm flex-shrink-0"
              data-tooltip-id={`friend-country-${user.id}`}
              data-tooltip-content={user.country?.name || user.country_code}
            />
            <Tooltip id={`friend-country-${user.id}`} place="bottom" float style={{ zIndex: 9999 }} />
          </div>
        )}
      </div>
      {mutual && (
        <span className="relative flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold text-emerald-200 bg-emerald-400/15 border border-emerald-300/30">
          {t('friends.mutualBadge')}
        </span>
      )}
    </Link>
  );
};

export default FriendCard;
