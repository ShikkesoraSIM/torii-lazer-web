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
    country_code?: string | null;
    is_qat?: boolean;
    is_gmt?: boolean;
    is_admin?: boolean;
    badge?: string | object | object[] | null;
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

  // Bans every difficulty in the set. Backend inserts one BannedBeatmaps
  // row per beatmap, all sharing this beatmapset_id. Use removeBlacklistedBeatmapSet
  // to undo as a unit.
  addBlacklistedBeatmapSet: async (beatmapsetId: number) => {
    const response = await api.post('/api/private/admin/beatmaps/blacklist', { beatmapset_id: beatmapsetId });
    return response.data;
  },

  // Bans a single difficulty. Coexists fine with set-level bans (same
  // table, just one row instead of N).
  addBlacklistedBeatmap: async (beatmapId: number) => {
    const response = await api.post('/api/private/admin/beatmaps/blacklist', { beatmap_id: beatmapId });
    return response.data;
  },

  // Removes every banned difficulty whose beatmapset_id matches.
  removeBlacklistedBeatmapSet: async (beatmapsetId: number) => {
    const response = await api.delete(`/api/private/admin/beatmaps/blacklist/${beatmapsetId}`);
    return response.data;
  },

  // Removes one specific difficulty.
  removeBlacklistedSingleBeatmap: async (beatmapId: number) => {
    const response = await api.delete(`/api/private/admin/beatmaps/blacklist/beatmap/${beatmapId}`);
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

  /**
   * Roll a random ranked beatmap for a daily challenge.
   * - With `create_challenge: false` (default): preview only, returns
   *   the rolled beatmap so the admin can confirm before committing.
   * - With `create_challenge: true`: persists a DailyChallenge row for
   *   the given date (or today UTC if `date` omitted) using the
   *   rolled beatmap.
   *
   * Errors:
   *   404 — no beatmap matched the filters; loosen the star range.
   *   409 — a challenge already exists for that date.
   */
  pickRandomDailyChallenge: async (payload: {
    date?: string; // YYYY-MM-DD; defaults to today UTC server-side.
    ruleset_id?: number; // 0=osu, 1=taiko, 2=fruits, 3=mania
    min_difficulty?: number | null;
    max_difficulty?: number | null;
    required_mods?: string;
    allowed_mods?: string;
    create_challenge?: boolean;
  }) => {
    const response = await api.post('/api/private/admin/daily-challenge/random', payload);
    return response.data as {
      created: boolean;
      date?: string;
      beatmap: {
        beatmap_id: number;
        beatmapset_id: number;
        version: string;
        difficulty_rating: number;
        mode: string;
        total_length: number;
        bpm?: number;
        title?: string;
        artist?: string;
        creator?: string;
      };
    };
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

  // Global announcements
  sendGlobalAnnouncement: async (payload: {
    title: string;
    message: string;
    severity: 'info' | 'warning' | 'error';
    also_send_pm: boolean;
    online_only: boolean;
    sender_username?: string;
    // When true the backend ALSO emits a synthetic UserAchievementUnlock
    // per recipient, which the lazer client renders via its medal-popup
    // overlay -- a much louder UX than the regular notifications drawer.
    show_popup?: boolean;
  }) => {
    const response = await api.post('/api/private/admin/global-announcement', payload);
    return response.data;
  },

  // Login audit
  getLoginLogs: async (params?: {
    page?: number;
    per_page?: number;
    search?: string;
    user_id?: number;
    login_success?: boolean;
    login_method?: string;
  }) => {
    const response = await api.get('/api/private/admin/login-logs', { params });
    return response.data;
  },

  getUnknownClientHashes: async (params?: {
    page?: number;
    per_page?: number;
    search?: string;
  }) => {
    const response = await api.get('/api/private/admin/client-hashes/unknown', { params });
    return response.data;
  },

  assignClientHash: async (payload: {
    client_hash: string;
    client_name: string;
    version?: string;
    os?: string;
    remove_from_unknown?: boolean;
  }) => {
    const response = await api.post('/api/private/admin/client-hashes/assign', payload);
    return response.data;
  },

  // Donations
  getDonations: async (params?: {
    status?: 'unmatched' | 'matched' | 'all';
    limit?: number;
    offset?: number;
  }) => {
    const response = await api.get('/api/private/admin/donations', { params });
    return response.data;
  },

  getDonationStats: async () => {
    const response = await api.get('/api/private/admin/donations/stats');
    return response.data;
  },

  matchDonation: async (donationId: number, payload: { username?: string; user_id?: number }) => {
    const response = await api.post(
      `/api/private/admin/donations/${donationId}/match`,
      payload,
    );
    return response.data;
  },
};
