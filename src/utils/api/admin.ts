import { api } from './client';

export const adminAPI = {
  // Statistics
  getStats: async () => {
    const response = await api.get('/api/private/admin/stats');
    return response.data;
  },

  // Users
  getUsers: async () => {
    const response = await api.get('/api/private/admin/users');
    return response.data;
  },

  getUser: async (userId: number) => {
    const response = await api.get(`/api/private/admin/users/${userId}`);
    return response.data;
  },

  updateUser: async (userId: number, userData: {
    username?: string;
    country_code?: string;
    is_qat?: boolean;
    is_gmt?: boolean;
    is_admin?: boolean;
    badge?: string | object;
  }) => {
    const response = await api.patch(`/api/private/admin/users/${userId}`, userData);
    return response.data;
  },

  banUser: async (userId: number) => {
    const response = await api.post(`/api/private/admin/users/${userId}/ban`);
    return response.data;
  },

  unbanUser: async (userId: number) => {
    const response = await api.post(`/api/private/admin/users/${userId}/unban`);
    return response.data;
  },

  wipeUserStats: async (userId: number, mode: string) => {
    const response = await api.post(`/api/private/admin/users/${userId}/wipe`, { mode });
    return response.data;
  },

  // Scores
  getScores: async () => {
    const response = await api.get('/api/private/admin/scores');
    return response.data;
  },

  // Beatmaps
  getBeatmaps: async (page: number = 1, limit: number = 25, search: string = '') => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (search) {
      params.append('search', search);
    }
    const response = await api.get(`/api/private/admin/beatmaps?${params.toString()}`);
    return response.data;
  },

  searchBeatmaps: async (query: string, limit = 50) => {
    const params = new URLSearchParams();
    params.append('q', query);
    params.append('limit', limit.toString());
    const response = await api.get(`/api/private/admin/beatmaps/search?${params.toString()}`);
    return response.data;
  },

  getBeatmap: async (id: string | number) => {
    const response = await api.get(`/api/private/admin/beatmaps/${id}`);
    return response.data;
  },

  updateRankStatus: async (id: string | number, status: string) => {
    const response = await api.post(`/api/private/admin/beatmaps/${id}/rank`, { status });
    return response.data;
  },

  banBeatmap: async (id: string | number) => {
    const response = await api.post(`/api/private/admin/beatmaps/${id}/ban`);
    return response.data;
  },

  // Beatmap Blacklist
  getBlacklistedBeatmaps: async () => {
    const response = await api.get('/api/private/admin/beatmaps/blacklist');
    return response.data;
  },

  addBlacklistedBeatmap: async (beatmapsetId: number) => {
    const response = await api.post('/api/private/admin/beatmaps/blacklist', { beatmapset_id: beatmapsetId });
    return response.data;
  },

  removeBlacklistedBeatmap: async (beatmapsetId: number) => {
    const response = await api.delete(`/api/private/admin/beatmaps/blacklist/${beatmapsetId}`);
    return response.data;
  },

  // Badges
  getBadges: async () => {
    const response = await api.get('/api/private/admin/user-badges');
    return response.data;
  },

  createBadge: async (badgeData: {
    description: string;
    image_url: string;
    image_2x_url?: string;
    url?: string;
    awarded_at?: string;
    user_id?: number | null;
  }) => {
    const response = await api.post('/api/private/admin/user-badges', badgeData);
    return response.data;
  },

  updateBadge: async (badgeId: number, badgeData: {
    description?: string;
    image_url?: string;
    image_2x_url?: string;
    url?: string;
    awarded_at?: string;
    user_id?: number | null;
  }) => {
    const response = await api.patch(`/api/private/admin/user-badges/${badgeId}`, badgeData);
    return response.data;
  },

  deleteBadge: async (badgeId: number) => {
    const response = await api.delete(`/api/private/admin/user-badges/${badgeId}`);
    return response.data;
  },

  // Daily Challenge - Enhanced to match osu.Game structure
  getDailyChallenge: async (date: string) => {
    const response = await api.get(`/api/private/admin/daily-challenge/${date}`);
    return response.data;
  },

  listDailyChallenges: async (params?: {
    page?: number;
    per_page?: number;
    date_from?: string;
    date_to?: string;
  }) => {
    const response = await api.get('/api/private/admin/daily-challenges', { params });
    return response.data;
  },

  createDailyChallenge: async (challengeData: {
    date: string;
    beatmap_id: number;
    ruleset_id: number;
    required_mods: string;
    allowed_mods: string;
    room_id?: number;
    max_attempts?: number;
    time_limit?: number;
  }) => {
    const response = await api.post('/api/private/admin/daily-challenge', challengeData);
    return response.data;
  },

  updateDailyChallenge: async (date: string, challengeData: {
    beatmap_id?: number;
    ruleset_id?: number;
    required_mods?: string;
    allowed_mods?: string;
    room_id?: number;
    max_attempts?: number;
    time_limit?: number;
  }) => {
    const response = await api.patch(`/api/private/admin/daily-challenge/${date}`, challengeData);
    return response.data;
  },

  deleteDailyChallenge: async (date: string) => {
    const response = await api.delete(`/api/private/admin/daily-challenge/${date}`);
    return response.data;
  },

  triggerDailyChallenge: async () => {
    const response = await api.post('/api/private/admin/daily-challenge/trigger');
    return response.data;
  },

  getDailyChallengeStats: async (userId: number) => {
    const response = await api.get(`/api/private/admin/daily-challenge/stats/${userId}`);
    return response.data;
  },

  // Teams
  getAllTeams: async () => {
    const response = await api.get('/api/private/admin/teams');
    return response.data;
  },

  updateTeam: async (teamId: number, teamData: FormData) => {
    const response = await api.patch(`/api/private/admin/teams/${teamId}`, teamData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteTeam: async (teamId: number) => {
    const response = await api.delete(`/api/private/admin/teams/${teamId}`);
    return response.data;
  },

  // Reports
  getReports: async (params?: { page?: number; per_page?: number; status?: string; search?: string }) => {
    const response = await api.get('/api/private/admin/reports', { params });
    return response.data;
  },

  resolveReport: async (reportId: number, resolution: { action: 'close' | 'ban' | 'warn'; notes?: string }) => {
    const response = await api.post(`/api/private/admin/reports/${reportId}/resolve`, resolution);
    return response.data;
  },

  // Beatmap Rank Requests
  getBeatmapRequests: async (params?: { page?: number; per_page?: number; status?: string }) => {
    const response = await api.get('/api/private/admin/beatmap-rank-requests', { params });
    return response.data;
  },

  approveBeatmapRequest: async (requestId: number) => {
    const response = await api.post(`/api/private/admin/beatmap-rank-requests/${requestId}/approve`);
    return response.data;
  },

  rejectBeatmapRequest: async (requestId: number, reason?: string) => {
    const response = await api.post(`/api/private/admin/beatmap-rank-requests/${requestId}/reject`, { reason });
    return response.data;
  },
};
