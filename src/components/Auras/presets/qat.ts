import type { AuraPresetSpec } from '../types';

// QAT: drifting teal/green music notes (rendered as filled tear-drop shapes).
const palette = ['#50dcc8', '#78e696'];

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function emitNote(host: HTMLElement) {
  const el = document.createElement('div');
  el.className = 'aura-particle aura-particle-note';
  const startX = rand(5, 95);
  const startY = rand(15, 80);
  const driftX = rand(-25, 25);
  const driftY = rand(-70, -35);
  const startRot = rand(-15, 15);
  const lifetime = rand(1300, 1800);
  const colour = palette[Math.floor(Math.random() * palette.length)];
  el.style.background = colour;
  el.style.boxShadow = `0 0 5px ${colour}`;
  el.style.setProperty('--start-x', `${startX}%`);
  el.style.setProperty('--start-y', `${startY}%`);
  el.style.setProperty('--end-x', `${startX + driftX}%`);
  el.style.setProperty('--end-y', `${startY + driftY}%`);
  el.style.setProperty('--start-rot', `${startRot}deg`);
  el.style.setProperty('--end-rot', `${startRot + rand(-25, 25)}deg`);
  el.style.setProperty('--lifetime', `${lifetime}ms`);
  el.addEventListener('animationend', () => el.remove());
  host.appendChild(el);
}

function background(): HTMLElement {
  const halo = document.createElement('div');
  halo.className = 'aura-halo';
  halo.style.background = 'radial-gradient(ellipse at center, #5adcbe 0%, transparent 70%)';
  return halo;
}

export const qatPreset: AuraPresetSpec = {
  id: 'qat-notes',
  spawnIntervalMs: 460,
  spawnJitterMs: 180,
  maxAlive: 6,
  emit: emitNote,
  background,
};
