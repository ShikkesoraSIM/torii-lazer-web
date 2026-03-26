import React, { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import UserProfileLayout from '../components/User/UserProfileLayout';
import { userAPI } from '../utils/api';
import type { User, GameMode, BestScore } from '../types';

const UserPage: React.FC = () => {
  const { t } = useTranslation();
  const { userId } = useParams<{ userId: string }>();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [prefetchedBestScores, setPrefetchedBestScores] = useState<BestScore[] | null>(null);
  const [prefetchedBestScoresKey, setPrefetchedBestScoresKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const modeFromUrl = searchParams.get('mode') as GameMode | null;
  const [selectedMode, setSelectedMode] = useState<GameMode>(modeFromUrl || 'osu');

  const abortControllerRef = useRef<AbortController | null>(null);
  const latestModeRef = useRef<GameMode>(selectedMode);

  useEffect(() => {
    if (modeFromUrl) {
      setSelectedMode(modeFromUrl);
    } else if (user?.g0v0_playmode && selectedMode !== user.g0v0_playmode) {
      setSelectedMode(user.g0v0_playmode);
    }
  }, [modeFromUrl, user?.g0v0_playmode, selectedMode]);

  useEffect(() => {
    if (!userId) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    latestModeRef.current = selectedMode;

    setLoading(true);
    setError(null);
    setPrefetchedBestScores(null);
    setPrefetchedBestScoresKey(null);

    const numericUserId = Number(userId);
    const scoresPrefetchKey = `${numericUserId}:${selectedMode}`;

    Promise.allSettled([
      userAPI.getUser(userId, selectedMode),
      userAPI.getBestScores(numericUserId, selectedMode, 6, 0),
    ])
      .then(([userResult, bestScoresResult]) => {
        if (userResult.status !== 'fulfilled') {
          throw userResult.reason;
        }

        if (!abortController.signal.aborted && latestModeRef.current === selectedMode) {
          setUser(userResult.value);
          setError(null);

          if (bestScoresResult.status === 'fulfilled' && Array.isArray(bestScoresResult.value)) {
            setPrefetchedBestScores(bestScoresResult.value);
            setPrefetchedBestScoresKey(scoresPrefetchKey);
          }
        }
      })
      .catch((err: unknown) => {
        if (abortController.signal.aborted) return;

        const message = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
        setError(message || t('profile.errors.loadFailed'));
        setUser(null);
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      abortController.abort();
    };
  }, [userId, selectedMode, t]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-osu-pink" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="text-6xl mb-4">:(</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('profile.errors.userNotFound')}</h2>
        <p className="text-gray-600">{error || t('profile.errors.checkId')}</p>
      </div>
    );
  }

  return (
    <div className="torii-page-stage min-h-screen">
      <UserProfileLayout
        user={user}
        selectedMode={selectedMode}
        onModeChange={setSelectedMode}
        onUserUpdate={setUser}
        initialBestScores={prefetchedBestScores}
        initialBestScoresKey={prefetchedBestScoresKey}
      />
    </div>
  );
};

export default UserPage;


