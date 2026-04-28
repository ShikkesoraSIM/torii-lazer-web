import type { AuraPresetSpec } from '../types';

// Supporter: pink rising hearts with a heartbeat pulse. No persistent halo
// (matches the C# preset).
const palette = ['#ff7fc8', '#ffaad7', '#e664af'];

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function emitHeart(host: HTMLElement) {
  const el = document.createElement('div');
  el.className = 'aura-particle aura-particle-heart';
  const startX = rand(8, 92);
  const startY = rand(55, 95);
  const driftX = rand(-15, 15);
  const driftY = rand(-90, -55);
  const lifetime = rand(1500, 2000);
  const colour = palette[Math.floor(Math.random() * palette.length)];
  el.style.setProperty('--col', colour);
  el.style.setProperty('--start-x', `${startX}%`);
  el.style.setProperty('--start-y', `${startY}%`);
  el.style.setProperty('--end-x', `${startX + driftX}%`);
  el.style.setProperty('--end-y', `${startY + driftY}%`);
  el.style.setProperty('--lifetime', `${lifetime}ms`);
  el.addEventListener('animationend', () => el.remove());
  host.appendChild(el);
}

export const supporterPreset: AuraPresetSpec = {
  id: 'supporter-hearts',
  spawnIntervalMs: 540,
  spawnJitterMs: 220,
  maxAlive: 6,
  emit: emitHeart,
};
