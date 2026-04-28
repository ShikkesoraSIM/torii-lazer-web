import type { AuraPresetSpec, ParticleConfig } from '../types';

// Admin: rising sparks (dominant) + occasional star sparkles + slow round
// embers. No persistent halo — matches the C# preset which intentionally
// dropped it after user feedback.
const palette = ['#ff5a4c', '#ff8c50', '#ffe0b8'];

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

function spark(id: number): ParticleConfig {
  const startX = rand(5, 95);
  const startY = rand(60, 95);
  return {
    id,
    kind: 'spark',
    startX,
    startY,
    endX: startX + rand(-8, 8),
    endY: startY + rand(-90, -55),
    size: rand(7, 10),
    color: pick(palette),
    lifetimeMs: rand(700, 1100),
  };
}

function sparkle(id: number): ParticleConfig {
  const startX = rand(15, 85);
  const startY = rand(20, 80);
  return {
    id,
    kind: 'star',
    startX,
    startY,
    endX: startX,
    endY: startY,
    startRot: rand(-45, 45),
    endRot: rand(-90, 90),
    size: rand(7, 10),
    color: '#ffe0b8',
    lifetimeMs: rand(380, 560),
  };
}

function ember(id: number): ParticleConfig {
  const startX = rand(15, 85);
  const startY = rand(70, 95);
  return {
    id,
    kind: 'ember',
    startX,
    startY,
    endX: startX + rand(-12, 12),
    endY: startY - rand(70, 100),
    size: rand(6, 9),
    color: pick(['#ff8c50', '#ff5a4c']),
    lifetimeMs: rand(1100, 1500),
  };
}

export const adminPreset: AuraPresetSpec = {
  id: 'admin-embers',
  spawnIntervalMs: 200,
  spawnJitterMs: 110,
  maxAlive: 11,

  emit(nextId) {
    // 70% sparks, 25% sparkles, 5% slow embers — same weighting as the
    // C# AdminAuraPreset.EmitParticle dispatcher.
    const r = Math.random();
    if (r < 0.70) return spark(nextId);
    if (r < 0.95) return sparkle(nextId);
    return ember(nextId);
  },
};
