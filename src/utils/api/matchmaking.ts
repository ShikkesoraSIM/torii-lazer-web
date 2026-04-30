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
  type: MatchmakingPoolType;
  active: boolean;
  lobby_size: number;
  rating_search_radius: number;
  rating_search_radius_max: number;
  rating_search_radius_exp: number;
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

export const matchmakingAPI = {
  /** List pools the user can queue into. By default only `active=true`. */
  listPools: async (params: ListPoolsParams = {}): Promise<MatchmakingPool[]> => {
    const response = await api.get<MatchmakingPool[]>(
      `/api/v2/matchmaking/pools${buildQuery({ ...params })}`,
    );
    return response.data;
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
