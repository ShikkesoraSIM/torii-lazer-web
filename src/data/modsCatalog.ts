// Frontend-bundled copy of the server's `static/mods.json`.
//
// We bundle this rather than always fetching from the server because:
//   1. It's metadata that rarely changes (only when osu! ships new
//      mods or we add custom ones), so caching at build time is fine.
//   2. The admin Daily-Challenge UI works offline / before the
//      server-side catalog endpoint is deployed.
//
// The runtime first tries `GET /api/private/admin/mods-catalog` and
// silently falls back to this bundle if the endpoint is missing
// (older server) or unreachable.
//
// To refresh: `cp g0v0-server/static/mods.json
//                torii-lazer-web/src/data/modsCatalog.json`.

import raw from './modsCatalog.json';
import type {
  ModCatalogByRuleset,
  RulesetModCatalog,
} from '../types/mods';

const rulesets = raw as unknown as RulesetModCatalog[];

/** Catalog as a `{ "0": Mod[], "1": Mod[], ... }` dict. */
export const BUNDLED_MODS_CATALOG: ModCatalogByRuleset = Object.fromEntries(
  rulesets.map((rs) => [String(rs.RulesetID), rs.Mods]),
);

/** Pretty name for each ruleset, indexed by ruleset id. */
export const RULESET_NAMES: Record<string, string> = Object.fromEntries(
  rulesets.map((rs) => [String(rs.RulesetID), rs.Name]),
);
