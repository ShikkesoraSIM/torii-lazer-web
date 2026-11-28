import type { ModCatalogByRuleset, ModDefinition } from '../types/mods';

interface RawRulesetCatalogEntry {
  Name: string;
  RulesetID: number;
  Mods: ModDefinition[];
}

// Bundled snapshot of /api/private/admin/mods-catalog so the Daily Challenge
// ModPicker still works against an older backend, loaded dynamically on demand
// so normal users never download ~185 KB of admin mod metadata.
let cachedCatalog: ModCatalogByRuleset | null = null;

export async function loadBundledModsCatalog(): Promise<ModCatalogByRuleset> {
  if (cachedCatalog) return cachedCatalog;
  const mod = await import('./modsCatalog.json');
  const raw = mod.default as unknown as RawRulesetCatalogEntry[];
  cachedCatalog = Object.fromEntries(
    (Array.isArray(raw) ? raw : []).map((entry) => [entry.Name, entry.Mods])
  ) as ModCatalogByRuleset;
  return cachedCatalog;
}
