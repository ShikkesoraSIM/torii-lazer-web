import React, { useEffect, useMemo, useState } from 'react';
import { FiAward } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import UserRankingCard from './UserRankingCard';
import { apiCache } from '../../utils/apiCache';
import { isCoverDebugEnabled, pickUserCoverCandidates } from '../../utils/profileMedia';
import type { TopUsersResponse, GameMode, RankingType, UserRanking, User } from '../../types';

interface Props {
  rankings: TopUsersResponse | null;
  currentPage: number;
  selectedMode: GameMode;
  rankingType: RankingType;
}

const UserRankingsList: React.FC<Props> = ({ rankings, currentPage, selectedMode, rankingType }) => {
  const { t } = useTranslation();
  const [hydratedUsers, setHydratedUsers] = useState<Map<number, User>>(new Map());

  useEffect(() => {
    let cancelled = false;
    setHydratedUsers(new Map());

    if (!rankings || !rankings.ranking.length) return;

    const userIdsToHydrate = rankings.ranking
      .filter((entry) => pickUserCoverCandidates(entry.user).length === 0)
      .map((entry) => entry.user.id);

    if (isCoverDebugEnabled()) {
      console.info('[cover] rankings hydrate check', {
        total: rankings.ranking.length,
        missingCandidateCount: userIdsToHydrate.length,
      });
    }

    if (userIdsToHydrate.length === 0) return;

    apiCache
      .getUsers(userIdsToHydrate)
      .then((usersMap) => {
        if (cancelled) return;
        const next = new Map<number, User>();
        usersMap.forEach((user, userId) => {
          if (pickUserCoverCandidates(user).length > 0) {
            next.set(userId, user);
          }
        });
        setHydratedUsers(next);

        if (isCoverDebugEnabled()) {
          console.info('[cover] rankings hydrate result', {
            requested: userIdsToHydrate.length,
            resolvedWithCover: next.size,
          });
        }
      })
      .catch((error) => {
        if (cancelled) return;
        console.warn('[cover] rankings hydrate failed', error);
      });

    return () => {
      cancelled = true;
    };
  }, [rankings]);

  if (!rankings || !rankings.ranking.length) {
    return (
      <div className="text-center py-20 px-4 sm:px-0">
        <div className="bg-gray-100 dark:bg-gray-700 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
          <FiAward className="text-4xl text-gray-400 dark:text-gray-500" />
        </div>
        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('rankings.errors.noData')}</h3>
        <p className="text-gray-500 dark:text-gray-400">{t('common.noDataFound')}</p>
      </div>
    );
  }

  const startRank = (currentPage - 1) * 50 + 1;
  const visibleRankings = useMemo(
    () =>
      rankings.ranking.map((ranking) => {
        const hydrated = hydratedUsers.get(ranking.user.id);
        if (!hydrated) return ranking;
        return {
          ...ranking,
          user: {
            ...ranking.user,
            ...hydrated,
          },
        };
      }),
    [hydratedUsers, rankings.ranking]
  );

  return (
    <div className="space-y-3">
      {visibleRankings.map((ranking: UserRanking, index: number) => (
        <UserRankingCard
          key={ranking.user.id}
          ranking={ranking}
          rank={startRank + index}
          selectedMode={selectedMode}
          rankingType={rankingType}
        />
      ))}
    </div>
  );
};

export default UserRankingsList;
