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
  /** 0..1 win-rate from elo_history; null if the user has no recorded matches yet. */
  win_rate: number | null;
  wins: number | null;
  losses: number | null;
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
  /** Parent beatmapset id — used to build cover URLs without a follow-up call. */
  beatmapset_id: number | null;
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

/** One row of the pool's "top picked maps" stats panel. */
export interface MatchmakingPoolStatsTopMap {
  beatmap_id: number;
  beatmapset_id: number | null;
  selection_count: number;
  rating: number;
  artist: string | null;
  title: string | null;
  version: string | null;
  difficulty_rating: number | null;
}

/** One row of the pool's "most active players (last 7d)" stats panel. */
export interface MatchmakingPoolStatsActivePlayer {
  user_id: number;
  matches: number;
  wins: number;
  losses: number;
  user: MatchmakingMinimalUser | null;
}

export interface MatchmakingPoolStatsActivityPoint {
  day: string;
  matches: number;
}

/** Aggregated stats for one pool — one round trip for the whole panel. */
export interface MatchmakingPoolStats {
  top_maps: MatchmakingPoolStatsTopMap[];
  most_active_players: MatchmakingPoolStatsActivePlayer[];
  activity_timeseries: MatchmakingPoolStatsActivityPoint[];
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

/**
 * Operator-facing curation filter set. Same payload for the preview
 * (count + sample) and the commit (actual insert) endpoints.
 *
 * The defaults mirror the backend: Featured Artist OFF, statuses
 * RANKED+APPROVED+LOVED (mapper-frozen, safe for pools), 2.5–6.5★,
 * 1–5 minutes, max 500 maps, SR-aware initial rating ON.
 */
export interface AutoImportFilters {
  featured_artist: boolean;
  statuses: BeatmapRankStatus[];
  min_sr: number;
  max_sr: number;
  min_length_seconds: number;
  max_length_seconds: number;
  max_count: number;
  use_sr_aware_rating: boolean;
  /** Only consulted when use_sr_aware_rating=false. */
  fixed_initial_rating: number;
  initial_rating_sig: number;
}

export type BeatmapRankStatus =
  | 'RANKED'
  | 'APPROVED'
  | 'LOVED'
  | 'QUALIFIED'
  | 'PENDING'
  | 'GRAVEYARD'
  | 'WIP';

/** One sample row in the preview response. */
export interface AutoImportPreviewSample {
  beatmap_id: number;
  beatmapset_id: number | null;
  artist: string | null;
  title: string | null;
  version: string | null;
  difficulty_rating: number | null;
  total_length: number | null;
  /** What rating this map would receive if imported with the current filters. */
  seed_rating: number;
}

export interface AutoImportPreviewResponse {
  /** Maps that would actually land (after dedupe + max_count cap). */
  matched: number;
  /** Maps matching the filters before the cap — surfaces overflow. */
  matched_uncapped: number;
  skipped_already_in_pool: number;
  /** Up to 12 sample rows, ordered easy→hard by SR. */
  sample: AutoImportPreviewSample[];
}

export interface AutoImportResponse {
  added: number[];
  skipped_already_in_pool: number[];
  matched_uncapped: number;
  /** True if matched_uncapped > max_count and we trimmed. */
  capped: boolean;
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

  /**
   * Aggregated stats for one pool — top picked maps, most active players
   * in the last 7 days, and a per-day activity timeseries (last 30 days).
   * One round trip for the whole "what's hot" panel.
   */
  getPoolStats: async (
    poolId: number,
    params: { top_maps_limit?: number; active_players_limit?: number } = {},
  ): Promise<MatchmakingPoolStats> => {
    const response = await api.get<MatchmakingPoolStats>(
      `/api/v2/matchmaking/pools/${poolId}/stats${buildQuery({ ...params })}`,
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

  /**
   * Admin only — dry-run the auto-import. Returns the count of maps
   * that would be inserted with the given filters + a small sample so
   * the operator can iterate filters without committing.
   */
  autoImportPreview: async (
    poolId: number,
    payload: AutoImportFilters,
  ): Promise<AutoImportPreviewResponse> => {
    const response = await api.post<AutoImportPreviewResponse>(
      `/api/v2/matchmaking/pools/${poolId}/beatmaps/auto-import/preview`,
      payload,
    );
    return response.data;
  },

  /**
   * Admin only — commit the auto-import. Scans the local beatmap cache
   * for everything matching the filters and inserts up to `max_count`
   * of them. Each inserted map is seeded with an SR-aware rating from
   * the ruleset's anchor curve unless `use_sr_aware_rating=false`.
   */
  autoImport: async (
    poolId: number,
    payload: AutoImportFilters,
  ): Promise<AutoImportResponse> => {
    const response = await api.post<AutoImportResponse>(
      `/api/v2/matchmaking/pools/${poolId}/beatmaps/auto-import`,
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
