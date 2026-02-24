import { api } from './client';

export interface NavbarSearchUser {
  id: number;
  username: string;
  avatar_url: string;
  country_code: string;
  is_online: boolean;
  team_id: number | null;
}

export interface NavbarSearchTeam {
  id: number;
  name: string;
  short_name: string;
  flag_url: string | null;
  member_count: number;
}

export interface NavbarSearchResponse {
  query: string;
  users: NavbarSearchUser[];
  teams: NavbarSearchTeam[];
}

export const searchAPI = {
  navbarSearch: async (query: string, usersLimit: number = 6, teamsLimit: number = 6) => {
    const response = await api.get<NavbarSearchResponse>('/api/v2/search', {
      params: {
        q: query,
        users_limit: usersLimit,
        teams_limit: teamsLimit,
      },
    });
    return response.data;
  },
};
