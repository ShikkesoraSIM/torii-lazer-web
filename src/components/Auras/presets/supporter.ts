import type { AuraPresetSpec, ParticleConfig } from '../types';

// Supporter aura — pink FaHeart rising slowly with a heartbeat pulse.
// Single preset, no colour variants (yet). Granted only while a user is
// currently in the active supporter window; lapsed donors lose access
// because the server-side `torii-supporter` group drops off.
//
// Colour tints over time (e.g. bronze/silver/gold or pink/blue/green/
// purple) are deliberately NOT in this rev — the user wanted the model
// kept simple while there's only one tier of recognition. When/if
// colour unlocks ship later, this file is the seam: a `makeSupporterPreset`
// factory + multiple registrations.

const palette = ['#ff7fc8', '#ffaad7', '#e664af'];

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const supporterPreset: AuraPresetSpec = {
  id: 'supporter-aura',
  spawnIntervalMs: 540,
  spawnJitterMs: 240,
  maxAlive: 6,

  emit(nextId): ParticleConfig {
    const startX = rand(8, 92);
    const startY = rand(55, 95);
    return {
      id: nextId,
      kind: 'heart',
      startX,
      startY,
      endX: startX + rand(-15, 15),
      endY: startY - rand(55, 90),
      size: rand(10, 14),
      color: pick(palette),
      lifetimeMs: rand(1500, 2000),
      pulse: true,
    };
  },
};
