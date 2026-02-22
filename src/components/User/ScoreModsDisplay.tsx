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
const SPEED_EPSILON = 0.001;

const parsePositiveNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
};

const getSpeedInfo = (mod: ScoreMod): { multiplier: number; showCustomRate: boolean } | null => {
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

  let explicitMultiplier: number | null = null;
  for (const candidate of candidates) {
    const parsed = parsePositiveNumber(candidate);
    if (parsed !== null) {
      explicitMultiplier = parsed;
      break;
    }
  }

  const defaultMultiplier = DEFAULT_SPEED_BY_MOD[mod.acronym];
  if (defaultMultiplier === undefined) return null;

  if (explicitMultiplier === null) {
    return { multiplier: defaultMultiplier, showCustomRate: false };
  }

  const isCustom = Math.abs(explicitMultiplier - defaultMultiplier) > SPEED_EPSILON;
  return { multiplier: explicitMultiplier, showCustomRate: isCustom };
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

const getDifficultyAdjustParts = (mod: ScoreMod): Array<{ stat: string; value: string }> => {
  if (!DIFFICULTY_ADJUST_MODS.has(mod.acronym)) return [];

  const settings = typeof mod.settings === 'object' && mod.settings ? mod.settings : {};
  const source = settings as Record<string, unknown>;

  const extract = (keys: string[]): number | null => {
    for (const key of keys) {
      const parsed = parsePositiveNumber(source[key]);
      if (parsed !== null) return parsed;
    }
    return null;
  };

  return [
    { stat: 'AR', value: extract(['approach_rate', 'approachRate', 'ar']) },
    { stat: 'OD', value: extract(['overall_difficulty', 'overallDifficulty', 'od']) },
    { stat: 'CS', value: extract(['circle_size', 'circleSize', 'cs']) },
    { stat: 'HP', value: extract(['drain_rate', 'drainRate', 'hp', 'hp_drain']) },
  ]
    .filter((entry): entry is { stat: string; value: number } => entry.value !== null)
    .map((entry) => ({
      stat: entry.stat,
      value: entry.value.toFixed(1).replace(/\.0$/, ''),
    }));
};

const ModChip: React.FC<{ mod: ScoreMod }> = ({ mod }) => {
  const speedInfo = getSpeedInfo(mod);
  const speed = speedInfo?.multiplier ?? null;
  const daParts = getDifficultyAdjustParts(mod);
  const daLabel = getDifficultyAdjustLabel(mod);
  const isDifficultyAdjust = daParts.length > 0;
  const isSpeedAdjust = speedInfo !== null;
  const showSpeedRate = speedInfo?.showCustomRate ?? false;
  const isSlowdownMod = mod.acronym === 'HT' || mod.acronym === 'DC';
  const label = speed ? `${mod.acronym} ${speed.toFixed(2)}x` : daLabel ?? mod.acronym;
  const title = speed
    ? showSpeedRate
      ? `${mod.acronym} with rate ${speed.toFixed(2)}x`
      : mod.acronym
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
          ? isSlowdownMod
            ? 'text-lime-100 bg-gradient-to-r from-lime-700/90 via-emerald-700/85 to-yellow-700/80 border border-lime-300/20'
            : 'text-rose-100 bg-gradient-to-r from-rose-600/90 via-rose-500/85 to-red-500/75 border border-rose-300/20'
          : isDifficultyAdjust
            ? 'text-violet-100 bg-gradient-to-r from-violet-700/90 via-fuchsia-700/85 to-indigo-700/80 border border-violet-300/25'
          : 'text-white bg-slate-800/70 border border-slate-200/30 shadow-[0_1px_2px_rgba(0,0,0,0.35)] backdrop-blur-[2px]',
      ].join(' ')}
    >
      {isDifficultyAdjust ? (
        <>
          <span className="text-violet-50/95 font-bold mr-1">DA</span>
          <span className="flex items-center gap-1">
            {daParts.map((part) => (
              <span
                key={part.stat}
                className="inline-flex items-center gap-0.5 rounded-md px-1 py-[1px] bg-black/25 border border-white/15 text-[9px]"
              >
                <span className="text-violet-200/95">{part.stat}</span>
                <span className="text-white">{part.value}</span>
              </span>
            ))}
          </span>
        </>
      ) : isSpeedAdjust ? (
        <>
          <span className={`${isSlowdownMod ? 'text-lime-50/95' : 'text-rose-50/95'} font-bold ${showSpeedRate ? 'mr-1' : ''}`}>
            {mod.acronym}
          </span>
          {showSpeedRate && (
            <span className="inline-flex items-center gap-0.5 rounded-md px-1 py-[1px] bg-black/25 border border-white/15 text-[9px]">
              <span className="text-white">{speedInfo.multiplier.toFixed(2)}x</span>
            </span>
          )}
        </>
      ) : (
        label
      )}
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
