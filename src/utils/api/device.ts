import { api } from './client';
import type { 
  DeviceSession, 
  RevokeSessionResponse, 
  DeviceSummary,
  SessionsResponse,
  TrustedDevicesResponse
} from '../../types/device';

export const deviceAPI = {
  // Get the current user's login sessions
  getUserSessions: async (): Promise<SessionsResponse> => {
    const response = await api.get('/api/private/admin/sessions');
    return response.data;
  },

  // Sign out a specific login session
  deleteSession: async (sessionId: number): Promise<void> => {
    await api.delete(`/api/private/admin/sessions/${sessionId}`);
  },

  // Get the current user's trusted devices
  getTrustedDevices: async (): Promise<TrustedDevicesResponse> => {
    const response = await api.get('/api/private/admin/trusted-devices');
    return response.data;
  },

  // Remove a trusted device
  removeTrustedDevice: async (deviceId: number): Promise<void> => {
    await api.delete(`/api/private/admin/trusted-devices/${deviceId}`);
  },

  // Get active sessions
  getSessions: async (): Promise<DeviceSession[]> => {
    const response = await api.get('/api/private/device/sessions');
    return response.data;
  },

  // Revoke a specific session
  revokeSession: async (sessionId: number): Promise<RevokeSessionResponse> => {
    const response = await api.post('/api/private/device/sessions/revoke', {
      session_id: sessionId
    });
    return response.data;
  },

  // Get device session stats
  getSummary: async (): Promise<DeviceSummary> => {
    const response = await api.get('/api/private/device/summary');
    return response.data;
  },
};
