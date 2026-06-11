import type { Team, User } from './user';

export interface TopUsersResponse {
  ranking: UserRanking[];
  cursor: {
    page: number;
  };
  total: number;
}

export interface UserRanking {
  user: User;
  ranked_score?: number;
  pp?: number;
  hit_accuracy?: number; // Accuracy
  is_inactive?: boolean; // Torii: 15-30d inactive -> grey the row (30d+ are dropped server-side)
}

export interface CountryResponse {
  ranking: CountryRanking[];
  cursor: {
    page: number;
  };
  total: number;
}

export interface CountryRanking {
  code: string;
  name: string;
  active_users: number;
  play_count: number;
  ranked_score: number;
  performance: number;
  hit_accuracy?: number; // Accuracy (if the API returns it)
}

export type RankingType = 'performance' | 'score';
export type TabType = 'users' | 'countries' | 'teams';

export interface TeamRankingsResponse {
  ranking: TeamRanking[];
  cursor?: {
    page: number;
  };
  total: number;
}

export interface TeamRanking {
  team_id: number;
  ruleset_id: number;
  play_count: number;
  ranked_score: number;
  performance: number;
  team: Team;
  member_count: number;
}

export interface TeamDetailResponse {
  team: Team;
  members: User[];
}

export interface TeamJoinRequest {
  user_id: number;
  team_id: number;
  requested_at: string;
  user: User;
}
