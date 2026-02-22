import React from 'react';

export type ScoreMod = {
  acronym: string;
  settings?: Record<string, unknown>;
  [key: string]: unknown;
};

const DEFAULT_SPEED_BY_MOD: Record<string, number> = {
  DT: 1.5,
  NC: 1.5,
  HT: 0.75,
  DC: 0.75,
};

const SPEED_MODS = new Set(Object.keys(DEFAULT_SPEED_BY_MOD));
const DIFFICULTY_ADJUST_MODS = new Set(['DA']);

const parsePositiveNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
};

const getSpeedMultiplier = (mod: ScoreMod): number | null => {
  if (!SPEED_MODS.has(mod.acronym)) return null;

  const settings = typeof mod.settings === 'object' && mod.settings ? mod.settings : {};
  const candidates = [
    (settings as Record<string, unknown>).speed_change,
    (settings as Record<string, unknown>).speed_multiplier,
    (settings as Record<string, unknown>).speedMultiplier,
    (settings as Record<string, unknown>).rate,
    (mod as Record<string, unknown>).speed_change,
    (mod as Record<string, unknown>).speed_multiplier,
    (mod as Record<string, unknown>).speedMultiplier,
    (mod as Record<string, unknown>).clock_rate,
  ];

  for (const candidate of candidates) {
    const parsed = parsePositiveNumber(candidate);
    if (parsed !== null) return parsed;
  }

  return DEFAULT_SPEED_BY_MOD[mod.acronym] ?? null;
};

const getDifficultyAdjustLabel = (mod: ScoreMod): string | null => {
  if (!DIFFICULTY_ADJUST_MODS.has(mod.acronym)) return null;

  const settings = typeof mod.settings === 'object' && mod.settings ? mod.settings : {};
  const source = settings as Record<string, unknown>;

  const extract = (keys: string[]): number | null => {
    for (const key of keys) {
      const parsed = parsePositiveNumber(source[key]);
      if (parsed !== null) return parsed;
    }
    return null;
  };

  const changedStats: Array<[string, number | null]> = [
    ['AR', extract(['approach_rate', 'approachRate', 'ar'])],
    ['OD', extract(['overall_difficulty', 'overallDifficulty', 'od'])],
    ['CS', extract(['circle_size', 'circleSize', 'cs'])],
    ['HP', extract(['drain_rate', 'drainRate', 'hp', 'hp_drain'])],
  ];

  const parts = changedStats
    .filter(([, value]) => value !== null)
    .map(([name, value]) => `${name}${(value as number).toFixed(1).replace(/\.0$/, '')}`);

  if (parts.length === 0) return null;
  return `${mod.acronym} ${parts.join(' ')}`;
};

const ModChip: React.FC<{ mod: ScoreMod }> = ({ mod }) => {
  const speed = getSpeedMultiplier(mod);
  const daLabel = getDifficultyAdjustLabel(mod);
  const label = speed ? `${mod.acronym} ${speed.toFixed(2)}x` : daLabel ?? mod.acronym;
  const title = speed
    ? `${mod.acronym} with rate ${speed.toFixed(2)}x`
    : daLabel
      ? `Difficulty Adjust: ${daLabel.replace(`${mod.acronym} `, '')}`
      : mod.acronym;

  return (
    <span
      title={title}
      className={[
        'inline-flex items-center px-2 py-0.5 rounded-full',
        'text-[10px] font-semibold tracking-wide',
        speed
          ? 'text-rose-100 bg-gradient-to-r from-rose-600/90 via-rose-500/85 to-red-500/75 border border-rose-300/20'
          : 'text-white/85 bg-white/10 border border-white/15',
      ].join(' ')}
    >
      {label}
    </span>
  );
};

const ScoreModsDisplay: React.FC<{ mods?: ScoreMod[] }> = ({ mods }) => {
  if (!mods || mods.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      {mods.map((mod, index) => (
        <ModChip key={`${mod.acronym}-${index}`} mod={mod} />
      ))}
    </div>
  );
};

export default ScoreModsDisplay;
