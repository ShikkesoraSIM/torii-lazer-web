import React, { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import UserProfileLayout from '../components/User/UserProfileLayout';
import ProfilePage from './ProfilePage';
import { useAuth } from '../contexts/AuthContext';
import { userAPI } from '../utils/api';
import type { User, GameMode, BestScore } from '../types';

const UserPage: React.FC = () => {
  const { t } = useTranslation();
  const { userId } = useParams<{ userId: string }>();
  const { user: authUser, isBootstrapping } = useAuth();

  // /users/{tu id} es tu perfil, con todo lo que eso implica (cambiar de modo
  // se guarda, por ejemplo). La diferencia con /profile es que ESTA url se
  // puede copiar y mandar: /profile muestra al que la abre, asi que pasarsela
  // a alguien nunca mostro tu perfil, le mostraba el de el.
  const isSelf = !isBootstrapping && authUser != null && String(authUser.id) === userId;
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
  // Marca de qué perfil ya le aplicamos el modo default del dueño, para no
  // volver a pisar la eleccion manual del que mira.
  const appliedOwnerModeUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (modeFromUrl) {
      setSelectedMode(modeFromUrl);
      appliedOwnerModeUserRef.current = userId ?? null;
      return;
    }
    // Arrancamos en el modo principal del dueño del perfil UNA sola vez (cuando
    // carga su data), y despues no tocamos mas el modo. Antes esto dependia de
    // selectedMode y revertia cada cambio manual: al elegir relax/autopilot (o
    // cualquier modo no-default) en el perfil de otro, snapeaba de vuelta al
    // default del dueño y se veia como que "no funciona".
    //
    // OJO: la ruta no tiene key, asi que al navegar de un perfil a otro se reusa
    // la instancia y el `user` viejo queda un toque hasta que resuelve el fetch.
    // Solo aplicamos (y marcamos el ref) cuando la data cargada es la de ESTE
    // perfil; matcheamos por id o username porque la URL puede traer cualquiera.
    const loadedMatchesParam =
      user != null &&
      (String(user.id) === userId ||
        (user.username != null && user.username.toLowerCase() === (userId ?? '').toLowerCase()));
    if (loadedMatchesParam && user.g0v0_playmode && appliedOwnerModeUserRef.current !== userId) {
      setSelectedMode(user.g0v0_playmode);
      appliedOwnerModeUserRef.current = userId ?? null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeFromUrl, user?.id, user?.g0v0_playmode, userId]);

  useEffect(() => {
    if (!userId) return;
    // Si el perfil es el tuyo lo dibuja ProfilePage con la data que el contexto
    // ya tiene, asi que pedirla de nuevo seria tirar un fetch de perfil + uno
    // de scores a la basura en cada visita a tu propio perfil.
    //
    // Pero hay que APAGAR loading antes de salir. Arranca en true y el unico
    // lugar que lo baja es el finally del fetch de abajo, que aca no corre: tu
    // propio perfil se quedaba girando para siempre y era la unica pagina de
    // todo el sitio que no podias ver. Y cuando isSelf se prende con el fetch
    // en vuelo pasa lo mismo por otro lado: el cleanup lo aborta y el finally
    // se saltea el setLoading porque justamente esta abortado.
    if (isSelf) {
      setLoading(false);
      return;
    }

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
  }, [userId, selectedMode, t, isSelf]);

  // Tu propio perfil se decide ANTES que loading y que error: no depende de
  // ningun fetch de esta pantalla, sale entero del contexto de auth. Preguntar
  // por loading primero lo dejaba tapado atras de un spinner que nadie iba a
  // apagar.
  if (isSelf) {
    return <ProfilePage />;
  }

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


