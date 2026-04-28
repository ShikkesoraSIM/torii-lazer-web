import type { AuraPresetSpec, ParticleConfig } from '../types';

// Dev: rising cyan data bits + occasional `<` `>` bracket glyphs.
// Persistent cyan halo (slower pulse than admin — dev = "calm focus").
const palette = ['#78dcff', '#b4f0ff', '#50aae6'];

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

function bit(id: number): ParticleConfig {
  const startX = rand(5, 95);
  const startY = rand(60, 95);
  return {
    id,
    kind: 'bit',
    startX,
    startY,
    endX: startX + rand(-5, 5),
    endY: startY + rand(-90, -60),
    size: rand(3, 5),
    color: pick(palette),
    lifetimeMs: rand(800, 1200),
  };
}

function bracket(id: number): ParticleConfig {
  const startX = rand(10, 90);
  const startY = rand(55, 90);
  return {
    id,
    // Coin flip between < and > for syntax-token feel.
    kind: Math.random() < 0.5 ? 'less' : 'greater',
    startX,
    startY,
    endX: startX,
    endY: startY - rand(60, 80),
    size: rand(8, 11),
    color: '#b4f0ff',
    lifetimeMs: rand(900, 1200),
  };
}

export const devPreset: AuraPresetSpec = {
  id: 'dev-bits',
  spawnIntervalMs: 220,
  spawnJitterMs: 130,
  maxAlive: 9,
  hasHalo: true,
  haloColor: 'radial-gradient(ellipse at center, #78dcff 0%, transparent 70%)',

  emit(nextId) {
    return Math.random() < 0.80 ? bit(nextId) : bracket(nextId);
  },
};
