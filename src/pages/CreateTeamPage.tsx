import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiSave, FiImage, FiFlag, FiUsers, FiLoader } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { teamsAPI, adminAPI, handleApiError } from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import ImageUploadWithCrop from '../components/UI/ImageUploadWithCrop';
import MemberSelector from '../components/UI/MemberSelector';
import toast from 'react-hot-toast';
import { GAME_MODE_NAMES, type User, type Team, type TeamDetailResponse, type GameMode } from '../types';

const TEAM_MODE_OPTIONS: GameMode[] = ['osu', 'taiko', 'fruits', 'mania', 'osurx', 'osuap', 'taikorx', 'fruitsrx'];

const CreateTeamPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { teamId } = useParams<{ teamId: string }>();
  const { user, refreshUser, updateUser } = useAuth();
  const isEditing = Boolean(teamId);

  const [formData, setFormData] = useState({
    name: '',
    short_name: '',
    leader_id: null as number | null,
    description: '',
    website: '',
    playmode: 'osu' as GameMode,
  });
  const [flagFile, setFlagFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [flagPreview, setFlagPreview] = useState<string>('');
  const [coverPreview, setCoverPreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [teamDetail, setTeamDetail] = useState<TeamDetailResponse | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [canEditTeam, setCanEditTeam] = useState(!isEditing);

  useEffect(() => {
    if (!isEditing || !teamId) return;

    const loadTeamData = async () => {
      setIsLoading(true);
      try {
        const response = await teamsAPI.getTeam(parseInt(teamId, 10));
        const { team, members: teamMembers } = response;
        if (team.leader_id !== user?.id && !user?.is_admin) {
          setCanEditTeam(false);
          toast.error(t('teams.create.notLeader'));
          navigate(`/teams/${team.id}`);
          return;
        }

        setCanEditTeam(true);
        setTeamDetail(response);
        setMembers(teamMembers);
        setFormData({
          name: team.name,
          short_name: team.short_name,
          leader_id: team.leader_id,
          description: team.description || '',
          website: team.website || '',
          playmode: (team.playmode || 'osu') as GameMode,
        });
        setFlagPreview(team.flag_url);
        setCoverPreview(team.cover_url);
      } catch (error) {
        handleApiError(error);
        navigate('/teams');
      } finally {
        setIsLoading(false);
      }
    };

    loadTeamData();
  }, [isEditing, teamId, navigate, user?.id, user?.is_admin, t]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFlagSelect = (file: File) => {
    setFlagFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setFlagPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleCoverSelect = (file: File) => {
    setCoverFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setCoverPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (isEditing && !canEditTeam && !user?.is_admin) {
      toast.error(t('teams.create.notLeader'));
      return;
    }

    const name = formData.name.trim();
    const shortName = formData.short_name.trim();
    const description = formData.description.trim();
    const website = formData.website.trim();

    if (!name) {
      toast.error(t('teams.create.nameRequired'));
      return;
    }

    if (!shortName) {
      toast.error(t('teams.create.shortNameRequired'));
      return;
    }

    if (!isEditing && (!flagFile || !coverFile)) {
      toast.error(t('teams.create.assetsRequired'));
      return;
    }

    setIsSubmitting(true);

    try {
      const data = new FormData();

      if (isEditing) {
        if (name !== (teamDetail?.team.name || '')) {
          data.append('name', name);
        }

        if (shortName !== (teamDetail?.team.short_name || '')) {
          data.append('short_name', shortName);
        }

        if (formData.leader_id !== null && formData.leader_id !== teamDetail?.team.leader_id) {
          data.append('leader_id', formData.leader_id.toString());
        }

        const currentDescription = teamDetail?.team.description || '';
        if (description !== currentDescription) {
          data.append('description', description);
        }

        const currentWebsite = teamDetail?.team.website || '';
        if (website !== currentWebsite) {
          data.append('website', website);
        }

        const currentPlaymode = (teamDetail?.team.playmode || 'osu') as GameMode;
        if (formData.playmode !== currentPlaymode) {
          data.append('playmode', formData.playmode);
        }
      } else {
        data.append('name', name);
        data.append('short_name', shortName);
        data.append('playmode', formData.playmode);

        if (description) {
          data.append('description', description);
        }

        if (website) {
          data.append('website', website);
        }
      }

      if (flagFile) {
        data.append('flag', flagFile);
      }

      if (coverFile) {
        data.append('cover', coverFile);
      }

      if (isEditing) {
        const updatedTeam = (user?.is_admin
          ? await adminAPI.updateTeam(parseInt(teamId!, 10), data)
          : await teamsAPI.updateTeam(parseInt(teamId!, 10), data)) as Team;

        if (user && user.team?.id === updatedTeam.id) {
          updateUser({
            ...user,
            team: {
              ...user.team,
              ...updatedTeam,
            },
          });
        }

        void refreshUser();
        toast.success(t('teams.create.updateSuccess'));
        navigate(`/teams/${teamId}`);
      } else {
        const createdTeam = (await teamsAPI.createTeam(data)) as Team;
        if (user) {
          updateUser({
            ...user,
            team: createdTeam,
          });
        }
        void refreshUser();
        toast.success(t('teams.create.createSuccess'));
        navigate(`/teams/${createdTeam.id}`);
      }
    } catch (error) {
      handleApiError(error);
      console.error('Failed to save team:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {t('teams.create.loginRequired')}
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {t('teams.create.loginRequired')}
          </p>
        </div>
      </div>
    );
  }

  if (isEditing && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <FiLoader className="animate-spin h-12 w-12 text-blue-500 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">{t('teams.create.loading')}</p>
        </div>
      </div>
    );
  }

  if (isEditing && !canEditTeam && !user?.is_admin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {t('teams.create.notLeader')}
          </h3>
          <p className="text-gray-500 dark:text-gray-400">{t('teams.create.notLeaderDescription')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6 sm:py-8">
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <FiArrowLeft className="mr-2" />
            {t('common.back')}
          </button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {isEditing ? t('teams.create.editTeam') : t('teams.create.createTeam')}
          </h1>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400">
            {isEditing ? t('teams.create.editDescription') : t('teams.create.createDescription')}
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="bg-card rounded-xl shadow-sm border border-card p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">{t('teams.create.basicInfo')}</h2>

              <div className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('teams.create.teamName')} {t('teams.create.required')}
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-card rounded-lg bg-card text-gray-900 dark:text-white focus:ring-2 focus:ring-osu-pink focus:border-transparent"
                    placeholder={t('teams.create.teamNamePlaceholder')}
                    maxLength={100}
                  />
                </div>

                <div>
                  <label htmlFor="short_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('teams.create.teamShortName')} {t('teams.create.required')}
                  </label>
                  <input
                    type="text"
                    id="short_name"
                    name="short_name"
                    value={formData.short_name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-card rounded-lg bg-card text-gray-900 dark:text-white focus:ring-2 focus:ring-osu-pink focus:border-transparent"
                    placeholder={t('teams.create.teamShortNamePlaceholder')}
                    maxLength={10}
                  />
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('teams.create.shortNameDescription')}</p>
                </div>

                <div>
                  <label htmlFor="playmode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('teams.create.preferredMode')}
                  </label>
                  <select
                    id="playmode"
                    name="playmode"
                    value={formData.playmode}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-card rounded-lg bg-card text-gray-900 dark:text-white focus:ring-2 focus:ring-osu-pink focus:border-transparent"
                  >
                    {TEAM_MODE_OPTIONS.map((mode) => (
                      <option key={mode} value={mode}>
                        {GAME_MODE_NAMES[mode]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="website" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('teams.create.website')}
                  </label>
                  <input
                    type="text"
                    id="website"
                    name="website"
                    value={formData.website}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-card rounded-lg bg-card text-gray-900 dark:text-white focus:ring-2 focus:ring-osu-pink focus:border-transparent"
                    placeholder={t('teams.create.websitePlaceholder')}
                    maxLength={255}
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('teams.create.description')}
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-card rounded-lg bg-card text-gray-900 dark:text-white focus:ring-2 focus:ring-osu-pink focus:border-transparent"
                    placeholder={t('teams.create.descriptionPlaceholder')}
                    rows={5}
                    maxLength={2000}
                  />
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl shadow-sm border border-card p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">{t('teams.create.teamFlag')}</h2>

              <ImageUploadWithCrop
                onImageSelect={handleFlagSelect}
                preview={flagPreview}
                aspectRatio={2}
                maxWidth={240}
                maxHeight={120}
                maxFileSize={2}
                placeholder={t('teams.create.selectFlag')}
                description={t('teams.create.flagDescription')}
                icon={<FiFlag className="mr-2" />}
                acceptedTypes={['image/png', 'image/jpeg', 'image/gif']}
                isUploading={isSubmitting}
                uploadingText={t('teams.create.creatingTeam')}
              />
            </div>

            <div className="bg-card rounded-xl shadow-sm border border-card p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">{t('teams.create.teamCover')}</h2>

              <ImageUploadWithCrop
                onImageSelect={handleCoverSelect}
                preview={coverPreview}
                aspectRatio={1.5}
                maxWidth={1920}
                maxHeight={1280}
                maxFileSize={10}
                placeholder={t('teams.create.selectCover')}
                description={t('teams.create.coverDescription')}
                icon={<FiImage className="mr-2" />}
                acceptedTypes={['image/png', 'image/jpeg', 'image/gif']}
                isUploading={isSubmitting}
                uploadingText={t('teams.create.creatingTeam')}
              />
            </div>

            {isEditing && members.length > 0 && (
              <div className="bg-card rounded-xl shadow-sm border border-card p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                  <FiUsers className="mr-3" />
                  {t('teams.create.memberManagement')}
                </h2>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    {t('teams.create.leaderTransfer')}
                  </label>
                  <MemberSelector
                    value={formData.leader_id}
                    onChange={(value) => setFormData((prev) => ({ ...prev, leader_id: value }))}
                    members={members}
                    currentLeaderId={teamDetail?.team.leader_id}
                    placeholder={t('teams.create.keepCurrentLeader')}
                  />
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('teams.create.leaderTransferDescription')}</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {t('teams.create.currentMembers', { count: members.length })}
                  </h3>
                  <div className="space-y-3">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center gap-3">
                          <img src={member.avatar_url} alt={member.username} className="w-8 h-8 rounded-full" />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{member.username}</p>
                            {member.id === teamDetail?.team.leader_id && (
                              <p className="text-xs text-yellow-600 dark:text-yellow-400">{t('teams.create.currentLeader')}</p>
                            )}
                            {member.id === formData.leader_id && formData.leader_id !== teamDetail?.team.leader_id && (
                              <p className="text-xs text-green-600 dark:text-green-400">{t('teams.create.willBecomeLeader')}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {member.country?.name || t('teams.create.unknown')}
                          </span>
                          {member.country?.code && (
                            <img
                              src={`/image/flag/${member.country.code.toLowerCase()}.svg`}
                              alt={member.country.name}
                              className="w-5 h-3"
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-6 py-3 border border-card text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {t('teams.create.cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center px-6 py-3 bg-osu-pink text-white rounded-lg hover:bg-osu-pink/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FiSave className="mr-2" />
                {isSubmitting ? t('teams.create.saving') : isEditing ? t('teams.create.saveChanges') : t('teams.create.createTeam')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateTeamPage;
