import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { authAPI, userAPI, handleApiError, CLIENT_CONFIG, type RestrictionStatus } from '../utils/api';
import type { User, TokenResponse } from '../types';
import toast from 'react-hot-toast';
import { apiCache } from '../utils/apiCache';
import { AUTH_CACHE_KEYS, clearAuthCache } from '../utils/api/client';
import { resetGlobalWebSocket } from '../hooks/useWebSocketNotifications';
import { clearPendingLogout, clearSessionTokens, hasPendingLogout, hasSharedSession, logoutWebSession, rememberWebSession, restoreWebSession, storeSessionTokens } from '../utils/webSession';

interface AuthContextType {
  user: User | null;
  restriction: RestrictionStatus | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  // Si todavia estamos averiguando quien sos. Distinto de isLoading, que es
  // "hay un login en curso". Mientras esto sea true nadie puede decidir nada
  // sobre la sesion: ver el comentario en isBootstrapping.
  isBootstrapping: boolean;
  login: (username: string, password: string, turnstileToken?: string) => Promise<boolean>;
  register: (username: string, email: string, password: string, turnstileToken?: string) => Promise<boolean>;
  logout: () => void;
  updateUserMode: (mode?: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// Cache lifetime (ms) - 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

// Cache helpers
const CacheUtil = {
  // Save user data to the cache
  saveUserCache: (user: User) => {
    try {
      sessionStorage.setItem(AUTH_CACHE_KEYS.USER, JSON.stringify(user));
      sessionStorage.setItem(AUTH_CACHE_KEYS.AUTH_STATUS, 'true');
      sessionStorage.setItem(AUTH_CACHE_KEYS.CACHE_TIMESTAMP, Date.now().toString());
    } catch (error) {
      console.error('Failed to save user cache:', error);
    }
  },

  // Read user data from the cache
  getUserCache: (): { user: User | null; isAuthenticated: boolean; isValid: boolean } => {
    try {
      const timestamp = sessionStorage.getItem(AUTH_CACHE_KEYS.CACHE_TIMESTAMP);
      const authStatus = sessionStorage.getItem(AUTH_CACHE_KEYS.AUTH_STATUS);
      const userJson = sessionStorage.getItem(AUTH_CACHE_KEYS.USER);

      // Check that the cache exists
      if (!timestamp || !authStatus || !userJson) {
        return { user: null, isAuthenticated: false, isValid: false };
      }

      // Check whether the cache has expired
      const cacheAge = Date.now() - parseInt(timestamp, 10);
      if (cacheAge > CACHE_DURATION) {
        clearAuthCache();
        return { user: null, isAuthenticated: false, isValid: false };
      }

      // Return the cached data
      const user = JSON.parse(userJson) as User;
      return {
        user,
        isAuthenticated: authStatus === 'true',
        isValid: true,
      };
    } catch (error) {
      console.error('Failed to read user cache:', error);
      clearAuthCache();
      return { user: null, isAuthenticated: false, isValid: false };
    }
  },

  clearCache: clearAuthCache,
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  // isLoading tracks active login / register operations only — it starts false so
  // the login form is immediately interactive regardless of how long the initial
  // auth-check takes.
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // Arranca en true y baja recien cuando terminamos de mirar si hay sesion.
  //
  // Sin esto, durante todo el arranque el estado era IDENTICO al de alguien
  // deslogueado (user null, isAuthenticated false, isLoading false), asi que
  // cualquier pantalla que pregunte "estas logueado?" contestaba que no y te
  // mandaba a la home antes de que la respuesta llegara. Por eso entrar a un
  // link pegado te tiraba a la portada mientras que llegar por un boton
  // andaba: para cuando apretas el boton la respuesta ya llego hace rato.
  //
  // Y por eso pasaba "a veces": es una carrera entre bajar el chunk de la
  // pagina y que conteste getMe(). getMe() sale perdiendo cuando la api esta
  // en otro dominio (dns + tls + preflight), cuando es la primera visita (hay
  // que calcular la huella del dispositivo antes de mandar el request) y
  // cuando abris en una pestania nueva (el cache es por pestania, siempre
  // vacio). Las tres cosas pasan justo cuando alguien abre un link que le
  // pasaron, que es exactamente el caso que se rompia.
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [restriction, setRestriction] = useState<RestrictionStatus | null>(null);
  const authEpoch = useRef(0);
  const { t } = useTranslation();

  useEffect(() => {
    const clearState = () => {
      authEpoch.current++;
      resetGlobalWebSocket();
      setUser(null);
      setIsAuthenticated(false);
      setRestriction(null);
      CacheUtil.clearCache();
      apiCache.clearCache();
    };
    const storageChanged = (event: StorageEvent) => {
      if (event.key === 'access_token' && event.newValue === null) clearState();
    };
    window.addEventListener('torii:session-cleared', clearState);
    window.addEventListener('storage', storageChanged);
    return () => {
      window.removeEventListener('torii:session-cleared', clearState);
      window.removeEventListener('storage', storageChanged);
    };
  }, []);

  // Pull restriction status from the one endpoint that does NOT 403 a
  // restricted user. Safe to call whenever a token exists; returns
  // { is_restricted: false } for everyone else. Drives RestrictionBanner.
  const checkRestriction = useCallback(async (): Promise<RestrictionStatus | null> => {
    const epoch = authEpoch.current;
    try {
      const status = await userAPI.getRestriction();
      if (epoch === authEpoch.current) setRestriction(status);
      return status;
    } catch {
      if (epoch === authEpoch.current) setRestriction(null);
      return null;
    }
  }, []);

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      const epoch = authEpoch.current;
      if (hasPendingLogout()) {
        clearSessionTokens();
        CacheUtil.clearCache();
        await logoutWebSession().catch(() => {});
        return;
      }
      try {
        const remembered = await restoreWebSession();
        if (epoch !== authEpoch.current) return;
        if (typeof remembered !== 'string') {
          if (remembered.access_token !== localStorage.getItem('access_token')) {
            CacheUtil.clearCache();
            apiCache.clearCache();
          }
          storeSessionTokens(remembered, true);
        } else if (remembered === 'missing' && hasSharedSession()) {
          clearSessionTokens();
          CacheUtil.clearCache();
          apiCache.clearCache();
          return;
        }
      } catch {
        // Un corte de red no invalida los tokens que ya teniamos.
      }
      if (epoch !== authEpoch.current) return;
      const token = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');

      // No token, nothing to do
      if (!token && !refreshToken) {
        CacheUtil.clearCache();
        return;
      }

      // We have a session: check restriction status in the background so the
      // banner shows even when getMe() below 403s. A restricted account can't
      // load its own profile, but it must still see why.
      void checkRestriction();

      // Try reading from the cache
      const cachedData = CacheUtil.getUserCache();
      if (cachedData.isValid && cachedData.user) {
        console.log(t('auth.context.cache.usingCachedState'));
        setUser(cachedData.user);
        setIsAuthenticated(cachedData.isAuthenticated);

        // Revalidate in the background so team/mode/profile changes show up quickly.
        void (async () => {
          try {
            const freshUser = await userAPI.getMe();
            if (epoch !== authEpoch.current) return;
            setUser(freshUser);
            setIsAuthenticated(true);
            CacheUtil.saveUserCache(freshUser);
            if (!hasSharedSession()) void rememberWebSession();
          } catch (error) {
            if (epoch !== authEpoch.current) return;
            const err = error as { response?: { status?: number } };
            if (err.response?.status === 401) {
              setUser(null);
              setIsAuthenticated(false);
              CacheUtil.clearCache();
            } else {
              console.error('Background auth revalidation failed:', error);
            }
          }
        })();

        return;
      }

      // Cache invalid or missing, hit the API — run without blocking isLoading so the
      // login form stays interactive while we wait for the server.
      try {
        console.log(t('auth.context.cache.fetchingFromApi'));
        const userData = await userAPI.getMe();
        if (epoch !== authEpoch.current) return;
        setUser(userData);
        setIsAuthenticated(true);
        // Save to the cache
        CacheUtil.saveUserCache(userData);
        if (!hasSharedSession()) void rememberWebSession();
      } catch (error) {
        if (epoch !== authEpoch.current) return;
        // If fetching the user fails, the axios interceptor automatically tries to
        // refresh the token; here we only handle the case where the refresh failed.
        const err = error as { response?: { status?: number } };

        // A 401 after the redirect to the login page means the refresh failed.
        // Other errors may be network issues, so we should not clear the token.
        if (err.response?.status === 401) {
          // The interceptor handles the redirect; here we only clear state
          setUser(null);
          setIsAuthenticated(false);
          CacheUtil.clearCache();
        } else {
          // Other errors: keep the session, likely a network problem
          console.error('Failed to fetch user data:', error);
        }
      }
    };

    // finally y no un setIsBootstrapping al final del cuerpo: checkAuth sale
    // por tres lados distintos (sin token, cache valido, y el camino largo por
    // la api) y si alguno se olvida de bajar la bandera la pagina se queda
    // girando para siempre.
    void checkAuth().finally(() => setIsBootstrapping(false));
  }, []);

  const login = useCallback(async (username: string, password: string, turnstileToken?: string): Promise<boolean> => {
    authEpoch.current++;
    try {
      setIsLoading(true);
      const tokenResponse: TokenResponse = await authAPI.login(
        username,
        password,
        CLIENT_CONFIG.web_client_id,
        CLIENT_CONFIG.web_client_secret,
        turnstileToken
      );

      // Store tokens
      clearPendingLogout();
      localStorage.setItem('access_token', tokenResponse.access_token);
      localStorage.setItem('refresh_token', tokenResponse.refresh_token);

      // Get user data
      try {
        const userData = await userAPI.getMe();
        await rememberWebSession();
        setUser(userData);
        setIsAuthenticated(true);

        // Save to the cache
        CacheUtil.saveUserCache(userData);

        // Normal accounts aren't restricted, but check in the background so the
        // banner stays correct if a restriction landed mid-session.
        void checkRestriction();

        toast.success(t('auth.context.messages.welcomeBack', { username: userData.username }));
        return true;
      } catch (meError) {
        // A restricted account authenticates fine (the token is issued) but
        // getMe() 403s. Don't show a generic "login failed" — surface the
        // restriction instead, so the banner can explain it.
        const meStatus = (meError as { response?: { status?: number } }).response?.status;
        if (meStatus === 403) {
          const status = await checkRestriction();
          if (status?.is_restricted) {
            // The global banner (also rendered on /login) carries the details.
            // Returning false keeps them on the login page rather than bouncing
            // to a profile they can't load.
            return false;
          }
        }
        throw meError;
      }
    } catch (error) {
      handleApiError(error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [t, checkRestriction]);

  const register = useCallback(async (username: string, email: string, password: string, turnstileToken?: string): Promise<boolean> => {
    authEpoch.current++;
    try {
      setIsLoading(true);
      // El register ahora devuelve el OAuth token directo (server auto-login). Antes no devolvia el
      // token y habia que hacer un segundo login, que reusaba el token de Turnstile (single-use) ya
      // quemado en el register -> ese login fallaba -> no redirigia -> el user reintentaba -> le salia
      // "already taken" aunque la cuenta ya estaba creada.
      const tokenResponse = await authAPI.register(username, email, password, turnstileToken);

      if (tokenResponse?.access_token) {
        clearPendingLogout();
        localStorage.setItem('access_token', tokenResponse.access_token);
        localStorage.setItem('refresh_token', tokenResponse.refresh_token);

        const userData = await userAPI.getMe();
        await rememberWebSession();
        setUser(userData);
        setIsAuthenticated(true);
        CacheUtil.saveUserCache(userData);
        void checkRestriction();
        toast.success(t('auth.context.messages.registerSuccess'));
        return true;
      }

      // Fallback defensivo (servidor viejo que aun no devuelve token en el register): login normal.
      return await login(username, password, turnstileToken);
    } catch (error) {
      const err = error as {
        response?: { status?: number; data?: { form_error?: { user?: { username?: string[]; user_email?: string[]; password?: string[] }; message?: string } } };
      };
      if (err.response?.status === 422 && err.response?.data?.form_error) {
        const formError = err.response.data.form_error;
        if (formError.user) {
          const {
            username: usernameErrors = [],
            user_email: emailErrors = [],
            password: passwordErrors = [],
          } = formError.user;

          if (usernameErrors.length > 0) {
            toast.error(t('auth.context.errors.username', { message: usernameErrors[0] }));
          } else if (emailErrors.length > 0) {
            toast.error(t('auth.context.errors.email', { message: emailErrors[0] }));
          } else if (passwordErrors.length > 0) {
            toast.error(t('auth.context.errors.password', { message: passwordErrors[0] }));
          }
        } else if (formError.message) {
          toast.error(formError.message);
        }
      } else {
        handleApiError(error);
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [t, login, checkRestriction]);

  const logout = useCallback(() => {
    authEpoch.current++;
    resetGlobalWebSocket();
    clearSessionTokens();
    void logoutWebSession().catch(() => {});
    setUser(null);
    setIsAuthenticated(false);
    setRestriction(null);
    // Clear both the sessionStorage user cache AND the in-memory apiCache
    // (user/channel/message maps) so the next account in the same tab can't see
    // the previous user's cached data.
    CacheUtil.clearCache();
    apiCache.clearCache();
    toast.success(t('auth.context.messages.logoutSuccess'));
  }, [t]);

  const updateUserMode = useCallback(async (mode?: string) => {
    if (!isAuthenticated) return;
    
    try {
      const userData = await userAPI.getMe(mode);
      setUser(userData);
      // Update the cache
      CacheUtil.saveUserCache(userData);
    } catch (error) {
      handleApiError(error);
    }
  }, [isAuthenticated]);

  const refreshUser = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const userData = await userAPI.getMe();
      setUser(userData);
      // Update the cache
      CacheUtil.saveUserCache(userData);
    } catch (error) {
      handleApiError(error);
    }
  }, [isAuthenticated]);

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
    // Update the cache
    CacheUtil.saveUserCache(updatedUser);
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      restriction,
      isLoading,
      isAuthenticated,
      isBootstrapping,
      login,
      register,
      logout,
      updateUserMode,
      refreshUser,
      updateUser,
    }),
    [
      user,
      restriction,
      isLoading,
      isAuthenticated,
      isBootstrapping,
      login,
      register,
      logout,
      updateUserMode,
      refreshUser,
      updateUser,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  const { t } = useTranslation();
  if (context === undefined) {
    throw new Error(t('auth.context.errors.hookUsage'));
  }
  return context;
};
