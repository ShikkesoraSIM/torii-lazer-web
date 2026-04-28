import type { AuraPresetSpec, ParticleConfig } from '../types';

// QAT: drifting teal/green FaMusic notes + occasional FaCheck "approval"
// flashes. Persistent teal halo. Same dispatcher weighting as the C#
// QatAuraPreset (85% notes, 15% checks).
const palette = ['#50dcc8', '#78e696'];

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

function note(id: number): ParticleConfig {
  const startX = rand(5, 95);
  const startY = rand(15, 80);
  const startRot = rand(-15, 15);
  return {
    id,
    kind: 'note',
    startX,
    startY,
    endX: startX + rand(-25, 25),
    endY: startY - rand(35, 70),
    startRot,
    endRot: startRot + rand(-25, 25),
    size: rand(11, 14),
    color: pick(palette),
    lifetimeMs: rand(1300, 1800),
  };
}

function check(id: number): ParticleConfig {
  const startX = rand(15, 85);
  const startY = rand(20, 80);
  return {
    id,
    kind: 'check',
    startX,
    startY,
    endX: startX,
    endY: startY,
    size: rand(10, 13),
    color: '#78e696',
    lifetimeMs: rand(420, 580),
  };
}

export const qatPreset: AuraPresetSpec = {
  id: 'qat-notes',
  spawnIntervalMs: 460,
  spawnJitterMs: 200,
  maxAlive: 6,
  hasHalo: true,
  haloColor: 'radial-gradient(ellipse at center, #5adcbe 0%, transparent 70%)',

  emit(nextId) {
    return Math.random() < 0.85 ? note(nextId) : check(nextId);
  },
};
