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
  const { isAuthenticated, user, refreshUser } = useAuth();
  const [selectedMode, setSelectedMode] = useState<GameMode>('osu');
  const [rankingType, setRankingType] = useState<RankingType>('performance');
  const [currentPage, setCurrentPage] = useState(1);

  const [teamRankings, setTeamRankings] = useState<TeamRankingsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;
    void refreshUser();
  }, [isAuthenticated, refreshUser]);

  useEffect(() => {
    let cancelled = false;
    const fetchRankings = async () => {
      setIsLoading(true);
      setLoadError(false);
      try {
        const response = await rankingsAPI.getTeamRankings(
          selectedMode,
          rankingType,
          currentPage
        );
        if (!cancelled) {
          setTeamRankings(response);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(true);
          handleApiError(error);
          console.error('Failed to load team rankings:', error);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    void fetchRankings();
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    return () => {
      cancelled = true;
    };
  }, [selectedMode, rankingType, currentPage, reloadNonce]);

  const handleModeChange = (mode: GameMode) => {
    setSelectedMode(mode);
    setCurrentPage(1);
  };

  const handleRankingTypeChange = (type: RankingType) => {
    setRankingType(type);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const actionClass =
    'inline-flex items-center px-4 py-2 rounded-2xl border border-white/20 bg-torii hover:bg-torii-hover text-white transition-all self-start sm:self-auto shadow-elev-2';

  return (
    <div className="min-h-screen torii-page-stage">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary mb-1.5">
                {t('teams.title')}
              </h1>
              <p className="text-sm sm:text-base text-text-secondary">
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

        <div className="relative z-30 flex flex-col xl:flex-row xl:items-center gap-4 sm:gap-6 mb-4 sm:mb-6">
          <div className="torii-liquid-soft rounded-2xl p-2">
            <GameModeSelector
              selectedMode={selectedMode}
              onModeChange={handleModeChange}
              variant="compact"
              className=""
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 xl:flex-1">
            <div className="w-full sm:w-48">
              <RankingTypeSelector
                value={rankingType}
                onChange={handleRankingTypeChange}
              />
            </div>
          </div>
        </div>

        <div className="relative z-10 torii-liquid rounded-3xl p-3 sm:p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 sm:px-0">
              <LoadingSpinner size="lg" className="mb-4" />
              <p className="text-text-secondary font-medium">{t('teams.loadingTeams')}</p>
            </div>
          ) : loadError ? (
            <div className="bg-red-500/10 border border-red-500/30 text-red-200 rounded-2xl p-5 flex items-center justify-between gap-3 flex-wrap">
              <span>{t('teams.loadError', { defaultValue: 'Failed to load teams.' })}</span>
              <button
                type="button"
                onClick={() => setReloadNonce((n) => n + 1)}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                {t('common.retry', { defaultValue: 'Retry' })}
              </button>
            </div>
          ) : (
            <TeamRankingsList
              rankings={teamRankings}
              currentPage={currentPage}
              selectedMode={selectedMode}
              rankingType={rankingType}
            />
          )}

          {!isLoading && !loadError && (
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
