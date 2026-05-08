import React, { useMemo, useState } from 'react';
import type {
  ApiMod,
  ModCatalogByRuleset,
  ModDefinition,
  ModSetting,
  ModSettingType,
  ModType,
} from '../../types/mods';

// ──────────────────────────────────────────────────────────────────────
// ModPicker
//
// Generic mod selection control used for both `required_mods` and
// `allowed_mods` in the Daily Challenge admin form.
//
// Highlights:
//   • Tabs by ModType (DifficultyReduction, DifficultyIncrease,
//     Conversion, Automation, Fun) — System is hidden because admins
//     never want to apply ScoreV2 etc. to a daily challenge.
//   • Search box filters the visible card grid by acronym/name.
//   • Each selected mod can be expanded to tweak its `Settings`
//     (number/boolean/string) which round-trip through the
//     `ApiMod.settings` map.
//   • Conflicts are surfaced both ways: cards for mods incompatible
//     with the current selection get a red ring, and cards for mods
//     incompatible with the *other* picker (passed via `conflictWith`)
//     show a yellow ring with a tooltip.
// ──────────────────────────────────────────────────────────────────────

const MOD_TYPE_ORDER: ModType[] = [
  'DifficultyReduction',
  'DifficultyIncrease',
  'Conversion',
  'Automation',
  'Fun',
];

const MOD_TYPE_LABEL: Record<ModType, string> = {
  DifficultyReduction: 'Reduction',
  DifficultyIncrease: 'Increase',
  Conversion: 'Conversion',
  Automation: 'Automation',
  Fun: 'Fun',
  System: 'System',
};

const MOD_TYPE_ACCENT: Record<ModType, string> = {
  DifficultyReduction: 'from-emerald-500/30 to-emerald-500/10 border-emerald-400/50',
  DifficultyIncrease: 'from-rose-500/30 to-rose-500/10 border-rose-400/50',
  Conversion: 'from-violet-500/30 to-violet-500/10 border-violet-400/50',
  Automation: 'from-sky-500/30 to-sky-500/10 border-sky-400/50',
  Fun: 'from-amber-500/30 to-amber-500/10 border-amber-400/50',
  System: 'from-slate-500/30 to-slate-500/10 border-slate-400/50',
};

const MOD_TYPE_CHIP_CLASS: Record<ModType, string> = {
  DifficultyReduction: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
  DifficultyIncrease: 'bg-rose-500/20 text-rose-200 border-rose-400/40',
  Conversion: 'bg-violet-500/20 text-violet-200 border-violet-400/40',
  Automation: 'bg-sky-500/20 text-sky-200 border-sky-400/40',
  Fun: 'bg-amber-500/20 text-amber-200 border-amber-400/40',
  System: 'bg-slate-500/20 text-slate-200 border-slate-400/40',
};

// ─── Smart numeric defaults ───────────────────────────────────────
//
// `static/mods.json` doesn't include min/max/step for numeric
// settings — that lives in C# attributes on the actual mod classes.
// We bake in best-known ranges keyed by setting name so the UI shows
// sensible inputs. Anything not listed falls through to a free-form
// number input with step 0.1.
//
// Source: osu-framework / osu! lazer (`Mod*.cs` files), cross-referenced
// with what the mods do at runtime.

interface NumericRangeHint {
  min?: number;
  max?: number;
  step?: number;
  default?: number;
}

const NUMERIC_HINTS: Record<string, NumericRangeHint> = {
  // Rate-adjust mods
  speed_change: { min: 0.5, max: 2.0, step: 0.05, default: 1 },
  // PA — pitch adjust. UI doesn't enforce extended_limits here; the
  // server / client clamp at run time. Wider slider so admins can pick
  // chipmunk values when extended_limits is on.
  pitch_shift: { min: 0.1, max: 3.0, step: 0.05, default: 1 },
  initial_rate: { min: 0.5, max: 2.0, step: 0.05, default: 1 },
  final_rate: { min: 0.5, max: 2.0, step: 0.05, default: 1.5 },
  // Difficulty Adjust (DA)
  circle_size: { min: 0, max: 11, step: 0.1 },
  approach_rate: { min: 0, max: 11, step: 0.1 },
  drain_rate: { min: 0, max: 11, step: 0.1 },
  overall_difficulty: { min: 0, max: 11, step: 0.1 },
  scroll_speed: { min: 0.5, max: 8, step: 0.1 },
  // EZ — extra lives
  retries: { min: 0, max: 10, step: 1, default: 2 },
  // Hidden / Cover
  coverage: { min: 0, max: 1, step: 0.05, default: 0.5 },
  fade_in: { min: 0, max: 1, step: 0.05, default: 0.5 },
  // Random seed
  seed: { min: 0, max: 2147483647, step: 1 },
  // FL flashlight follow delay
  follow_delay: { min: 120, max: 1200, step: 60, default: 120 },
  size_multiplier: { min: 0.5, max: 2.0, step: 0.1, default: 1 },
  // AC accuracy challenge minimum
  minimum_accuracy: { min: 0, max: 1, step: 0.01, default: 0.9 },
  // BL blinds strength
  strength: { min: 0, max: 1, step: 0.05, default: 0.4 },
  // Mania scroll speed
  scroll_direction: { min: 0, max: 1, step: 1 },
};

const inferNumericHint = (name: string): NumericRangeHint => NUMERIC_HINTS[name] ?? { step: 0.1 };

// ─── helpers ─────────────────────────────────────────────────────

const findMod = (catalog: ModDefinition[], acronym: string): ModDefinition | undefined =>
  catalog.find((m) => m.Acronym === acronym);

/**
 * A1 audit fix: a mod is "configured enough" when it doesn't require
 * configuration, OR when the admin has touched at least one of its
 * settings. Originally this required ALL settings to be present, but
 * that turned into a false-positive trap: PA's secondary boolean toggle
 * (`extended_limits`) almost never needs to be set explicitly — it
 * defaults to false and the slider's primary value (`pitch_shift`) is
 * what actually does the work. Requiring both blocked perfectly-valid
 * configurations like "PA at 1.15× with safe limits" (the default).
 *
 * Now the rule is just: did the admin touch ANY setting? If yes, trust
 * them. The osu! game client and the server fall back to per-setting
 * defaults for anything left unset, so a mod with `{pitch_shift: 1.15}`
 * works perfectly fine even though `extended_limits` is implicit.
 *
 * The visual ⚠ in the picker still surfaces "you added this mod but
 * haven't tweaked anything" — useful when the auto-fill defaults
 * (`initialSettingsFor`) haven't kicked in for some setting.
 */
export const isModFullyConfigured = (def: ModDefinition, mod: ApiMod): boolean => {
  if (!def.RequiresConfiguration) return true;
  if (def.Settings.length === 0) return true;
  const settings = mod.settings ?? {};
  return Object.keys(settings).length > 0;
};

/**
 * Pre-fill the obvious defaults when the admin first adds a mod that
 * needs configuration — saves them from clicking through 3 fields just
 * to get a baseline. Defaults come from the same NUMERIC_HINTS table the
 * sliders use, so what we stamp in == what the slider would centre on.
 *
 * Returns a settings dict suitable for ApiMod.settings, or undefined if
 * we can't pre-fill anything sensible (admin still has to fill it).
 */
const initialSettingsFor = (def: ModDefinition): Record<string, number | boolean | string> | undefined => {
  if (!def.RequiresConfiguration || def.Settings.length === 0) return undefined;
  const out: Record<string, number | boolean | string> = {};
  let any = false;
  for (const s of def.Settings) {
    if (s.Type === 'number') {
      const hint = NUMERIC_HINTS[s.Name];
      if (hint?.default !== undefined) {
        out[s.Name] = hint.default;
        any = true;
      }
    }
    // booleans intentionally left undefined — admin should opt in.
    // strings without explicit defaults same.
  }
  return any ? out : undefined;
};

const incompatibleAcronyms = (catalog: ModDefinition[], selected: ApiMod[]): Set<string> => {
  const out = new Set<string>();
  for (const sel of selected) {
    const def = findMod(catalog, sel.acronym);
    def?.IncompatibleMods.forEach((a) => out.add(a));
  }
  // A selected mod is implicitly incompatible with itself in display,
  // but we don't add its own acronym so the user can still click to
  // deselect — the card style for selected ones is handled separately.
  return out;
};

const sanitizeSettings = (raw: Record<string, unknown> | undefined): Record<string, number | boolean | string> | undefined => {
  if (!raw) return undefined;
  const cleaned: Record<string, number | boolean | string> = {};
  let any = false;
  for (const [k, v] of Object.entries(raw)) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string') {
      cleaned[k] = v;
      any = true;
    }
  }
  return any ? cleaned : undefined;
};

// ─── component ───────────────────────────────────────────────────

export interface ModPickerProps {
  /** Full catalog keyed by ruleset id. */
  catalog: ModCatalogByRuleset;
  /** Currently selected ruleset (0=osu,1=taiko,2=fruits,3=mania). */
  rulesetId: number;
  /** Current selection in wire format. */
  value: ApiMod[];
  /** Push a new selection — caller stores it in form state. */
  onChange: (mods: ApiMod[]) => void;
  /**
   * Mods picked in the *other* slot. Their incompatibilities are
   * surfaced as yellow warnings (rather than the harder red used
   * for conflicts within the same slot).
   */
  conflictWith?: ApiMod[];
  /** Hide mods that aren't `UserPlayable` (default true). */
  hideNonPlayable?: boolean;
  /** Hide mods that aren't `ValidForMultiplayer` (default true for daily challenges). */
  multiplayerOnly?: boolean;
  /** Optional placeholder text when nothing is selected. */
  emptyLabel?: string;
}

const ModPicker: React.FC<ModPickerProps> = ({
  catalog,
  rulesetId,
  value,
  onChange,
  conflictWith = [],
  hideNonPlayable = true,
  multiplayerOnly = true,
  emptyLabel = 'No mods selected',
}) => {
  // Belt-and-suspenders: if the catalog hands us a non-array (e.g. an old
  // server returned a dict-of-acronym instead of an array), turn it into an
  // array so the rest of the component never explodes on `for...of`.
  const rawMods = catalog[String(rulesetId)];
  const allMods: ModDefinition[] = Array.isArray(rawMods)
    ? rawMods
    : rawMods && typeof rawMods === 'object'
      ? (Object.values(rawMods) as ModDefinition[])
      : [];
  const [activeType, setActiveType] = useState<ModType>('DifficultyReduction');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  // Group mods by type, after applying playability filters.
  const grouped: Record<ModType, ModDefinition[]> = useMemo(() => {
    const out: Record<ModType, ModDefinition[]> = {
      DifficultyReduction: [],
      DifficultyIncrease: [],
      Conversion: [],
      Automation: [],
      Fun: [],
      System: [],
    };
    for (const m of allMods) {
      if (hideNonPlayable && !m.UserPlayable) continue;
      if (multiplayerOnly && !m.ValidForMultiplayer) continue;
      out[m.Type]?.push(m);
    }
    // Sort alphabetically inside each tab — predictable for admins.
    for (const t of MOD_TYPE_ORDER) {
      out[t].sort((a, b) => a.Acronym.localeCompare(b.Acronym));
    }
    return out;
  }, [allMods, hideNonPlayable, multiplayerOnly]);

  const selectedSet = useMemo(() => new Set(value.map((m) => m.acronym)), [value]);
  const conflictWithSet = useMemo(() => new Set(conflictWith.map((m) => m.acronym)), [conflictWith]);

  // Hard conflicts: incompatibilities arising from currently-selected mods (same picker).
  const hardConflicts = useMemo(() => incompatibleAcronyms(allMods, value), [allMods, value]);
  // Soft conflicts: incompatibilities arising from the *other* picker.
  const softConflicts = useMemo(() => incompatibleAcronyms(allMods, conflictWith), [allMods, conflictWith]);

  // Filtered list shown in the active tab.
  const visible = useMemo(() => {
    const base = grouped[activeType];
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (m) =>
        m.Acronym.toLowerCase().includes(q) ||
        m.Name.toLowerCase().includes(q) ||
        m.Description.toLowerCase().includes(q),
    );
  }, [grouped, activeType, search]);

  const toggleMod = (def: ModDefinition) => {
    const exists = value.find((m) => m.acronym === def.Acronym);
    if (exists) {
      onChange(value.filter((m) => m.acronym !== def.Acronym));
      if (expanded === def.Acronym) setExpanded(null);
    } else {
      // Stamp in sensible defaults for RequiresConfiguration mods so the
      // admin lands on a usable baseline rather than `{acronym:"PA"}` —
      // see initialSettingsFor() docstring.
      const seedSettings = initialSettingsFor(def);
      const newMod: ApiMod = seedSettings ? { acronym: def.Acronym, settings: seedSettings } : { acronym: def.Acronym };
      onChange([...value, newMod]);
      // Auto-expand if the mod has user-tweakable settings.
      if (def.Settings.length > 0) setExpanded(def.Acronym);
    }
  };

  /**
   * Bulk-select every mod the picker shows. Skips:
   *   - mods already in the OTHER slot (no point duplicating)
   *   - mods incompatible with the OTHER slot (would be invalid configurations)
   *
   * Within this slot we pick a single mod from each incompatibility group: as we
   * iterate alphabetically (by tab order), once we add a mod, anything it lists in
   * IncompatibleMods is skipped. This way "select all" produces a coherent free-mod
   * pool — e.g. you get DT but not also HT/NC.
   */
  const selectAllAvailable = () => {
    const localBlocked = new Set<string>(conflictWithSet);
    softConflicts.forEach((a) => localBlocked.add(a));

    const next: ApiMod[] = [...value];
    const inSelection = new Set(value.map((m) => m.acronym));

    for (const t of MOD_TYPE_ORDER) {
      for (const def of grouped[t]) {
        if (inSelection.has(def.Acronym)) continue;
        if (localBlocked.has(def.Acronym)) continue;
        next.push({ acronym: def.Acronym });
        inSelection.add(def.Acronym);
        // Block anything this newly-selected mod is incompatible with so the
        // resulting bundle stays internally valid.
        def.IncompatibleMods.forEach((a) => localBlocked.add(a));
      }
    }
    onChange(next);
  };

  /** Bulk-select all mods in the currently active tab (lighter touch than `selectAllAvailable`). */
  const selectAllInTab = () => {
    const localBlocked = new Set<string>(conflictWithSet);
    softConflicts.forEach((a) => localBlocked.add(a));

    const next: ApiMod[] = [...value];
    const inSelection = new Set(value.map((m) => m.acronym));

    for (const def of grouped[activeType]) {
      if (inSelection.has(def.Acronym)) continue;
      if (localBlocked.has(def.Acronym)) continue;
      next.push({ acronym: def.Acronym });
      inSelection.add(def.Acronym);
      def.IncompatibleMods.forEach((a) => localBlocked.add(a));
    }
    onChange(next);
  };

  const updateSetting = (acronym: string, name: string, raw: number | boolean | string | undefined) => {
    onChange(
      value.map((m) => {
        if (m.acronym !== acronym) return m;
        const next = { ...(m.settings ?? {}) };
        if (raw === undefined || raw === '') delete next[name];
        else next[name] = raw;
        return { ...m, settings: sanitizeSettings(next) };
      }),
    );
  };

  return (
    <div className="rounded-xl border border-white/10 bg-[rgba(8,12,32,0.55)] p-3 space-y-3">
      {/* Tab strip */}
      <div className="flex flex-wrap gap-1.5">
        {MOD_TYPE_ORDER.map((t) => {
          const count = grouped[t].length;
          const selectedInTab = grouped[t].filter((m) => selectedSet.has(m.Acronym)).length;
          if (count === 0) return null;
          const active = activeType === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setActiveType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                active
                  ? `${MOD_TYPE_CHIP_CLASS[t]} shadow-sm`
                  : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
              }`}
            >
              {MOD_TYPE_LABEL[t]}
              {selectedInTab > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/30 text-[10px]">
                  {selectedInTab}
                </span>
              )}
            </button>
          );
        })}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search mods…"
          className="ml-auto px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:border-osu-pink/60 focus:outline-none w-44"
        />
      </div>

      {/* Bulk actions row */}
      <div className="flex flex-wrap gap-2 text-xs">
        <button
          type="button"
          onClick={selectAllInTab}
          className="px-2.5 py-1 rounded-md bg-osu-pink/10 text-osu-pink border border-osu-pink/30 hover:bg-osu-pink/20 transition-colors"
          title={`Select every mod in the ${MOD_TYPE_LABEL[activeType]} tab (skipping conflicts)`}
        >
          + Select all in {MOD_TYPE_LABEL[activeType]}
        </button>
        <button
          type="button"
          onClick={selectAllAvailable}
          className="px-2.5 py-1 rounded-md bg-osu-pink/20 text-osu-pink border border-osu-pink/40 hover:bg-osu-pink/30 transition-colors font-medium"
          title="Pick every compatible mod across every tab — useful for an 'anything goes' free-mod day"
        >
          ✦ Select every mod (all tabs)
        </button>
        {value.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="px-2.5 py-1 rounded-md bg-white/5 text-gray-300 border border-white/15 hover:bg-white/10 transition-colors"
          >
            Clear all ({value.length})
          </button>
        )}
      </div>

      {/* Mod card grid */}
      {visible.length === 0 ? (
        <div className="text-sm text-gray-500 italic p-6 text-center">
          {search ? 'No mods match your search.' : 'No mods in this category.'}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {visible.map((def) => {
            const selectedMod = value.find((m) => m.acronym === def.Acronym);
            const isSelected = !!selectedMod;
            const isHardConflict = !isSelected && hardConflicts.has(def.Acronym);
            const isSoftConflict = !isSelected && softConflicts.has(def.Acronym);
            const isInOtherSlot = conflictWithSet.has(def.Acronym);
            // A1 audit: surface "needs config" visually so admins notice before submit.
            const needsConfig = isSelected && selectedMod ? !isModFullyConfigured(def, selectedMod) : false;

            const baseClass = 'relative text-left rounded-lg border p-2 transition-all min-h-[60px] flex flex-col';
            const selClass = isSelected
              ? needsConfig
                ? `bg-gradient-to-br ${MOD_TYPE_ACCENT[def.Type]} ring-2 ring-amber-400/70`
                : `bg-gradient-to-br ${MOD_TYPE_ACCENT[def.Type]} ring-2 ring-osu-pink/40`
              : isHardConflict
                ? 'bg-rose-500/5 border-rose-400/40 opacity-60 cursor-not-allowed'
                : isSoftConflict
                  ? 'bg-amber-500/5 border-amber-400/40'
                  : isInOtherSlot
                    ? 'bg-white/5 border-white/10 opacity-60'
                    : 'bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10';

            return (
              <div key={def.Acronym} className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    if (isHardConflict) return;
                    if (isInOtherSlot) return;
                    toggleMod(def);
                  }}
                  disabled={isHardConflict || isInOtherSlot}
                  title={
                    isHardConflict
                      ? `Conflicts with ${[...hardConflicts].filter((a) => selectedSet.has(a) || allMods.find((m) => m.IncompatibleMods.includes(def.Acronym) && selectedSet.has(m.Acronym))).join(', ') || 'a selected mod'}`
                      : isInOtherSlot
                        ? 'Already used in the other slot'
                        : isSoftConflict
                          ? 'May conflict with the other slot'
                          : needsConfig
                            ? `${def.Description}\n\nThis mod requires configuration — open the settings panel and fill it in.`
                            : def.Description
                  }
                  className={`${baseClass} ${selClass} w-full`}
                >
                  <div className="flex items-baseline justify-between gap-1">
                    <span className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                      {def.Acronym}
                    </span>
                    {def.RequiresConfiguration && (
                      <span
                        className={`text-[9px] uppercase tracking-wider px-1 rounded ${
                          needsConfig
                            ? 'bg-amber-400/30 text-amber-200 ring-1 ring-amber-400/60'
                            : isSelected
                              ? 'bg-emerald-400/20 text-emerald-200'
                              : 'text-gray-400'
                        }`}
                        title={needsConfig ? 'Needs configuration' : 'Configurable'}
                      >
                        {needsConfig ? '⚠ cfg' : 'cfg'}
                      </span>
                    )}
                    {!def.RequiresConfiguration && def.Settings.length > 0 && (
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                        cfg
                      </span>
                    )}
                  </div>
                  <span className={`text-xs ${isSelected ? 'text-white/80' : 'text-gray-400'} truncate`}>
                    {def.Name}
                  </span>
                  {isSelected && def.Settings.length > 0 && (
                    <span className={`mt-1 text-[10px] ${needsConfig ? 'text-amber-300' : 'text-white/70'}`}>
                      {expanded === def.Acronym ? '▼ hide settings' : needsConfig ? '⚠ open settings' : '▶ edit settings'}
                    </span>
                  )}
                </button>
                {isSelected && def.Settings.length > 0 && (
                  <button
                    type="button"
                    className="w-full text-[10px] text-gray-400 hover:text-white px-1"
                    onClick={() => setExpanded(expanded === def.Acronym ? null : def.Acronym)}
                  >
                    {expanded === def.Acronym ? '— collapse' : '+ tweak settings'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Per-mod settings panel for the currently expanded mod */}
      {expanded && (() => {
        const def = findMod(allMods, expanded);
        const sel = value.find((m) => m.acronym === expanded);
        if (!def || !sel || def.Settings.length === 0) return null;
        return (
          <div className="rounded-lg border border-white/10 bg-black/20 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">
                  {def.Acronym} · {def.Name}
                </div>
                <div className="text-xs text-gray-400 max-w-prose">{def.Description}</div>
              </div>
              <button
                type="button"
                onClick={() => setExpanded(null)}
                className="text-xs text-gray-400 hover:text-white"
              >
                close
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {def.Settings.map((setting) => (
                <SettingControl
                  key={setting.Name}
                  setting={setting}
                  value={sel.settings?.[setting.Name]}
                  onChange={(v) => updateSetting(def.Acronym, setting.Name, v)}
                />
              ))}
            </div>
            <div className="text-[11px] text-gray-500">
              Leave a setting blank to use the mod's default. Override only what you mean to.
            </div>
          </div>
        );
      })()}

      {/* Selected summary chips */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-xs uppercase tracking-wider text-gray-500">Selected:</span>
        {value.length === 0 ? (
          <span className="text-xs text-gray-500 italic">{emptyLabel}</span>
        ) : (
          value.map((m) => {
            const def = findMod(allMods, m.acronym);
            const settingsCount = m.settings ? Object.keys(m.settings).length : 0;
            const needsConfig = def ? !isModFullyConfigured(def, m) : false;
            return (
              <span
                key={m.acronym}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs border ${
                  needsConfig
                    ? 'bg-amber-500/20 text-amber-200 border-amber-400/50 ring-1 ring-amber-400/40'
                    : def
                      ? MOD_TYPE_CHIP_CLASS[def.Type]
                      : 'bg-white/10 text-white border-white/20'
                }`}
                title={needsConfig ? `${m.acronym} needs configuration — open settings` : undefined}
              >
                {needsConfig && <span aria-hidden>⚠</span>}
                <span className="font-bold">{m.acronym}</span>
                {settingsCount > 0 && <span className="opacity-70">·{settingsCount}</span>}
                <button
                  type="button"
                  onClick={() => onChange(value.filter((x) => x.acronym !== m.acronym))}
                  className="ml-0.5 opacity-60 hover:opacity-100"
                  aria-label={`Remove ${m.acronym}`}
                >
                  ×
                </button>
              </span>
            );
          })
        )}
        {value.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="ml-auto text-[11px] text-gray-500 hover:text-white"
          >
            clear all
          </button>
        )}
      </div>
    </div>
  );
};

// ─── per-setting control ─────────────────────────────────────────

interface SettingControlProps {
  setting: ModSetting;
  value: number | boolean | string | undefined;
  onChange: (next: number | boolean | string | undefined) => void;
}

const SettingControl: React.FC<SettingControlProps> = ({ setting, value, onChange }) => {
  const t: ModSettingType = setting.Type;

  if (t === 'boolean') {
    const v = value === true;
    return (
      <label className="flex items-start gap-2 cursor-pointer p-2 rounded-md bg-white/5 hover:bg-white/10 transition-colors">
        <input
          type="checkbox"
          checked={v}
          onChange={(e) => onChange(e.target.checked ? true : undefined)}
          className="mt-0.5 w-4 h-4 accent-osu-pink"
        />
        <div className="flex-1 min-w-0">
          <div className="text-sm text-white">{setting.Label}</div>
          {setting.Description && (
            <div className="text-[11px] text-gray-400">{setting.Description}</div>
          )}
        </div>
      </label>
    );
  }

  if (t === 'number') {
    const hint = inferNumericHint(setting.Name);
    const numericValue = typeof value === 'number' ? value : '';
    const showSlider = hint.min !== undefined && hint.max !== undefined;
    return (
      <div className="p-2 rounded-md bg-white/5 space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm text-white">{setting.Label}</span>
          {/*
            Native number-input spinner buttons look like a tiny gray scrollbar
            tacked to the side; not worth keeping when there's already a real
            slider below for fine adjustment. We hide them via the Tailwind
            arbitrary-variant escape hatch (no global CSS pollution).
          */}
          <input
            type="number"
            value={numericValue}
            min={hint.min}
            max={hint.max}
            step={hint.step ?? 0.1}
            placeholder={hint.default !== undefined ? String(hint.default) : ''}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '') onChange(undefined);
              else {
                const n = parseFloat(v);
                if (!Number.isNaN(n)) onChange(n);
              }
            }}
            className="w-20 px-2 py-1 bg-black/30 border border-white/10 rounded text-sm text-white text-right tabular-nums focus:outline-none focus:border-osu-pink/60 placeholder:text-gray-600 placeholder:font-mono [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-outer-spin-button]:m-0"
            aria-label={`${setting.Label} value`}
          />
        </div>
        {showSlider && (
          <input
            type="range"
            min={hint.min}
            max={hint.max}
            step={hint.step ?? 0.05}
            value={typeof numericValue === 'number' ? numericValue : (hint.default ?? hint.min)}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-full accent-osu-pink"
          />
        )}
        {setting.Description && (
          <div className="text-[11px] text-gray-400">{setting.Description}</div>
        )}
      </div>
    );
  }

  // string
  if (setting.Choices && setting.Choices.length > 0) {
    return (
      <label className="p-2 rounded-md bg-white/5 block">
        <div className="text-sm text-white mb-1">{setting.Label}</div>
        <select
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value === '' ? undefined : e.target.value)}
          className="w-full px-2 py-1 bg-black/30 border border-white/10 rounded text-sm text-white focus:outline-none focus:border-osu-pink/60"
        >
          <option value="">default</option>
          {setting.Choices.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {setting.Description && (
          <div className="text-[11px] text-gray-400 mt-1">{setting.Description}</div>
        )}
      </label>
    );
  }
  return (
    <label className="p-2 rounded-md bg-white/5 block">
      <div className="text-sm text-white mb-1">{setting.Label}</div>
      <input
        type="text"
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value === '' ? undefined : e.target.value)}
        placeholder="default"
        className="w-full px-2 py-1 bg-black/30 border border-white/10 rounded text-sm text-white focus:outline-none focus:border-osu-pink/60"
      />
      {setting.Description && (
        <div className="text-[11px] text-gray-400 mt-1">{setting.Description}</div>
      )}
    </label>
  );
};

export default ModPicker;
