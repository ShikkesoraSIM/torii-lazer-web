import { api } from './client';
import type {
  OAuthApp,
  CreateOAuthAppRequest,
  CreateOAuthAppResponse,
  UpdateOAuthAppRequest,
  RefreshSecretResponse,
  GenerateCodeRequest,
  GenerateCodeResponse,
} from '../../types/oauth';

/**
 * OAuth application management API
 */
export const oauthAPI = {
  /**
   * Create an OAuth application
   */
  async create(data: CreateOAuthAppRequest): Promise<CreateOAuthAppResponse> {
    const response = await api.post('/api/private/oauth-app/create', data);
    return response.data;
  },

  /**
   * Get all of the user's OAuth applications
   */
  async list(): Promise<OAuthApp[]> {
    const response = await api.get('/api/private/oauth-apps');
    return response.data;
  },

  /**
   * Get a single OAuth application
   */
  async get(clientId: number): Promise<OAuthApp> {
    const response = await api.get(`/api/private/oauth-apps/${clientId}`);
    return response.data;
  },

  /**
   * Update an OAuth application
   */
  async update(clientId: number, data: UpdateOAuthAppRequest): Promise<OAuthApp> {
    const response = await api.patch(`/api/private/oauth-app/${clientId}`, data);
    return response.data;
  },

  /**
   * Delete an OAuth application
   */
  async delete(clientId: number): Promise<void> {
    await api.delete(`/api/private/oauth-app/${clientId}`);
  },

  /**
   * Refresh an OAuth application's secret
   */
  async refreshSecret(clientId: number): Promise<RefreshSecretResponse> {
    const response = await api.post(`/api/private/oauth-app/${clientId}/refresh`);
    return response.data;
  },

  /**
   * Generate an authorization code
   */
  async generateCode(clientId: number, data: GenerateCodeRequest): Promise<GenerateCodeResponse> {
    const response = await api.post(`/api/private/oauth-app/${clientId}/code`, data);
    return response.data;
  },
};
