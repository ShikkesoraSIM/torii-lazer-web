import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Users } from 'lucide-react';
import { friendsAPI, handleApiError } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import FriendCard, { type FriendCardUser } from '../components/Friends/FriendCard';
import LoadingSpinner from '../components/UI/LoadingSpinner';

type FriendTab = 'followers' | 'following' | 'mutuals';

interface FriendRelation {
  target_id: number;
  mutual?: boolean;
  target?: FriendCardUser;
}

const TABS: FriendTab[] = ['followers', 'following', 'mutuals'];

const FriendsPage: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated, isBootstrapping } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTab = searchParams.get('tab') as FriendTab | null;
  const [tab, setTab] = useState<FriendTab>(
    initialTab && TABS.includes(initialTab) ? initialTab : 'followers'
  );
  const [followers, setFollowers] = useState<FriendRelation[]>([]);
  const [following, setFollowing] = useState<FriendRelation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // No pedir la lista antes de saber si hay sesion: el request salia sin
    // token, volvia 401 y pintaba un error rojo que se arreglaba solo un
    // segundo despues. Ahora directamente no sale hasta que sabemos.
    if (isBootstrapping) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // Both lists are small; fetch once and derive every tab client-side
        // so switching tabs is instant.
        const [incoming, outgoing] = await Promise.all([
          friendsAPI.getFollowers(),
          friendsAPI.getFriends(),
        ]);
        if (!cancelled) {
          setFollowers(Array.isArray(incoming) ? incoming : []);
          setFollowing(Array.isArray(outgoing) ? outgoing : []);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.detail || err?.message || 'Failed to load friends');
          handleApiError(err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Refetch when auth resolves — on a hard refresh the token may not be
    // ready on the first mount, so don't silently bail when unauthenticated.
  }, [isAuthenticated, isBootstrapping]);

  useEffect(() => {
    setSearchParams({ tab }, { replace: true });
  }, [tab, setSearchParams]);

  const mutuals = useMemo(() => following.filter((r) => r.mutual), [following]);
  const list = tab === 'followers' ? followers : tab === 'following' ? following : mutuals;

  const countFor = (key: FriendTab) =>
    key === 'followers' ? followers.length : key === 'following' ? following.length : mutuals.length;

  return (
    <div className="min-h-screen torii-page-stage">
      <div className="max-w-5xl mx-auto px-4 lg:px-6 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary mb-1.5">
            {t('friends.title')}
          </h1>
          <p className="text-sm sm:text-base text-text-secondary">
            {t('friends.subtitle')}
          </p>
        </div>

        <div className="mb-4 sm:mb-6">
          <div className="inline-flex torii-liquid-soft rounded-2xl p-1.5 sm:p-2 min-h-[44px] sm:min-h-[48px] items-center gap-1.5">
            {TABS.map((tabKey) => (
              <button
                key={tabKey}
                type="button"
                onClick={() => setTab(tabKey)}
                className={`text-sm sm:text-base ${
                  tab === tabKey ? 'torii-btn-primary' : 'torii-btn-glass'
                }`}
              >
                {t(`friends.tabs.${tabKey}`)}
                {!loading && ` (${countFor(tabKey)})`}
              </button>
            ))}
          </div>
        </div>

        <div className="relative z-10 torii-liquid rounded-3xl p-3 sm:p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <LoadingSpinner size="lg" className="mb-4" />
              <p className="text-text-muted font-medium">{t('common.loading')}</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="w-12 h-12 text-red-400/60 mb-3" />
              <p className="text-red-300 font-medium">{error}</p>
            </div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="w-12 h-12 text-white/30 mb-3" />
              <p className="text-white/60 font-medium">{t(`friends.empty.${tab}`)}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {list.map((rel) => (
                <FriendCard
                  key={rel.target_id}
                  user={rel.target ?? { id: rel.target_id, username: `#${rel.target_id}` }}
                  mutual={!!rel.mutual}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FriendsPage;
