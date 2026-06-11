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

    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('Access token not found, please log in again');
    }

    const response = await fetch(`${API_BASE_URL}/api/private/avatar/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('Avatar upload failed:', errorData);
      throw new Error(errorData?.detail || errorData?.message || `HTTP ${response.status}`);
    }

    const result = await response.json();
    return result;
  },

  // Submit a username change request for admin review. Does NOT rename
  // immediately — the resolved request is applied by an admin from the panel.
  rename: async (newUsername: string): Promise<PendingUsernameChange> => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('Access token not found');
    }

    const response = await fetch(`${API_BASE_URL}/api/private/rename`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newUsername),
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = await response.text();
      }
      console.error('Username change request failed:', errorData);
      const err = new Error(errorData?.detail || errorData?.message || `HTTP ${response.status}`) as Error & {
        status?: number;
      };
      err.status = response.status;
      throw err;
    }

    const result = await response.json();
    return result as PendingUsernameChange;
  },

  // Returns the current user's pending username change request, or null.
  getUsernameChangeRequest: async (): Promise<PendingUsernameChange | null> => {
    const response = await api.get('/api/private/username-change-request');
    return (response.data as PendingUsernameChange | null) ?? null;
  },

  uploadCover: async (imageFile: File | Blob, isNsfw: boolean = false) => {
    const formData = new FormData();
    const isJpeg = imageFile.type === 'image/jpeg';
    const fileName = isJpeg ? 'cover.jpg' : 'cover.png';
    formData.append('content', imageFile, fileName);
    formData.append('is_nsfw', String(isNsfw));

    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('Access token not found');
    }

    const response = await fetch(`${API_BASE_URL}/api/private/cover/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = await response.text();
      }
      console.error('Cover upload failed:', errorData);
      throw new Error(errorData?.detail || errorData?.message || `HTTP ${response.status}`);
    }

    const result = await response.json();
    return result;
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
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('Access token not found');
    }

    const formData = new URLSearchParams();
    formData.append('new_password', newPassword);
    
    if (currentPassword) {
      formData.append('current_password', currentPassword);
    }
    
    if (totpCode) {
      formData.append('totp_code', totpCode);
    }

    const response = await fetch(`${API_BASE_URL}/api/private/password/change`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = await response.text();
      }
      console.error('Password change failed:', errorData);
      throw new Error(errorData?.detail || errorData?.message || `HTTP ${response.status}`);
    }

    // A 204 No Content response has no body
    if (response.status === 204) {
      return;
    }

    const result = await response.json();
    return result;
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
