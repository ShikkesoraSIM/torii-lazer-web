import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiEdit, FiEye } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { rankingsAPI, handleApiError } from '../utils/api';
import TeamRankingsList from '../components/Rankings/TeamRankingsList';
import RankingTypeSelector from '../components/UI/RankingTypeSelector';
import PaginationControls from '../components/Rankings/PaginationControls';
import GameModeSelector from '../components/UI/GameModeSelector';
import type {
  GameMode,
  TeamRankingsResponse,
  RankingType
} from '../types';

const TeamsPage: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const [selectedMode, setSelectedMode] = useState<GameMode>('osu');
  const [rankingType, setRankingType] = useState<RankingType>('performance');
  const [currentPage, setCurrentPage] = useState(1);

  const [teamRankings, setTeamRankings] = useState<TeamRankingsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadTeamRankings = async () => {
    setIsLoading(true);
    try {
      const response = await rankingsAPI.getTeamRankings(
        selectedMode,
        rankingType,
        currentPage
      );
      setTeamRankings(response);
    } catch (error) {
      handleApiError(error);
      console.error('Failed to load team rankings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selectedMode, rankingType]);

  useEffect(() => {
    loadTeamRankings();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selectedMode, rankingType, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const actionClass =
    'inline-flex items-center px-4 py-2 rounded-2xl border border-white/20 bg-gradient-to-r from-[#ff8b6b] to-[#ff6f91] text-white hover:brightness-110 transition-all self-start sm:self-auto shadow-[0_12px_28px_rgba(255,111,145,0.35)]';

  return (
    <div className="min-h-screen torii-page-stage">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                {t('teams.title')}
              </h1>
              <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400">
                {t('teams.description')}
              </p>
            </div>

            {isAuthenticated && (
              user?.team ? (
                user.id === user.team.leader_id ? (
                  <Link to={`/teams/${user.team.id}/edit`} className={actionClass}>
                    <FiEdit className="mr-2" />
                    {t('teams.editTeam')}
                  </Link>
                ) : (
                  <Link to={`/teams/${user.team.id}`} className={actionClass}>
                    <FiEye className="mr-2" />
                    {t('teams.viewTeam')}
                  </Link>
                )
              ) : (
                <Link to="/teams/create" className={actionClass}>
                  <FiPlus className="mr-2" />
                  {t('teams.createTeam')}
                </Link>
              )
            )}
          </div>
        </div>

        <div className="flex flex-col xl:flex-row xl:items-center gap-4 sm:gap-6 mb-4 sm:mb-6">
          <div className="torii-liquid-soft rounded-2xl p-2">
            <GameModeSelector
              selectedMode={selectedMode}
              onModeChange={setSelectedMode}
              variant="compact"
              className=""
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 xl:flex-1">
            <div className="w-full sm:w-48">
              <RankingTypeSelector
                value={rankingType}
                onChange={setRankingType}
              />
            </div>
          </div>
        </div>

        <div className="torii-liquid rounded-3xl p-3 sm:p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 sm:px-0">
              <LoadingSpinner size="lg" className="mb-4" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">{t('teams.loadingTeams')}</p>
            </div>
          ) : (
            <TeamRankingsList
              rankings={teamRankings}
              currentPage={currentPage}
              selectedMode={selectedMode}
              rankingType={rankingType}
            />
          )}

          {!isLoading && (
            <PaginationControls
              total={teamRankings?.total || 0}
              currentPage={currentPage}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamsPage;
