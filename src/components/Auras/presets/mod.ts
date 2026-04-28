import type { AuraPresetSpec, ParticleConfig } from '../types';

// Mod: gold FaShieldAlt orbiting the name slowly with a heartbeat pulse.
// Slower cadence than admin/dev — moderation = presence, not noise.
const palette = ['#ffd270', '#ffaf46'];

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const modPreset: AuraPresetSpec = {
  id: 'mod-shields',
  spawnIntervalMs: 600,
  spawnJitterMs: 250,
  maxAlive: 5,
  hasHalo: true,
  haloColor: 'radial-gradient(ellipse at center, #ffc35a 0%, transparent 70%)',

  emit(nextId): ParticleConfig {
    const startX = rand(8, 92);
    const startY = rand(15, 85);
    return {
      id: nextId,
      kind: 'shield',
      startX,
      startY,
      // Drift sideways more than vertically — orbital feel rather than
      // rising columns (which is admin/dev's character).
      endX: startX + rand(-25, 25),
      endY: startY + rand(-25, 25),
      size: rand(11, 15),
      color: pick(palette),
      lifetimeMs: rand(1500, 2300),
      pulse: true,
    };
  },
};
