import axios from 'axios';
import type { TokenResponse } from '../types';
import { API_BASE_URL } from './apiBaseUrl';
import { getDeviceUUID } from './deviceUUID';

const SHARED = 'torii_shared_auth';
const LOGOUT_PENDING = 'torii_logout_pending';
const SHARED_USER = 'torii_shared_user_id';
const LOGOUT_PENDING_TTL_MS = 60_000;
type RememberedSession = TokenResponse & { user_id: number };
type RestoreResult = RememberedSession | 'missing' | 'unsupported';
let restoring: Promise<RestoreResult> | null = null;
const sessionApi = axios.create({
  baseURL: `${API_BASE_URL}/api/private/web-session`,
  withCredentials: true,
  timeout: 8000,
  headers: { 'X-Torii-Session': '1', 'x-api-version': '20250913' },
});

export class WebSessionExpiredError extends Error {}

const safeGetItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSetItem = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage quota / restriction errors
  }
};

const safeRemoveItem = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage removal errors
  }
};

export const hasSharedSession = () => safeGetItem(SHARED) === '1';

export const hasPendingLogout = () => {
  const raw = safeGetItem(LOGOUT_PENDING);
  if (!raw) return false;
  if (raw === '1') return true;
  const ts = Number(raw);
  if (!Number.isFinite(ts) || Date.now() - ts > LOGOUT_PENDING_TTL_MS) {
    safeRemoveItem(LOGOUT_PENDING);
    return false;
  }
  return true;
};

export const sharedSessionUser = () => safeGetItem(SHARED_USER);

export function clearPendingLogout(): void {
  safeRemoveItem(LOGOUT_PENDING);
}

export function storeSessionTokens(tokens: TokenResponse & { user_id?: number }, shared = false): void {
  safeRemoveItem(LOGOUT_PENDING);
  safeSetItem('access_token', tokens.access_token);
  safeSetItem('refresh_token', tokens.refresh_token);
  if (shared) safeSetItem(SHARED, '1');
  if (tokens.user_id !== undefined) safeSetItem(SHARED_USER, tokens.user_id.toString());
}

export function clearSessionTokens(): void {
  safeRemoveItem('access_token');
  safeRemoveItem('refresh_token');
  safeRemoveItem(SHARED);
  safeRemoveItem(SHARED_USER);
  window.dispatchEvent(new Event('torii:session-cleared'));
}

async function requestRestoredSession(): Promise<RestoreResult> {
  try {
    const result = await sessionApi.post<RememberedSession>('/restore', null, {
      headers: { 'X-UUID': await getDeviceUUID() },
    });
    return result.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) return 'missing';
      if (error.response?.status === 404) return 'unsupported';
    }
    throw error;
  }
}

export function restoreWebSession(): Promise<RestoreResult> {
  restoring ??= requestRestoredSession().finally(() => { restoring = null; });
  return restoring;
}

export async function rememberWebSession(): Promise<boolean> {
  try {
    const result = await sessionApi.post<{ user_id: number }>('/link', null, {
      headers: {
        Authorization: `Bearer ${safeGetItem('access_token')}`,
        'X-UUID': await getDeviceUUID(),
      },
    });
    safeSetItem(SHARED, '1');
    safeSetItem(SHARED_USER, result.data.user_id.toString());
    safeRemoveItem(LOGOUT_PENDING);
    return true;
  } catch {
    // El login normal sigue andando si el puente esta temporalmente caido.
    return false;
  }
}

export async function logoutWebSession(): Promise<void> {
  safeSetItem(LOGOUT_PENDING, String(Date.now()));
  try {
    await sessionApi.post('/logout');
    safeRemoveItem(LOGOUT_PENDING);
  } catch (error) {
    if (axios.isAxiosError(error) && (error.response?.status === 404 || error.response?.status === 401)) {
      safeRemoveItem(LOGOUT_PENDING);
      return;
    }
    throw error;
  }
}
