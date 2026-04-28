import type { AuraPresetSpec, ParticleConfig } from '../types';

// Supporter: pink FaHeart rising slowly with a heartbeat pulse on each.
// No persistent halo — quieter "thank you" energy than admin/mod.
const palette = ['#ff7fc8', '#ffaad7', '#e664af'];

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const supporterPreset: AuraPresetSpec = {
  id: 'supporter-hearts',
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
