import { api } from './client';

/**
 * Matchmaking API client.
 *
 * The realtime matchmaking flow (queue, lobby fill, gameplay) lives on
 * the spectator's SignalR hubs and is driven from the lazer game client
 * — not from this website. What this module exposes is the flat HTTP
 * read surface for rendering profile badges, leaderboards, and recent
 * match history.
 *
 * All endpoints map 1:1 to handlers in
 * `g0v0-server/app/router/v2/matchmaking.py`.
 */

export type MatchmakingPoolType = 'quick_play' | 'ranked_play';

export interface MatchmakingPool {
  id: number;
  ruleset_id: number;
  name: string;
  /** Admin-editable blurb shown under the pool name on the public page. */
  description: string | null;
  type: MatchmakingPoolType;
  active: boolean;
  lobby_size: number;
  rating_search_radius: number;
  rating_search_radius_max: number;
  rating_search_radius_exp: number;
  /**
   * Activity counters populated when the request includes
   * `with_activity=true` (default for the public ranking page). Null for
   * admin clients that explicitly opt out to skip the COUNT queries.
   */
  unique_players?: number | null;
  matches_today?: number | null;
  matches_this_week?: number | null;
}

export interface MatchmakingMinimalUser {
  id: number;
  username: string;
  avatar_url: string;
}

export interface MatchmakingLeaderboardEntry {
  user_id: number;
  rating: number;
  plays: number;
  first_placements: number;
  total_points: number;
  rank: number;
  user: MatchmakingMinimalUser | null;
}

export interface MatchmakingUserPoolStats {
  user_id: number;
  pool_id: number;
  rating: number;
  plays: number;
  first_placements: number;
  total_points: number;
  /** 1-based rank within the pool. Null if user has plays=0. */
  rank: number | null;
  updated_at: string | null;
}

export type MatchmakingResult = 'win' | 'loss' | 'draw';

export interface MatchmakingHistoryEntry {
  id: number;
  room_id: number;
  pool_id: number;
  user_id: number;
  opponent_id: number;
  result: MatchmakingResult;
  elo_before: number;
  elo_after: number;
  /** Convenience: elo_after - elo_before. */
  elo_delta: number;
  created_at: string;
}

export interface ListPoolsParams {
  /** Include pools where active=0 (admin clients use this). */
  include_inactive?: boolean;
  /** Filter by ruleset id (0=osu, 1=taiko, 2=catch, 3=mania). */
  ruleset_id?: number;
  /** Filter by pool type. */
  type?: MatchmakingPoolType;
}

export interface PaginationParams {
  /** Skip the first N rows. Default 0. */
  cursor?: number;
  /** Page size, 1-200. Default 50. */
  limit?: number;
}

const buildQuery = (params: Record<string, unknown>): string => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      sp.append(k, String(v));
    }
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
};

/** Beatmap row enriched with the join-through to beatmaps + beatmapsets. */
export interface MatchmakingPoolBeatmap {
  id: number;
  pool_id: number;
  beatmap_id: number;
  rating: number;
  rating_sig: number;
  selection_count: number;
  mode: string | null;
  version: string | null;
  artist: string | null;
  title: string | null;
  difficulty_rating: number | null;
  total_length: number | null;
}

export interface MatchmakingPoolCreate {
  ruleset_id: number;
  name: string;
  type?: MatchmakingPoolType;
  active?: boolean;
  lobby_size?: number;
  rating_search_radius?: number;
  rating_search_radius_max?: number;
  rating_search_radius_exp?: number;
}

export interface MatchmakingPoolUpdate {
  name?: string;
  type?: MatchmakingPoolType;
  active?: boolean;
  lobby_size?: number;
  rating_search_radius?: number;
  rating_search_radius_max?: number;
  rating_search_radius_exp?: number;
}

export interface BulkBeatmapAddRequest {
  beatmap_ids: number[];
  initial_rating?: number;
  initial_rating_sig?: number;
}

export interface BulkBeatmapAddResponse {
  added: number[];
  skipped_already_in_pool: number[];
  skipped_not_found: number[];
  skipped_wrong_mode: number[];
}

export interface BulkBeatmapsetAddRequest {
  beatmapset_ids: number[];
  initial_rating?: number;
  initial_rating_sig?: number;
  min_sr?: number;
  max_sr?: number;
  min_length_seconds?: number;
  max_length_seconds?: number;
}

export interface BulkBeatmapsetAddResponse {
  added: number[];
  skipped_already_in_pool: number[];
  skipped_outside_window: number[];
  skipped_wrong_mode: number[];
  mapsets_not_found: number[];
}

export const matchmakingAPI = {
  /** List pools the user can queue into. By default only `active=true`. */
  listPools: async (params: ListPoolsParams = {}): Promise<MatchmakingPool[]> => {
    const response = await api.get<MatchmakingPool[]>(
      `/api/v2/matchmaking/pools${buildQuery({ ...params })}`,
    );
    return response.data;
  },

  /** Beatmaps currently in a pool (paginated, joined with beatmaps + beatmapsets). */
  listPoolBeatmaps: async (
    poolId: number,
    params: PaginationParams = {},
  ): Promise<MatchmakingPoolBeatmap[]> => {
    const response = await api.get<MatchmakingPoolBeatmap[]>(
      `/api/v2/matchmaking/pools/${poolId}/beatmaps${buildQuery({ ...params })}`,
    );
    return response.data;
  },

  /** Admin only — create a new pool. */
  createPool: async (payload: MatchmakingPoolCreate): Promise<MatchmakingPool> => {
    const response = await api.post<MatchmakingPool>('/api/v2/matchmaking/pools', payload);
    return response.data;
  },

  /** Admin only — edit pool config in-place (any subset of fields). */
  updatePool: async (poolId: number, payload: MatchmakingPoolUpdate): Promise<MatchmakingPool> => {
    const response = await api.put<MatchmakingPool>(
      `/api/v2/matchmaking/pools/${poolId}`,
      payload,
    );
    return response.data;
  },

  /** Admin only — delete a pool. 409 if there's any audit history attached. */
  deletePool: async (poolId: number): Promise<void> => {
    await api.delete(`/api/v2/matchmaking/pools/${poolId}`);
  },

  /** Admin only — bulk add beatmaps by id. Skips dupes/missing/wrong-mode. */
  bulkAddBeatmaps: async (
    poolId: number,
    payload: BulkBeatmapAddRequest,
  ): Promise<BulkBeatmapAddResponse> => {
    const response = await api.post<BulkBeatmapAddResponse>(
      `/api/v2/matchmaking/pools/${poolId}/beatmaps`,
      payload,
    );
    return response.data;
  },

  /**
   * Admin only — bulk add every difficulty from each provided mapset id
   * that fits the pool's mode AND the request's SR / length window.
   * Saves the operator from copying every individual diff id.
   */
  bulkAddBeatmapsets: async (
    poolId: number,
    payload: BulkBeatmapsetAddRequest,
  ): Promise<BulkBeatmapsetAddResponse> => {
    const response = await api.post<BulkBeatmapsetAddResponse>(
      `/api/v2/matchmaking/pools/${poolId}/beatmapsets`,
      payload,
    );
    return response.data;
  },

  /** Admin only — remove a single beatmap from a pool. */
  removePoolBeatmap: async (poolId: number, beatmapId: number): Promise<void> => {
    await api.delete(`/api/v2/matchmaking/pools/${poolId}/beatmaps/${beatmapId}`);
  },

  /** Top users in a pool ranked by rating (plays > 0 only). */
  getPoolLeaderboard: async (
    poolId: number,
    params: PaginationParams = {},
  ): Promise<MatchmakingLeaderboardEntry[]> => {
    const response = await api.get<MatchmakingLeaderboardEntry[]>(
      `/api/v2/matchmaking/pools/${poolId}/leaderboard${buildQuery({ ...params })}`,
    );
    return response.data;
  },

  /** Per-pool matchmaking stats for a user. */
  getUserStats: async (
    userId: number,
    poolId?: number,
  ): Promise<MatchmakingUserPoolStats[]> => {
    const response = await api.get<MatchmakingUserPoolStats[]>(
      `/api/v2/users/${userId}/matchmaking/stats${buildQuery({ pool_id: poolId })}`,
    );
    return response.data;
  },

  /** Recent matchmaking results for a user, newest first. */
  getUserHistory: async (
    userId: number,
    params: { pool_id?: number } & PaginationParams = {},
  ): Promise<MatchmakingHistoryEntry[]> => {
    const response = await api.get<MatchmakingHistoryEntry[]>(
      `/api/v2/users/${userId}/matchmaking/history${buildQuery({ ...params })}`,
    );
    return response.data;
  },

  /** Admin only — flip a pool's `active` flag. */
  patchPoolActive: async (poolId: number, active: boolean): Promise<MatchmakingPool> => {
    const response = await api.patch<MatchmakingPool>(
      `/api/v2/matchmaking/pools/${poolId}`,
      { active },
    );
    return response.data;
  },
};
