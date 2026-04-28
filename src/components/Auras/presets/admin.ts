import type { AuraPresetSpec } from '../types';

// Admin: rising sparks + occasional sparkles. No persistent halo (matches
// the C# preset which intentionally dropped the halo per user feedback).
const palette = ['#ff5a4c', '#ff8c50', '#ffe0b8'];

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function emitSpark(host: HTMLElement) {
  const el = document.createElement('div');
  el.className = 'aura-particle aura-particle-spark';
  const startX = rand(5, 95);
  const startY = rand(60, 95);
  const driftX = rand(-8, 8);
  const driftY = rand(-90, -55);
  const length = rand(6, 11);
  const lifetime = rand(700, 1100);
  const colour = palette[Math.floor(Math.random() * palette.length)];
  el.style.height = `${length}px`;
  el.style.background = `linear-gradient(to top, transparent, ${colour})`;
  el.style.boxShadow = `0 0 4px ${colour}`;
  el.style.setProperty('--start-x', `${startX}%`);
  el.style.setProperty('--start-y', `${startY}%`);
  el.style.setProperty('--end-x', `${startX + driftX}%`);
  el.style.setProperty('--end-y', `${startY + driftY}%`);
  el.style.setProperty('--lifetime', `${lifetime}ms`);
  el.addEventListener('animationend', () => el.remove());
  host.appendChild(el);
}

function emitSparkle(host: HTMLElement) {
  const el = document.createElement('div');
  el.className = 'aura-particle aura-particle-sparkle';
  const startX = rand(15, 85);
  const startY = rand(20, 80);
  const lifetime = rand(380, 560);
  el.style.setProperty('--col', '#ffe0b8');
  el.style.setProperty('--start-x', `${startX}%`);
  el.style.setProperty('--start-y', `${startY}%`);
  el.style.setProperty('--lifetime', `${lifetime}ms`);
  el.addEventListener('animationend', () => el.remove());
  host.appendChild(el);
}

export const adminPreset: AuraPresetSpec = {
  id: 'admin-embers',
  spawnIntervalMs: 200,
  spawnJitterMs: 110,
  maxAlive: 11,

  emit(host) {
    // 80% sparks, 20% sparkles — same weighting as the C# preset's
    // dominant motion + accent pattern.
    if (Math.random() < 0.8) emitSpark(host);
    else emitSparkle(host);
  },
};
