import { api } from './client';
import type { AuraCatalog } from '../../types/aura';

/**
 * API helpers for the per-user equipable aura cosmetic.
 *
 * The web only ever needs to:
 *   - read the catalog to render the picker
 *   - PATCH a new pick when the user clicks "Equip"
 *
 * Server-side validation (ownership, sentinel canonicalisation) is
 * authoritative — the web never has to decide which auras a user can
 * equip, it just renders what comes back.
 */
export const aurasAPI = {
  /** GET /api/v2/me/aura-catalog */
  getCatalog: async (): Promise<AuraCatalog> => {
    const response = await api.get<AuraCatalog>('/api/v2/me/aura-catalog');
    return response.data;
  },

  /**
   * PATCH /api/v2/me/equipped-aura
   *
   * Body: { aura_id: <string|null> }
   *
   * Pass any of:
   *   - a concrete id from `catalog.available[].id` ("admin-embers" etc)
   *   - the sentinel returned in `catalog.sentinel_default`
   *   - the sentinel returned in `catalog.sentinel_none`
   *   - null (server treats this as "default")
   *
   * Server echoes the refreshed catalog so the picker can update in a
   * single round trip without a follow-up GET.
   */
  setEquippedAura: async (auraId: string | null): Promise<AuraCatalog> => {
    const response = await api.patch<AuraCatalog>('/api/v2/me/equipped-aura', {
      aura_id: auraId,
    });
    return response.data;
  },
};
