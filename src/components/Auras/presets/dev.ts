import type { AuraPresetSpec } from '../types';

// Dev: rising cyan data bits + faint persistent halo.
const palette = ['#78dcff', '#b4f0ff', '#50aae6'];

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function emitBit(host: HTMLElement) {
  const el = document.createElement('div');
  el.className = 'aura-particle aura-particle-bit';
  const startX = rand(5, 95);
  const startY = rand(60, 95);
  const driftX = rand(-5, 5);
  const driftY = rand(-90, -60);
  const lifetime = rand(800, 1200);
  const colour = palette[Math.floor(Math.random() * palette.length)];
  el.style.background = colour;
  el.style.boxShadow = `0 0 3px ${colour}`;
  el.style.setProperty('--start-x', `${startX}%`);
  el.style.setProperty('--start-y', `${startY}%`);
  el.style.setProperty('--end-x', `${startX + driftX}%`);
  el.style.setProperty('--end-y', `${startY + driftY}%`);
  el.style.setProperty('--lifetime', `${lifetime}ms`);
  el.addEventListener('animationend', () => el.remove());
  host.appendChild(el);
}

function background(): HTMLElement {
  const halo = document.createElement('div');
  halo.className = 'aura-halo';
  halo.style.background = 'radial-gradient(ellipse at center, #78dcff 0%, transparent 70%)';
  return halo;
}

export const devPreset: AuraPresetSpec = {
  id: 'dev-bits',
  spawnIntervalMs: 240,
  spawnJitterMs: 140,
  maxAlive: 8,
  emit: emitBit,
  background,
};
