import React, { useCallback, useEffect, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import {
  FiArrowLeft,
  FiLoader,
  FiUsers,
  FiCalendar,
  FiAward,
  FiGlobe,
  FiInfo,
  FiTag,
  FiUserCheck,
  FiUserX,
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { teamsAPI, handleApiError } from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import TeamDetailUserCard from '../components/Rankings/TeamDetailUserCard';
import TeamActions from '../components/Teams/TeamActions';
import MemberActions from '../components/Teams/MemberActions';
import toast from 'react-hot-toast';
import { GAME_MODE_NAMES, type TeamDetailResponse, type User, type GameMode, type TeamJoinRequest } from '../types';

const TeamDetailPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { teamId } = useParams<{ teamId: string }>();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [teamDetail, setTeamDetail] = useState<TeamDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState<TeamJoinRequest[]>([]);
  const [hasPendingJoinRequest, setHasPendingJoinRequest] = useState(false);
  const [isManagingRequests, setIsManagingRequests] = useState(false);

  const modeFromUrl = searchParams.get('mode') as GameMode | null;
  const selectedMode: GameMode = modeFromUrl || 'osu';

  const loadTeamDetail = useCallback(async (showLoading = true) => {
    if (!teamId) return;

    if (showLoading) {
      setIsLoading(true);
    }

    try {
      const response = await teamsAPI.getTeam(parseInt(teamId, 10), selectedMode);
      setTeamDetail(response);

      const isMember = response.members.some((member: User) => member.id === user?.id);
      const isLeader = response.team.leader_id === user?.id;

      if (!user || isMember || isLeader) {
        setHasPendingJoinRequest(false);
      } else {
        try {
          const status = await teamsAPI.getJoinRequestStatus(parseInt(teamId, 10));
          setHasPendingJoinRequest(Boolean(status?.has_pending_request));
        } catch {
          setHasPendingJoinRequest(false);
        }
      }

      if (isLeader) {
        try {
          const requests = await teamsAPI.getTeamRequests(parseInt(teamId, 10));
          setPendingRequests(requests || []);
        } catch {
          setPendingRequests([]);
        }
      } else {
        setPendingRequests([]);
      }
    } catch (error) {
      handleApiError(error);
      console.error('Failed to load team detail:', error);
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, [teamId, selectedMode, user]);

  useEffect(() => {
    loadTeamDetail();
  }, [loadTeamDetail]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(i18n.language === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString(i18n.language === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getLeader = () => {
    if (!teamDetail) return null;
    return teamDetail.members.find((member) => member.id === teamDetail.team.leader_id);
  };

  const getNonLeaderMembers = () => {
    if (!teamDetail) return [];
    return teamDetail.members.filter((member) => member.id !== teamDetail.team.leader_id);
  };

  const handleTeamUpdate = () => {
    loadTeamDetail(false);
  };

  const handleAcceptRequest = async (request: TeamJoinRequest) => {
    if (!teamDetail) return;
    setIsManagingRequests(true);
    try {
      await teamsAPI.acceptJoinRequest(teamDetail.team.id, request.user_id);
      toast.success(t('teams.detail.requestAccepted', { username: request.user.username }));
      await loadTeamDetail(false);
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsManagingRequests(false);
    }
  };

  const handleRejectRequest = async (request: TeamJoinRequest) => {
    if (!teamDetail) return;
    setIsManagingRequests(true);
    try {
      await teamsAPI.rejectJoinRequest(teamDetail.team.id, request.user_id);
      toast.success(t('teams.detail.requestRejected', { username: request.user.username }));
      await loadTeamDetail(false);
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsManagingRequests(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <FiLoader className="animate-spin h-12 w-12 text-blue-500 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">{t('teams.detail.loading')}</p>
        </div>
      </div>
    );
  }

  if (!teamDetail) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <FiUsers className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('teams.detail.notFound')}</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">{t('teams.detail.notFoundDescription')}</p>
          <Link
            to="/teams"
            className="inline-flex items-center px-4 py-2 bg-osu-pink text-white rounded-lg hover:bg-osu-pink/90 transition-colors"
          >
            <FiArrowLeft className="mr-2" />
            {t('teams.detail.backToTeams')}
          </Link>
        </div>
      </div>
    );
  }

  const { team, members } = teamDetail;
  const leader = getLeader();
  const nonLeaderMembers = getNonLeaderMembers();
  const preferredMode = (team.playmode || 'osu') as GameMode;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6 sm:py-8">
        <div className="mb-6">
          <Link
            to="/teams"
            className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <FiArrowLeft className="mr-2" />
            {t('teams.detail.backToTeams')}
          </Link>
        </div>

        <div className="-mx-4 sm:mx-0 sm:bg-card sm:rounded-xl sm:shadow-sm sm:border sm:border-card mb-6">
          <div className="relative h-32 sm:h-48 bg-gradient-to-r from-blue-500 to-purple-600 sm:rounded-t-xl overflow-hidden">
            <img
              src={team.cover_url}
              alt={`${team.name} cover`}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-black bg-opacity-30" />
          </div>

          <div className="relative px-4 sm:px-6 py-6 sm:bg-card sm:rounded-b-xl">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-32 h-16 sm:w-40 sm:h-20 rounded-xl overflow-hidden border-4 border-white dark:border-gray-800 bg-gray-100 dark:bg-gray-700 flex-shrink-0 -mt-12 sm:-mt-16">
                <img
                  src={team.flag_url}
                  alt={`${team.name} flag`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>

              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">{team.name}</h1>
                    {team.short_name !== team.name && <p className="text-lg text-gray-600 dark:text-gray-400">{team.short_name}</p>}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <FiCalendar className="w-4 h-4" />
                        <span>{t('teams.detail.createdAt', { date: formatDate(team.created_at) })}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FiUsers className="w-4 h-4" />
                        <span>{t('teams.detail.members', { count: members.length })}</span>
                      </div>
                    </div>

                    <div className="relative overflow-visible">
                      <TeamActions
                        team={team}
                        members={members}
                        hasPendingJoinRequest={hasPendingJoinRequest}
                        onJoinRequestStatusChange={setHasPendingJoinRequest}
                        onTeamUpdate={handleTeamUpdate}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="sm:bg-card sm:rounded-xl sm:shadow-sm sm:border sm:border-card p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
              <FiTag /> {t('teams.detail.preferredMode')}
            </p>
            <p className="text-base font-semibold text-gray-900 dark:text-white">{GAME_MODE_NAMES[preferredMode]}</p>
          </div>

          <div className="sm:bg-card sm:rounded-xl sm:shadow-sm sm:border sm:border-card p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
              <FiGlobe /> {t('teams.detail.website')}
            </p>
            {team.website ? (
              <a
                href={team.website}
                target="_blank"
                rel="noreferrer"
                className="text-base font-semibold text-osu-pink hover:underline break-all"
              >
                {team.website}
              </a>
            ) : (
              <p className="text-base text-gray-500 dark:text-gray-400">{t('teams.detail.noWebsite')}</p>
            )}
          </div>

          <div className="sm:bg-card sm:rounded-xl sm:shadow-sm sm:border sm:border-card p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
              <FiInfo /> {t('teams.detail.rankSummary')}
            </p>
            <p className="text-base font-semibold text-gray-900 dark:text-white">
              #{team.rank || 0} • {(team.pp || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}pp
            </p>
          </div>
        </div>

        <div className="sm:bg-card sm:rounded-xl sm:shadow-sm sm:border sm:border-card p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{t('teams.detail.description')}</h2>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {team.description || t('teams.detail.noDescription')}
          </p>
        </div>

        {team.leader_id === user?.id && (
          <div className="sm:bg-card sm:rounded-xl sm:shadow-sm sm:border sm:border-card p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('teams.detail.joinRequests')}</h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">{pendingRequests.length}</span>
            </div>

            {pendingRequests.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">{t('teams.detail.noJoinRequests')}</p>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((request) => (
                  <div
                    key={`${request.team_id}-${request.user_id}`}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border border-card rounded-lg bg-card"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={request.user.avatar_url}
                        alt={request.user.username}
                        className="w-10 h-10 rounded-full"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">{request.user.username}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {t('teams.detail.requestedAt', { date: formatDateTime(request.requested_at) })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:flex-shrink-0">
                      <button
                        onClick={() => handleAcceptRequest(request)}
                        disabled={isManagingRequests}
                        className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        <FiUserCheck className="mr-2" />
                        {t('teams.detail.acceptRequest')}
                      </button>
                      <button
                        onClick={() => handleRejectRequest(request)}
                        disabled={isManagingRequests}
                        className="inline-flex items-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        <FiUserX className="mr-2" />
                        {t('teams.detail.rejectRequest')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {leader && (
          <div className="sm:bg-card sm:rounded-xl sm:shadow-sm sm:border sm:border-card sm:p-6 mb-8">
            <div className="flex items-center gap-3 mb-4 px-4 sm:px-0">
              <FiAward className="w-5 h-5 text-yellow-500" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('teams.detail.captain')}</h2>
            </div>
            <div className="-mx-4 sm:-mx-6 sm:border sm:border-card overflow-hidden">
              <TeamDetailUserCard
                ranking={{
                  user: leader,
                  ranked_score: leader.statistics?.ranked_score,
                  pp: leader.statistics?.pp,
                }}
                selectedMode={selectedMode}
                rankingType="performance"
              />
            </div>
          </div>
        )}

        {nonLeaderMembers.length > 0 && (
          <div className="sm:bg-card sm:rounded-xl sm:shadow-sm sm:border sm:border-card sm:p-6">
            <div className="flex items-center gap-3 mb-6 px-4 sm:px-0">
              <FiUsers className="w-5 h-5 text-blue-500" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('teams.detail.teamMembers')}</h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">{t('teams.detail.memberCount', { count: nonLeaderMembers.length })}</span>
            </div>

            <div className="-mx-4 sm:-mx-6 sm:divide-y divide-gray-200 dark:divide-gray-700 sm:border sm:border-card overflow-hidden">
              {nonLeaderMembers.map((member: User) => (
                <div key={member.id} className="relative">
                  <TeamDetailUserCard
                    ranking={{
                      user: member,
                      ranked_score: member.statistics?.ranked_score,
                      pp: member.statistics?.pp,
                    }}
                    selectedMode={selectedMode}
                    rankingType="performance"
                  />

                  <div className="absolute top-4 right-4 sm:right-6">
                    <MemberActions member={member} team={team} onMemberRemoved={handleTeamUpdate} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamDetailPage;
