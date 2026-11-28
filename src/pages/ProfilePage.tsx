import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import UserProfileLayout from '../components/User/UserProfileLayout';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import type { GameMode } from '../types';

const ProfilePage: React.FC<{ initialMode?: GameMode }> = ({ initialMode }) => {
  const { t } = useTranslation();
  const { user, isAuthenticated, isLoading, isBootstrapping, updateUserMode, updateUser } = useAuth();
  const [selectedMode, setSelectedMode] = useState<GameMode>(
    () => initialMode || user?.g0v0_playmode || 'osu'
  );
  const syncedInitialRef = useRef(false);

  // Sync user's saved playmode once when user arrives without an explicit initialMode
  useEffect(() => {
    if (initialMode) {
      setSelectedMode(initialMode);
      return;
    }
    if (!syncedInitialRef.current && user?.g0v0_playmode) {
      syncedInitialRef.current = true;
      setSelectedMode(user.g0v0_playmode);
    }
  }, [user?.g0v0_playmode, initialMode]);

  const handleModeChange = useCallback((mode: GameMode) => {
    setSelectedMode(mode);
    if (isAuthenticated && mode !== user?.g0v0_playmode) {
      void updateUserMode(mode).catch(() => {});
    }
  }, [isAuthenticated, user?.g0v0_playmode, updateUserMode]);

  if (isLoading || isBootstrapping) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center max-w-lg">
          <h2 className="text-2xl font-bold text-white mb-3">
            {t('messages.loginRequired.title')}
          </h2>
          <p className="text-slate-400 mb-6">
            {t('messages.loginRequired.description')}
          </p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-torii hover:bg-torii-hover text-white font-semibold transition-colors"
          >
            {t('auth.login.submit')}
          </Link>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="text-6xl mb-4 text-slate-400">😕</div>
        <h2 className="text-2xl font-bold text-white mb-2">{t('profile.errors.loadFailed')}</h2>
        <p className="text-slate-400">{t('profile.errors.tryRefresh')}</p>
      </div>
    );
  }

  return (
    <UserProfileLayout
      user={user}
      selectedMode={selectedMode}
      onModeChange={handleModeChange}
      onUserUpdate={updateUser}
    />
  );
};

export default ProfilePage;

