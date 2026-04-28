import type { AuraPresetSpec, ParticleConfig } from '../types';

// Goof: pastel-green FaLeaf icons drifting around with hover bob + slow
// rotation. No persistent halo — matches the C# preset.
const palette = ['#9ce5a0', '#bef0af', '#78d291'];

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const goofPreset: AuraPresetSpec = {
  id: 'goof-leaves',
  spawnIntervalMs: 520,
  spawnJitterMs: 240,
  maxAlive: 5,

  emit(nextId): ParticleConfig {
    const startX = rand(8, 92);
    const startY = rand(15, 85);
    const startRot = rand(-30, 30);
    return {
      id: nextId,
      kind: 'leaf',
      startX,
      startY,
      // Tighter drift than admin/dev — leaves should stay close to the
      // name, just gently wandering. Mirrors the C# preset's tight
      // bounds after the user-feedback iteration.
      endX: startX + rand(-15, 15),
      endY: startY + rand(-25, 25),
      startRot,
      endRot: startRot + rand(-45, 45),
      size: rand(10, 14),
      color: pick(palette),
      lifetimeMs: rand(1900, 2700),
      bob: true,
    };
  },
};
