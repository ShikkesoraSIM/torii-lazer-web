import type { AuraPresetSpec } from './types';
import { adminPreset } from './presets/admin';
import { devPreset } from './presets/dev';
import { modPreset } from './presets/mod';
import { qatPreset } from './presets/qat';
import { supporterPreset } from './presets/supporter';
import { goofPreset } from './presets/goof';

/**
 * Central lookup of every aura the web client knows how to render.
 *
 * To add a new aura: write a new module under presets/, import it here,
 * and append it to AURA_PRESETS. The settings page enumerates this map,
 * the UserAura component looks up by id from APIUser.equipped_aura.
 */
export const AURA_PRESETS: Record<string, AuraPresetSpec> = {
  [adminPreset.id]: adminPreset,
  [devPreset.id]: devPreset,
  [modPreset.id]: modPreset,
  [qatPreset.id]: qatPreset,
  // Single supporter aura (pink hearts) — granted only while a user is
  // currently in the active supporter window. The aura id matches the
  // C# preset's AuraId so equipping it yields the same visual across
  // the web and the lazer client.
  [supporterPreset.id]: supporterPreset,
  [goofPreset.id]: goofPreset,
};

export function getAuraPreset(id: string | null | undefined): AuraPresetSpec | null {
  if (!id) return null;
  return AURA_PRESETS[id] ?? null;
}
