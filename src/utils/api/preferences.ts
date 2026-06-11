import { api } from './client';
import type { 
  GameMode, 
  SetDefaultModeResponse, 
  GetUserPreferencesResponse,
  UpdateUserPreferencesRequest 
} from '../../types';

export const preferencesAPI = {
  // Set the default game mode (legacy)
  setDefaultMode: async (mode: GameMode): Promise<SetDefaultModeResponse> => {
    const response = await api.post('/api/private/user-preferences/default-mode', {
      mode
    });
    return response.data;
  },

  // Get user preferences (legacy)
  getUserPreferences: async (): Promise<GetUserPreferencesResponse> => {
    const response = await api.get('/api/private/user-preferences');
    return response.data;
  },

  // GET /api/private/user/preferences - get user preferences
  getPreferences: async (): Promise<GetUserPreferencesResponse> => {
    const response = await api.get('/api/private/user/preferences');
    return response.data;
  },

  // PATCH /api/private/user/preferences - update user preferences
  updatePreferences: async (preferences: UpdateUserPreferencesRequest): Promise<void> => {
    await api.patch('/api/private/user/preferences', preferences);
    // API returns 204 No Content on success
  },
};
