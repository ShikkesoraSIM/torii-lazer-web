import type { AuraPresetSpec, ParticleConfig } from '../types';

// Supporter hearts family — same heart motion across the four loyalty
// tiers (pink → bronze → silver → gold), only the colour palette differs.
// Built as a factory so adding a new tier later is one new constant +
// one factory call.

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/** Build a supporter-hearts aura preset with a custom palette + id. */
function makeSupporterPreset(opts: {
  id: string;
  palette: readonly string[];
}): AuraPresetSpec {
  return {
    id: opts.id,
    spawnIntervalMs: 540,
    spawnJitterMs: 240,
    maxAlive: 6,

    emit(nextId): ParticleConfig {
      const startX = rand(8, 92);
      const startY = rand(55, 95);
      return {
        id: nextId,
        kind: 'heart',
        startX,
        startY,
        endX: startX + rand(-15, 15),
        endY: startY - rand(55, 90),
        size: rand(10, 14),
        color: pick(opts.palette as string[]),
        lifetimeMs: rand(1500, 2000),
        pulse: true,
      };
    },
  };
}

// ── Tier palettes — kept in sync with the C# preset palettes so the
// web preview reads as the SAME colour as the lazer client renders. ──

// Default supporter — warm pinks (osu!supporter heart family).
const PINK_PALETTE = ['#ff82c8', '#ffa5d7', '#e664af'] as const;

// Bronze (6+ cumulative months) — warm copper.
const BRONZE_PALETTE = ['#cd7f32', '#e89b4c', '#b46423'] as const;

// Silver (12+ months) — cool platinum with slight blue tint.
const SILVER_PALETTE = ['#dce0e8', '#c0c5cf', '#a8b2c3'] as const;

// Gold (36+ months) — rich warm gold.
const GOLD_PALETTE = ['#ffd700', '#ffc33c', '#e6af14'] as const;


export const supporterPreset = makeSupporterPreset({
  id: 'supporter-hearts',
  palette: PINK_PALETTE,
});

export const supporterBronzePreset = makeSupporterPreset({
  id: 'supporter-hearts-bronze',
  palette: BRONZE_PALETTE,
});

export const supporterSilverPreset = makeSupporterPreset({
  id: 'supporter-hearts-silver',
  palette: SILVER_PALETTE,
});

export const supporterGoldPreset = makeSupporterPreset({
  id: 'supporter-hearts-gold',
  palette: GOLD_PALETTE,
});
