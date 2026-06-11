import { api } from './client';

export const scoreAPI = {
  getBeatmapScores: async (beatmapId: number, mode: string, limit: number = 50) => {
    const response = await api.get(
      `/api/v2/beatmaps/${beatmapId}/scores?mode=${encodeURIComponent(mode)}&type=global&legacy_only=0&limit=${limit}&offset=0`
    );
    return response.data;
  },

  getScoreById: async (scoreId: number) => {
    const response = await api.get(`/api/v2/scores/${scoreId}`);
    return response.data;
  },

  // Pin a score
  pinScore: async (scoreId: number) => {
    const response = await api.put(`/api/v2/score-pins/${scoreId}`);
    return response.data;
  },

  // Unpin a score
  unpinScore: async (scoreId: number) => {
    const response = await api.delete(`/api/v2/score-pins/${scoreId}`);
    return response.data;
  },

  // Reorder pinned scores
  reorderPinnedScore: async (
    scoreId: number,
    options: {
      after_score_id?: number;
      before_score_id?: number;
    }
  ) => {
    const response = await api.post(`/api/v2/score-pins/${scoreId}/reorder`, options);
    return response.data;
  },

  // Download a score replay
  downloadReplay: async (scoreId: number) => {
    const response = await api.get(`/api/v2/scores/${scoreId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

