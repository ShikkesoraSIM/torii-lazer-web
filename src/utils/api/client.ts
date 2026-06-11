import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getDeviceUUID } from '../deviceUUID';
import { API_BASE_URL } from '../apiBaseUrl';

export { API_BASE_URL } from '../apiBaseUrl';

// Global verification handler, set by VerificationProvider
let globalVerificationHandler: ((error: any) => boolean) | null = null;

export const setGlobalVerificationHandler = (handler: (error: any) => boolean) => {
  globalVerificationHandler = handler;
};

// Helper to clear cached auth state
const clearAuthCache = () => {
  try {
    sessionStorage.removeItem('cached_user');
    sessionStorage.removeItem('cached_auth_status');
    sessionStorage.removeItem('cache_timestamp');
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
}> = [];

// Flush the pending-request queue
const processQueue = (error: Error | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  
  failedQueue = [];
};

// Function that refreshes the token
const refreshToken = async (): Promise<string> => {
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
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // First, check whether this is a user-verification error
    if (globalVerificationHandler && globalVerificationHandler(error)) {
      // If it's a verification error that's already handled, do nothing more
      return Promise.reject(error);
    }

    // Handle 401 errors (expired token)
    if (error.response?.status === 401 && !originalRequest._retry) {
      // If the failing request is the token refresh itself, just log out
      if (originalRequest.url?.includes('/oauth/token')) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        clearAuthCache(); // Clear the cache
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // A refresh is already in flight: queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
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

      originalRequest._retry = true;
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
        // Refresh failed: clear the local tokens and auth cache; let pages handle their own state
        processQueue(new Error('Token refresh failed'));
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        clearAuthCache(); // Clear the cache
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    return Promise.reject(error);
  }
);


