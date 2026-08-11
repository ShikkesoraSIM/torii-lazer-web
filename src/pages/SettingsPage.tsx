import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiUser, FiCheck, FiX, FiImage, FiCamera, FiShield, FiMonitor, FiLock, FiSettings, FiKey, FiTrash2 } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { userAPI, type TOTPStatus, type PendingUsernameChange } from '../utils/api';
import EditableCover from '../components/UI/EditableCover';
import Avatar from '../components/UI/Avatar';
import AvatarUpload from '../components/UI/AvatarUpload';
import TotpSetupModal from '../components/TOTP/TotpSetupModal';
import TotpDisableModal from '../components/TOTP/TotpDisableModal';
import SessionManagement from '../components/Device/SessionManagement';
import TrustedDeviceManagement from '../components/Device/TrustedDeviceManagement';
import PasswordResetSection from '../components/Settings/PasswordResetSection';
import UserPreferencesSection from '../components/Settings/UserPreferencesSection';
import OAuthAppsSection from '../components/Settings/OAuthAppsSection';
import AurasSection from '../components/Settings/AurasSection';
import AvatarDefaultOptOut from '../components/Settings/AvatarDefaultOptOut';

const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated, isLoading, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAvatarUpload, setShowAvatarUpload] = useState(false);
  const [deletingAvatar, setDeletingAvatar] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<PendingUsernameChange | null>(null);
  const isPending = pendingRequest?.status === 'pending';
  const isResolved = !!pendingRequest && pendingRequest.status !== 'pending';

  const handleDismissUsernameResult = async () => {
    try {
      await userAPI.acknowledgeUsernameChangeRequest();
    } finally {
      setPendingRequest(null);
    }
  };
  
  const [totpStatus, setTotpStatus] = useState<TOTPStatus | null>(null);
  const [isLoadingTotpStatus, setIsLoadingTotpStatus] = useState(true);
  const [showTotpSetup, setShowTotpSetup] = useState(false);
  const [showTotpDisable, setShowTotpDisable] = useState(false);

  const fetchTotpStatus = async () => {
    try {
      const status = await userAPI.totp.getStatus();
      setTotpStatus(status);
    } catch {
      setTotpStatus({ enabled: false });
    } finally {
      setIsLoadingTotpStatus(false);
    }
  };

  const handleTotpSetupSuccess = () => {
    setTotpStatus({ enabled: true, created_at: new Date().toISOString() });
    toast.success(t('settings.totp.setupSuccess'));
  };

  const handleTotpDisableSuccess = () => {
    setTotpStatus({ enabled: false });
    toast.success(t('settings.totp.disableSuccess'));
  };

  const fetchPendingUsernameRequest = async () => {
    try {
      const req = await userAPI.getUsernameChangeRequest();
      setPendingRequest(req);
    } catch { /* non-fatal */ }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchTotpStatus();
      fetchPendingUsernameRequest();
    }
  }, [isAuthenticated, user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-osu-pink"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center max-w-lg">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            {t('messages.loginRequired.title')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('messages.loginRequired.description')}
          </p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-osu-pink text-white font-semibold hover:bg-osu-pink/90 transition-colors"
          >
            {t('auth.login.submit')}
          </Link>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="text-6xl mb-4">😕</div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
          {t('settings.errors.loadFailed')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {t('settings.errors.tryRefresh')}
        </p>
      </div>
    );
  }

  const handleStartEdit = () => {
    setNewUsername(user.username);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setNewUsername('');
  };

  const handleSubmitUsername = async () => {
    if (!newUsername.trim()) {
      toast.error(t('settings.username.errors.empty'));
      return;
    }

    if (newUsername.trim() === user.username) {
      toast.error(t('settings.username.errors.sameAsOld'));
      return;
    }

    setIsSubmitting(true);
    try {
      const req = await userAPI.rename(newUsername.trim());

      setPendingRequest(req);
      toast.success(t('settings.username.requestSubmitted'));
      setIsEditing(false);
      setNewUsername('');
    } catch (error) {
      const err = error as { status?: number; message?: string };
      if (err.status === 409) {
        if (err.message && /pending/i.test(err.message)) {
          toast.error(t('settings.username.errors.alreadyPending'));
        } else {
          toast.error(t('settings.username.errors.taken'));
        }
      } else if (err.status === 404) {
        toast.error(t('settings.username.errors.userNotFound'));
      } else if (err.status === 403) {
        toast.error(err.message || t('settings.username.errors.failed'));
      } else {
        toast.error(t('settings.username.errors.failed'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAvatarUpdate = async (_newAvatarUrl: string) => {
    toast.success(t('settings.avatar.success'));
    setShowAvatarUpload(false);

    setTimeout(async () => {
      await refreshUser();
    }, 2000);
  };

  const handleDeleteAvatar = async () => {
    if (!window.confirm('Delete your avatar and go back to a default? You can upload a new one anytime.')) {
      return;
    }
    setDeletingAvatar(true);
    try {
      await userAPI.deleteAvatar();
      toast.success('Avatar deleted.');
      await refreshUser();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to delete avatar.');
    } finally {
      setDeletingAvatar(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {t('settings.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('settings.description')}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-xl shadow-lg p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <FiUser className="w-6 h-6 text-osu-pink" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('settings.username.title')}
          </h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('settings.username.current')}
            </label>
            {!isEditing ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-medium text-gray-900 dark:text-white">
                    {user.username}
                  </span>
                  {!isPending && (
                    <button
                      onClick={handleStartEdit}
                      className="btn-secondary !px-4 !py-2 text-sm"
                    >
                      {t('settings.username.change')}
                    </button>
                  )}
                </div>
                {isPending && (
                  <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm">
                    <div className="font-semibold text-amber-600 dark:text-amber-300">
                      {t('settings.username.pendingReview')}
                    </div>
                    <div className="text-gray-600 dark:text-gray-300 mt-0.5">
                      {t('settings.username.pendingDesc', { name: pendingRequest!.requested_username })}
                    </div>
                  </div>
                )}
                  {isResolved && (
                    <div
                      className={`rounded-lg border px-4 py-3 text-sm ${
                        pendingRequest!.status === 'approved'
                          ? 'border-emerald-400/40 bg-emerald-400/10'
                          : 'border-rose-400/40 bg-rose-400/10'
                      }`}
                    >
                      <div
                        className={`font-semibold ${
                          pendingRequest!.status === 'approved'
                            ? 'text-emerald-600 dark:text-emerald-300'
                            : 'text-rose-600 dark:text-rose-300'
                        }`}
                      >
                        {pendingRequest!.status === 'approved'
                          ? t('settings.username.approvedTitle')
                          : t('settings.username.rejectedTitle')}
                      </div>
                      <div className="text-gray-600 dark:text-gray-300 mt-0.5">
                        {pendingRequest!.status === 'approved'
                          ? t('settings.username.approvedDesc', { name: pendingRequest!.requested_username })
                          : t('settings.username.rejectedDesc', { name: pendingRequest!.requested_username })}
                      </div>
                      {pendingRequest!.status === 'rejected' && pendingRequest!.reject_reason && (
                        <div className="text-gray-600 dark:text-gray-300 mt-1">
                          {t('settings.username.rejectedReason', { reason: pendingRequest!.reject_reason })}
                        </div>
                      )}
                      <button
                        onClick={handleDismissUsernameResult}
                        className="btn-secondary !px-3 !py-1.5 text-xs mt-3"
                      >
                        {t('settings.username.dismiss')}
                      </button>
                    </div>
                  )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-osu-pink focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder={t('settings.username.placeholder')}
                    maxLength={50}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {t('settings.username.hint')}
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={handleSubmitUsername}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 btn-primary !px-4 !py-2 !text-sm !inline-flex disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiCheck className="w-4 h-4" />
                    {isSubmitting ? t('settings.username.saving') : t('settings.username.save')}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 btn-secondary !px-4 !py-2 !text-sm !inline-flex disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiX className="w-4 h-4" />
                    {t('settings.username.cancel')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-card rounded-xl shadow-lg p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <FiCamera className="w-6 h-6 text-osu-pink" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('settings.avatar.title')}
          </h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('settings.avatar.current')}
            </label>
            <div className="flex items-center gap-4">
              <Avatar
                userId={user.id}
                username={user.username}
                avatarUrl={user.avatar_url}
                size="lg"
                shape="rounded"
                editable={false}
                className="!w-16 !h-16"
              />
              <div className="flex-1">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setShowAvatarUpload(true)}
                    className="btn-primary !px-4 !py-2 text-sm flex items-center gap-2"
                  >
                    <FiCamera className="w-4 h-4" />
                    {t('settings.avatar.change')}
                  </button>
                  {user.avatar_url && !user.avatar_url.includes('/file/avatars/default-') && (
                    <button
                      onClick={handleDeleteAvatar}
                      disabled={deletingAvatar}
                      className="!px-4 !py-2 text-sm flex items-center gap-2 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <FiTrash2 className="w-4 h-4" />
                      {deletingAvatar ? 'Deleting…' : 'Delete avatar'}
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {t('settings.avatar.hint')}
                </p>
              </div>
            </div>

            {(!user.avatar_url || user.avatar_url.includes('/file/avatars/default-')) && (
              <AvatarDefaultOptOut onChanged={refreshUser} />
            )}
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card rounded-xl shadow-lg p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <FiImage className="w-6 h-6 text-osu-pink" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('settings.cover.title')}
          </h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('settings.cover.label')}
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              {t('settings.cover.hint')}
            </p>
            <EditableCover
              userId={user.id}
              username={user.username}
              coverUrl={user.cover_url}
              editable={true}
              onCoverUpdate={() => {}}
            />
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.225 }}
        className="bg-card rounded-xl shadow-lg p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <FiLock className="w-6 h-6 text-osu-pink" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('settings.password.title')}
          </h2>
        </div>

        <PasswordResetSection />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-card rounded-xl shadow-lg p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <FiShield className="w-6 h-6 text-osu-pink" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('settings.totp.title')}
          </h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('settings.totp.status')}
            </label>
            {isLoadingTotpStatus ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-osu-pink"></div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {t('settings.totp.checking')}
                </span>
              </div>
            ) : totpStatus ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${totpStatus.enabled ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <div>
                    <span className={`font-medium ${totpStatus.enabled ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      {totpStatus.enabled ? t('settings.totp.enabled') : t('settings.totp.disabled')}
                    </span>
                    {totpStatus.enabled && totpStatus.created_at && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t('settings.totp.enabledSince', {
                          date: new Date(totpStatus.created_at).toLocaleDateString(i18n.language === 'zh' ? 'zh-CN' : 'en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })
                        })}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {!totpStatus.enabled ? (
                    <button
                      onClick={() => setShowTotpSetup(true)}
                      className="btn-primary !px-4 !py-2 text-sm"
                    >
                      {t('settings.totp.enable')}
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowTotpDisable(true)}
                      className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                    >
                      {t('settings.totp.disable')}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-sm text-red-500">
                {t('settings.totp.loadError')}
              </div>
            )}
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {t('settings.totp.description')}
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.26 }}
        className="bg-card rounded-xl shadow-lg p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <FiKey className="w-6 h-6 text-osu-pink" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('settings.oauth.title')}
          </h2>
        </div>

        <OAuthAppsSection />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.275 }}
        className="bg-card rounded-xl shadow-lg p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <FiSettings className="w-6 h-6 text-osu-pink" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('settings.preferences.title')}
          </h2>
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('settings.preferences.description')}
          </p>
        </div>

        <UserPreferencesSection />
      </motion.div>

      {/* User Aura cosmetic picker */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.29 }}
        className="bg-card rounded-xl shadow-lg p-6"
      >
        <AurasSection />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-card rounded-xl shadow-lg p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <FiMonitor className="w-6 h-6 text-osu-pink" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('settings.device.title')}
          </h2>
        </div>
        
        <div className="mb-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('settings.device.description')}
          </p>
        </div>

        <div className="mb-8">
          <SessionManagement />
        </div>

        <div className="border-t border-card my-8"></div>

        <div>
          <TrustedDeviceManagement />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-card rounded-xl shadow-lg p-6"
      >
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          {t('settings.account.title')}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('settings.account.userId')}
            </label>
            <div className="px-4 py-3 bg-white/5 rounded-lg">
              <span className="text-gray-900 dark:text-white font-mono">
                {user.id}
              </span>
            </div>
          </div>

          {user.join_date && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('settings.account.joinDate')}
              </label>
              <div className="px-4 py-3 bg-white/5 rounded-lg">
                <span className="text-gray-900 dark:text-white">
                  {new Date(user.join_date).toLocaleDateString(i18n.language === 'zh' ? 'zh-CN' : 'en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>
          )}

          {user.country && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('settings.account.country')}
              </label>
              <div className="px-4 py-3 bg-white/5 rounded-lg">
                <div className="flex items-center gap-2">
                  <img
                    src={`https://flagcdn.com/w20/${user.country.code.toLowerCase()}.png`}
                    alt={user.country.code}
                    className="w-5 h-auto"
                  />
                  <span className="text-gray-900 dark:text-white">
                    {user.country.name}
                  </span>
                </div>
              </div>
            </div>
          )}

          {user.last_visit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('settings.account.lastVisit')}
              </label>
              <div className="px-4 py-3 bg-white/5 rounded-lg">
                <span className="text-gray-900 dark:text-white">
                  {new Date(user.last_visit).toLocaleDateString(i18n.language === 'zh' ? 'zh-CN' : 'en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {showAvatarUpload && (
        <AvatarUpload
          userId={user.id}
          currentAvatarUrl={user.avatar_url}
          onUploadSuccess={handleAvatarUpdate}
          onClose={() => setShowAvatarUpload(false)}
        />
      )}

      <div>
      <TotpSetupModal
        isOpen={showTotpSetup}
        onClose={() => setShowTotpSetup(false)}
        onSuccess={handleTotpSetupSuccess}
      />
       </div>

      <TotpDisableModal
        isOpen={showTotpDisable}
        onClose={() => setShowTotpDisable(false)}
        onSuccess={handleTotpDisableSuccess}
      />
    </div>
  );
};

export default SettingsPage;
