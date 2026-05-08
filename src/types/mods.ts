// Types describing the osu! mod catalog and the on-the-wire APIMod
// payload used for daily challenges, multiplayer rooms, etc.
//
// The catalog itself comes from the server's `static/mods.json`. We
// either fetch it via `GET /api/private/admin/mods-catalog` or fall
// back to a frontend-bundled copy in `src/data/modsCatalog.json`.
//
// The wire format the server expects in `required_mods` /
// `allowed_mods` (and what every score saves) is a stringified JSON
// array of `ApiMod` objects:
//
//     [{ "acronym": "DT", "settings": { "speed_change": 1.5 } }, ...]
//
// Settings is optional; an empty object or omitted key is fine.

/** Categorical bucket used by the mod selection UI. */
export type ModType =
  | 'DifficultyReduction'
  | 'DifficultyIncrease'
  | 'Conversion'
  | 'Automation'
  | 'Fun'
  | 'System';

export type ModSettingType = 'number' | 'boolean' | 'string';

/** One adjustable knob on a mod (e.g. DT's speed_change). */
export interface ModSetting {
  Name: string;
  Type: ModSettingType;
  Label: string;
  Description: string;
  /** Optional bounds — only present for some numeric settings.    */
  Min?: number;
  Max?: number;
  Step?: number;
  /** Optional enumerated string choices. */
  Choices?: string[];
}

/** Static metadata for a single mod within a single ruleset. */
export interface ModDefinition {
  Acronym: string;
  Name: string;
  Description: string;
  Type: ModType;
  Settings: ModSetting[];
  IncompatibleMods: string[];
  RequiresConfiguration: boolean;
  UserPlayable: boolean;
  ValidForMultiplayer: boolean;
  ValidForFreestyleAsRequiredMod: boolean;
  ValidForMultiplayerAsFreeMod: boolean;
  AlwaysValidForSubmission: boolean;
}

/** Top-level entry in mods.json — one ruleset and its full mod list. */
export interface RulesetModCatalog {
  Name: string;
  RulesetID: number;
  Mods: ModDefinition[];
}

/**
 * The catalog as a flat dict keyed by ruleset id, the shape returned
 * by the server's `/api/private/admin/mods-catalog` and the shape
 * the frontend code mostly works with.
 */
export type ModCatalogByRuleset = Record<string, ModDefinition[]>;

/** What the server stores in required_mods / allowed_mods. */
export interface ApiMod {
  acronym: string;
  /**
   * Setting overrides keyed by the setting's `Name`. May be omitted
   * entirely; an empty object is also fine. Values are typed
   * primitive — match the corresponding `ModSetting.Type`.
   */
  settings?: Record<string, number | boolean | string>;
}
