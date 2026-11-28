import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getDeviceUUID } from '../deviceUUID';
import { API_BASE_URL } from '../apiBaseUrl';
import { clearSessionTokens, hasSharedSession, restoreWebSession, sharedSessionUser, storeSessionTokens, WebSessionExpiredError } from '../webSession';

export { API_BASE_URL } from '../apiBaseUrl';

// Global verification handler, set by VerificationProvider
let globalVerificationHandler: ((error: any) => boolean) | null = null;

export const setGlobalVerificationHandler = (handler: (error: any) => boolean) => {
  globalVerificationHandler = handler;
};

export const AUTH_CACHE_KEYS = {
  USER: 'cached_user',
  AUTH_STATUS: 'cached_auth_status',
  CACHE_TIMESTAMP: 'cache_timestamp',
} as const;

// Helper to clear cached auth state
export const clearAuthCache = () => {
  try {
    sessionStorage.removeItem(AUTH_CACHE_KEYS.USER);
    sessionStorage.removeItem(AUTH_CACHE_KEYS.AUTH_STATUS);
    sessionStorage.removeItem(AUTH_CACHE_KEYS.CACHE_TIMESTAMP);
  } catch (error) {
    console.error('Failed to clear auth cache:', error);
  }
};

// IMPORTANT: do NOT hardcode `Content-Type` in the global defaults. axios
// v1's `transformRequest` uses `setContentTypeIfUnset` -- a no-op when the
// header is already set -- so any default we put here LEAKS into FormData
// requests and the multipart auto-detection never fires. FastAPI then sees
// application/json on what is actually a multipart body, can't parse any
// of the fields, and returns 422 with "Field required" on every required
// form field. Symptom: team creation (and any other multipart endpoint)
// quietly broken for everyone.
//
// Removing the default is safe because axios auto-derives the right header
// per body type: plain objects -> application/json, FormData -> multipart/
// form-data; boundary=..., URLSearchParams -> application/x-www-form-
// urlencoded. The only case axios DOESN'T auto-set is raw-string bodies,
// and we don't have any of those (verified via grep on the codebase).
//
// The May 8 fix dropped the per-call override in teamsAPI.createTeam et al.
// That fixed image-bearing edits because the runtime's File handling
// re-derives the boundary, but text-only edits and small multipart bodies
// still rode the global default. This removes the root cause.
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'x-api-version': '20250913',
  },
  withCredentials: false, // Don't send cookies, to avoid CORS issues
});

// Token-refresh state
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
  authUserId?: string | null;
}> = [];

// Flush the pending-request queue
const processQueue = (error: Error | null = null) => {
  const currentUser = sharedSessionUser();
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else if (prom.authUserId && currentUser && prom.authUserId !== currentUser) {
      prom.reject(new Error('The account changed. Reload the page.'));
    } else {
      prom.resolve(undefined);
    }
  });
  
  failedQueue = [];
};

// Function that refreshes the token
const refreshToken = async (): Promise<string> => {
  const remembered = await restoreWebSession();
  if (typeof remembered !== 'string') {
    const previousUser = sharedSessionUser();
    if (previousUser && previousUser !== remembered.user_id.toString()) {
      // No repetir una escritura de la cuenta anterior con la cuenta nueva.
      throw new WebSessionExpiredError('The account changed in another frontend. Reload the page.');
    }
    storeSessionTokens(remembered, true);
    return remembered.access_token;
  }
  if (remembered === 'missing' && hasSharedSession()) {
    throw new WebSessionExpiredError('Web session expired');
  }
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  // Import CLIENT_CONFIG lazily to avoid a circular dependency
  const { CLIENT_CONFIG } = await import('./config');
  
  const formData = new FormData();
  formData.append('grant_type', 'refresh_token');
  formData.append('client_id', CLIENT_CONFIG.web_client_id.toString());
  formData.append('client_secret', CLIENT_CONFIG.web_client_secret);
  formData.append('refresh_token', refreshToken);

  const deviceUUID = await getDeviceUUID();

  const response = await axios.post(`${API_BASE_URL}/oauth/token`, formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'x-api-version': '20250913',
      'X-UUID': deviceUUID,
    },
  });

  const { access_token, refresh_token: new_refresh_token } = response.data;

  // Update localStorage
  localStorage.setItem('access_token', access_token);
  localStorage.setItem('refresh_token', new_refresh_token);
  
  return access_token;
};

api.interceptors.request.use(
  async (config) => {
    (config as InternalAxiosRequestConfig & { _authUserId?: string | null })._authUserId ??= sharedSessionUser();
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Attach the device UUID to every request (fetched asynchronously)
    const deviceUUID = await getDeviceUUID();
    config.headers['X-UUID'] = deviceUUID;
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean; _authUserId?: string | null };

    // First, check whether this is a user-verification error
    if (globalVerificationHandler && globalVerificationHandler(error)) {
      // If it's a verification error that's already handled, do nothing more
      return Promise.reject(error);
    }

    // Handle 401 errors (expired token)
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (!localStorage.getItem('access_token') && !localStorage.getItem('refresh_token') && !hasSharedSession()) {
        return Promise.reject(error);
      }
      if (originalRequest._authUserId && sharedSessionUser() && originalRequest._authUserId !== sharedSessionUser()) {
        return Promise.reject(new Error('The account changed. Reload the page.'));
      }
      originalRequest._retry = true;
      // If the failing request is the token refresh itself, just log out
      if (originalRequest.url?.includes('/oauth/token')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // A refresh is already in flight: queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject, authUserId: originalRequest._authUserId });
        }).then(() => {
          // Token refreshed: resend the request
          const token = localStorage.getItem('access_token');
          if (token && originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      isRefreshing = true;

      try {
        const newToken = await refreshToken();

        // Update the token on the original request
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }

        // Flush the queued requests
        processQueue();

        // Resend the original request
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(new Error('Token refresh failed'));
        const expired = refreshError instanceof WebSessionExpiredError
          || (axios.isAxiosError(refreshError) && (
            refreshError.response?.status === 401
            || refreshError.response?.data?.error === 'invalid_grant'
          ));
        if (expired) {
          clearSessionTokens();
          clearAuthCache();
          window.dispatchEvent(new CustomEvent('torii:session-cleared'));
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    return Promise.reject(error);
  }
);


