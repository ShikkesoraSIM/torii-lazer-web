import type { AuraPresetSpec } from '../types';

// Mod: gold orbiting shields with a steady pulse + faint halo.
const palette = ['#ffd270', '#ffaf46'];

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function emitShield(host: HTMLElement) {
  const el = document.createElement('div');
  el.className = 'aura-particle aura-particle-shield';
  const startX = rand(8, 92);
  const startY = rand(15, 85);
  const driftX = rand(-25, 25);
  const driftY = rand(-25, 25);
  const lifetime = rand(1500, 2300);
  const colour = palette[Math.floor(Math.random() * palette.length)];
  el.style.background = colour;
  el.style.boxShadow = `0 0 6px ${colour}`;
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
  halo.style.background = 'radial-gradient(ellipse at center, #ffc35a 0%, transparent 70%)';
  return halo;
}

export const modPreset: AuraPresetSpec = {
  id: 'mod-shields',
  spawnIntervalMs: 600,
  spawnJitterMs: 200,
  maxAlive: 5,
  emit: emitShield,
  background,
};
