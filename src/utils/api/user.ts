import type { AxiosRequestConfig } from 'axios';

import { API_BASE_URL, api } from './client';

// TOTP-related type definitions
export interface TOTPStatus {
  enabled: boolean;
  created_at?: string;
}

export interface TOTPCreateStart {
  secret: string;
  uri: string;
}

export type TOTPBackupCodes = string[];
export type UserBeatmapsetType = 'ranked' | 'pending' | 'loved' | 'graveyard';

// A username change is no longer applied instantly: submitting one creates a
// pending request that an admin reviews. This is what /rename now returns and
// what the settings page polls to show pending state.
export interface PendingUsernameChange {
  id: number;
  current_username: string;
  requested_username: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reject_reason: string | null;
}

// Restriction status, from GET /api/v2/torii/restriction. This is the ONE
// authenticated endpoint a restricted user can reach (every other one 403s),
// so it's how the site learns *why* a restricted user can't really get in.
export interface RestrictionStatus {
  is_restricted: boolean;
  permanent?: boolean;
  reason?: string | null;
  ends_at?: string | null;
}

export const userAPI = {
  getMe: async (ruleset?: string) => {
    const url = ruleset ? `/api/v2/me/${ruleset}` : '/api/v2/me/';
    const response = await api.get(url);
    return response.data;
  },

  // Does not 403 for restricted users (unlike getMe), so it's safe to call
  // even when the account is locked out. Returns { is_restricted: false } for
  // everyone who isn't restricted.
  getRestriction: async (): Promise<RestrictionStatus> => {
    const response = await api.get('/api/v2/torii/restriction');
    return response.data;
  },

  getUser: async (
    userIdOrName: string | number,
    ruleset?: string,
    config?: AxiosRequestConfig,
  ) => {
    const url = ruleset
      ? `/api/v2/users/${userIdOrName}/${ruleset}`
      : `/api/v2/users/${userIdOrName}`;
    const response = await api.get(url, config);
    return response.data;
  },

  getAvatarUrl: (userId: number, bustCache: boolean = false) => {
    const baseUrl = `${API_BASE_URL}/users/${userId}/avatar`;
    return bustCache ? `${baseUrl}?t=${Date.now()}` : baseUrl;
  },

  uploadAvatar: async (imageFile: File | Blob, isNsfw: boolean = false) => {
    const formData = new FormData();
    const isJpeg = imageFile.type === 'image/jpeg';
    const fileName = isJpeg ? 'avatar.jpg' : 'avatar.png';
    formData.append('content', imageFile, fileName);
    formData.append('is_nsfw', String(isNsfw));

    // Go through the shared `api` instance instead of a raw fetch so the upload
    // gets the auth header, the 401 refresh+retry, and the x-api-version /
    // X-UUID headers like every other call. A bare fetch with a hand-read
    // localStorage token bypassed the refresh interceptor, so an expired token
    // (refreshed transparently everywhere else) silently broke uploads. axios
    // auto-sets the multipart boundary for FormData now that the global
    // Content-Type default is gone.
    const response = await api.post('/api/private/avatar/upload', formData);
    return response.data;
  },

  // Delete the uploaded avatar and fall back to a default (server-side resolve).
  deleteAvatar: async () => {
    await api.delete('/api/private/avatar');
  },

  // Submit a username change request for admin review. Does NOT rename
  // immediately — the resolved request is applied by an admin from the panel.
  rename: async (newUsername: string): Promise<PendingUsernameChange> => {
    // Through the shared api instance so it gets the 401 refresh+retry. The
    // body is a bare JSON string, which axios won't auto-type, so set the
    // header explicitly.
    try {
      const response = await api.post('/api/private/rename', JSON.stringify(newUsername), {
        headers: { 'Content-Type': 'application/json' },
      });
      return response.data as PendingUsernameChange;
    } catch (error: any) {
      const status: number | undefined = error?.response?.status;
      const data = error?.response?.data;
      console.error('Username change request failed:', data ?? error);
      // Preserve the { status, message } shape SettingsPage branches on (409/404/403).
      const err = new Error(
        data?.detail ||
          data?.message ||
          (status ? `HTTP ${status}` : (error instanceof Error ? error.message : 'Username change request failed'))
      ) as Error & { status?: number };
      if (status !== undefined) err.status = status;
      throw err;
    }
  },

  // Returns the current user's pending username change request, or null.
  getUsernameChangeRequest: async (): Promise<PendingUsernameChange | null> => {
    const response = await api.get('/api/private/username-change-request');
    return (response.data as PendingUsernameChange | null) ?? null;
  },

  acknowledgeUsernameChangeRequest: async (): Promise<void> => {
    await api.post('/api/private/username-change-request/acknowledge');
  },

  uploadCover: async (imageFile: File | Blob, isNsfw: boolean = false) => {
    const formData = new FormData();
    const isJpeg = imageFile.type === 'image/jpeg';
    const fileName = isJpeg ? 'cover.jpg' : 'cover.png';
    formData.append('content', imageFile, fileName);
    formData.append('is_nsfw', String(isNsfw));

    // Same as uploadAvatar: go through `api` for auth refresh + consistent
    // headers + safe multipart, instead of a refresh-bypassing raw fetch.
    const response = await api.post('/api/private/cover/upload', formData);
    return response.data;
  },

  getRecentActivity: async (
    userId: number,
    limit: number = 6,
    offset: number = 0
  ) => {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());

    const url = `/api/v2/users/${userId}/recent_activity?${params.toString()}`;
    const response = await api.get(url);
    return response.data;
  },

  getMostPlayedBeatmaps: async (
    userId: number,
    limit: number = 6,
    offset: number = 0,
  ) => {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());

    const url = `/api/v2/users/${userId}/beatmapsets/most_played?${params.toString()}`;
    const response = await api.get(url);
    return response.data;
  },

  getUserBeatmapsets: async (
    userId: number,
    type: UserBeatmapsetType,
    limit: number = 12,
    offset: number = 0,
  ) => {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());

    const url = `/api/v2/users/${userId}/beatmapsets/${type}?${params.toString()}`;
    const response = await api.get(url);
    return response.data;
  },

  getUserPage: async (_userId: number) => {
    const response = await api.get(`/api/private/user/page`);
    return response.data;
  },

  updateUserPage: async (_userId: number, content: string) => {
    const response = await api.put(`/api/private/user/page`, {
      body: content,
    });
    return response.data;
  },

  validateBBCode: async (content: string) => {
    const response = await api.post('/api/private/user/validate-bbcode', {
      content: content,
    });
    return response.data;
  },

  getBestScores: async (
    userId: number,
    mode: string = 'osu',
    limit: number = 6,
    offset: number = 0
  ) => {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());
    params.append('mode', mode);

    const url = `/api/v2/users/${userId}/scores/best?${params.toString()}`;
    const response = await api.get(url, {
      headers: {
        'x-api-version': '20220705',
      },
    });
    return response.data;
  },

  getRecentScores: async (
    userId: number,
    mode: string = 'osu',
    limit: number = 6,
    offset: number = 0,
    include_fails: boolean = true
  ) => {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());
    params.append('mode', mode);
    params.append('include_fails', include_fails.toString());

    const url = `/api/v2/users/${userId}/scores/recent?${params.toString()}`;
    const response = await api.get(url, {
      headers: {
        'x-api-version': '20220705',
      },
    });
    return response.data;
  },

  getPinnedScores: async (
    userId: number,
    mode: string = 'osu'
  ) => {
    const params = new URLSearchParams();
    params.append('mode', mode);

    const url = `/api/v2/users/${userId}/scores/pinned?${params.toString()}`;
    const response = await api.get(url, {
      headers: {
        'x-api-version': '20220705',
      },
    });
    return response.data;
  },

  // Change password with current password or TOTP code
  changePassword: async (newPassword: string, currentPassword?: string, totpCode?: string) => {
    const formData = new URLSearchParams();
    formData.append('new_password', newPassword);

    if (currentPassword) {
      formData.append('current_password', currentPassword);
    }

    if (totpCode) {
      formData.append('totp_code', totpCode);
    }

    // Through the shared api instance for the 401 refresh+retry. axios
    // auto-sets application/x-www-form-urlencoded for a URLSearchParams body.
    try {
      const response = await api.post('/api/private/password/change', formData);
      // A 204 No Content response has no body.
      return response.status === 204 ? undefined : response.data;
    } catch (error: any) {
      const data = error?.response?.data;
      console.error('Password change failed:', data ?? error);
      // Caller matches on .message ('Invalid'/'incorrect'), so keep the detail there.
      throw new Error(
        data?.detail || data?.message || (error instanceof Error ? error.message : 'Password change failed')
      );
    }
  },

  // TOTP-related endpoints
  totp: {
    // Check TOTP status
    getStatus: async (): Promise<TOTPStatus> => {
      const response = await api.get('/api/private/totp/status');
      return response.data;
    },

    // Start the TOTP creation flow
    createStart: async (): Promise<TOTPCreateStart> => {
      const response = await api.post('/api/private/totp/create');
      return response.data;
    },

    // Complete the TOTP creation flow
    createComplete: async (code: string): Promise<TOTPBackupCodes> => {
      const response = await api.put('/api/private/totp/create', { code });
      return response.data;
    },

    // Disable TOTP two-factor authentication
    disable: async (code: string): Promise<void> => {
      await api.delete('/api/private/totp', { data: { code } });
    },
  },
};
