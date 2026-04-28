// Types mirroring the server's `/api/v2/me/aura-catalog` response.
// Defined here (not imported from a shared package) because the web app
// has no compile-time link to the python server — keep these in sync if
// the server schema changes (single source of truth still lives at
// app/models/torii_auras.py on the server).

export interface AuraCatalogEntry {
  id: string;
  display_name: string;
  description: string;
  owning_groups: string[];
}

export interface AuraCatalog {
  // Sentinel constants the server expects in the PATCH body when the
  // user picks Default / None. Surfaced explicitly so the web client
  // doesn't hardcode the strings.
  sentinel_default: string;
  sentinel_none: string;
  // Auras the current user is entitled to equip, ordered for display.
  available: AuraCatalogEntry[];
  // Raw stored value (incl. sentinels). null when never picked.
  current_setting: string | null;
  // Resolved aura id everyone else sees on this user's name. Mirrors
  // APIUser.equipped_aura.
  effective_aura_id: string | null;
}
