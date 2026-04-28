import type { AuraPresetSpec } from '../types';

// Goof: drifting pastel-green leaves with a hover bob. No persistent halo
// (matches the C# preset).
const palette = ['#9ce5a0', '#bef0af', '#78d291'];

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function emitLeaf(host: HTMLElement) {
  const el = document.createElement('div');
  el.className = 'aura-particle aura-particle-leaf';
  const startX = rand(8, 92);
  const startY = rand(15, 85);
  const driftX = rand(-15, 15);
  const driftY = rand(-30, 30);
  const startRot = rand(-30, 30);
  const lifetime = rand(1900, 2700);
  const colour = palette[Math.floor(Math.random() * palette.length)];
  el.style.setProperty('--col', colour);
  el.style.background = colour;
  el.style.boxShadow = `0 0 5px ${colour}`;
  el.style.setProperty('--start-x', `${startX}%`);
  el.style.setProperty('--start-y', `${startY}%`);
  el.style.setProperty('--end-x', `${startX + driftX}%`);
  el.style.setProperty('--end-y', `${startY + driftY}%`);
  el.style.setProperty('--start-rot', `${startRot}deg`);
  el.style.setProperty('--end-rot', `${startRot + rand(-45, 45)}deg`);
  el.style.setProperty('--lifetime', `${lifetime}ms`);
  el.addEventListener('animationend', () => el.remove());
  host.appendChild(el);
}

export const goofPreset: AuraPresetSpec = {
  id: 'goof-leaves',
  spawnIntervalMs: 520,
  spawnJitterMs: 240,
  maxAlive: 5,
  emit: emitLeaf,
};
