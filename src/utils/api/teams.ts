import { api } from './client';

export const teamsAPI = {
  getTeam: async (teamId: number, mode?: string) => {
    const response = await api.get(`/api/private/team/${teamId}`, {
      params: mode ? { gamemode: mode } : undefined,
    });
    return response.data;
  },

  createTeam: async (teamData: FormData) => {
    // Don't override Content-Type. axios v1 inspects FormData bodies and
    // hands serialization to the runtime (browser XHR / fetch), which
    // generates the correct multipart/form-data header WITH a boundary
    // parameter. Setting Content-Type to a literal "multipart/form-data"
    // string here suppresses axios' auto-detection: the request goes
    // out without a boundary, FastAPI's parser can't split parts, and
    // the request fails before ever reaching the route handler — the
    // failure mode the user sees is "Network error" because no HTTP
    // response is produced. Verified end-to-end by repro on edits that
    // contain only text fields (name, description) — those used to
    // throw, image-only edits worked because the runtime's File handling
    // re-derived the boundary even with the bogus override. Removing
    // the override fixes both paths.
    const response = await api.post('/api/private/team', teamData);
    return response.data;
  },

  updateTeam: async (teamId: number, teamData: FormData) => {
    // See createTeam above for why we don't set Content-Type explicitly.
    const response = await api.patch(`/api/private/team/${teamId}`, teamData);
    return response.data;
  },

  deleteTeam: async (teamId: number) => {
    const response = await api.delete(`/api/private/team/${teamId}`);
    return response.data;
  },

  requestJoinTeam: async (teamId: number) => {
    const response = await api.post(`/api/private/team/${teamId}/request`);
    return response.data;
  },

  cancelJoinRequest: async (teamId: number) => {
    const response = await api.delete(`/api/private/team/${teamId}/request`);
    return response.data;
  },

  getJoinRequestStatus: async (teamId: number) => {
    const response = await api.get(`/api/private/team/${teamId}/request/status`);
    return response.data as { has_pending_request: boolean };
  },

  getTeamRequests: async (teamId: number) => {
    const response = await api.get(`/api/private/team/${teamId}/requests`);
    return response.data;
  },

  acceptJoinRequest: async (teamId: number, userId: number) => {
    const response = await api.post(`/api/private/team/${teamId}/${userId}/request`);
    return response.data;
  },

  rejectJoinRequest: async (teamId: number, userId: number) => {
    const response = await api.delete(`/api/private/team/${teamId}/${userId}/request`);
    return response.data;
  },

  removeMember: async (teamId: number, userId: number) => {
    const response = await api.delete(`/api/private/team/${teamId}/${userId}`);
    return response.data;
  },
};
