import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import AdminModal from '../../components/Admin/AdminModal';
import ModPicker, { isModFullyConfigured } from '../../components/Admin/ModPicker';
import BeatmapThumb from '../../components/Matchmaking/BeatmapThumb';
import type { ApiMod, ModCatalogByRuleset } from '../../types/mods';
import { BUNDLED_MODS_CATALOG } from '../../data/modsCatalog';

interface DailyChallenge {
  date: string;
  beatmap_id: number;
  ruleset_id: number;
  required_mods: string;
  allowed_mods: string;
  room_id?: number;
  max_attempts?: number;
  time_limit?: number;
  beatmap?: {
    id?: number;
    beatmapset_id?: number;
    artist?: string;
    title?: string;
    version?: string;
    creator?: string | null;
    difficulty_rating?: number;
    total_length?: number;
    bpm?: number;
    mode?: string;
  };
}

// ─── Play-mode picker (ruleset + RX/AP variant) ──────────────────────
//
// Beatmaps only exist in 4 canonical rulesets (0=osu, 1=taiko,
// 2=fruits, 3=mania). RX and AP are not separate rulesets — they're
// just mods. But the admin UX is much friendlier if we surface
// "osu!relax" / "osu!autopilot" / "osu!taiko relax" / etc. as first-
// class options that auto-stamp the matching mod into required_mods.
//
// The form's source of truth is still `(ruleset_id, required_mods)`.
// The play-mode dropdown is a derived view over those two.

interface PlayMode {
  id: string;
  label: string;
  rulesetId: number;
  autoMod: 'RX' | 'AP' | null;
}

const PLAY_MODES: PlayMode[] = [
  { id: 'osu',       label: 'osu!',                rulesetId: 0, autoMod: null },
  { id: 'osu-rx',    label: 'osu!relax',           rulesetId: 0, autoMod: 'RX' },
  { id: 'osu-ap',    label: 'osu!autopilot',       rulesetId: 0, autoMod: 'AP' },
  { id: 'taiko',     label: 'osu!taiko',           rulesetId: 1, autoMod: null },
  { id: 'taiko-rx',  label: 'osu!taiko relax',     rulesetId: 1, autoMod: 'RX' },
  { id: 'fruits',    label: 'osu!catch',           rulesetId: 2, autoMod: null },
  { id: 'fruits-rx', label: 'osu!catch relax',     rulesetId: 2, autoMod: 'RX' },
  { id: 'mania',     label: 'osu!mania',           rulesetId: 3, autoMod: null },
];

const RULESET_LABEL = ['osu!', 'osu!taiko', 'osu!catch', 'osu!mania'];

const detectPlayMode = (rulesetId: number, requiredMods: ApiMod[]): PlayMode => {
  const acronyms = new Set(requiredMods.map((m) => m.acronym));
  // RX/AP only meaningful for osu!; both = ambiguous, prefer none.
  if (rulesetId === 0 && acronyms.has('AP')) return PLAY_MODES.find((m) => m.id === 'osu-ap')!;
  if (acronyms.has('RX')) {
    const match = PLAY_MODES.find((m) => m.rulesetId === rulesetId && m.autoMod === 'RX');
    if (match) return match;
  }
  const fallback = PLAY_MODES.find((m) => m.rulesetId === rulesetId && m.autoMod === null);
  return fallback ?? PLAY_MODES[0];
};

// Apply a play mode to (ruleset_id, required_mods). Adds the auto-mod
// if missing, strips RX/AP if the new mode doesn't use them.
const applyPlayMode = (mode: PlayMode, requiredMods: ApiMod[]): ApiMod[] => {
  // Strip RX & AP first — we'll re-add the right one if needed.
  let next = requiredMods.filter((m) => m.acronym !== 'RX' && m.acronym !== 'AP');
  if (mode.autoMod) {
    next = [...next, { acronym: mode.autoMod }];
  }
  return next;
};

/**
 * A5 audit fix: detect when a Game Mode change would strip a configured
 * RX/AP entry from `required_mods` (e.g. switching from "osu!relax" to
 * "osu!" wipes RX along with whatever settings the admin had attached).
 * Returns the acronyms whose user-set settings would be lost — caller
 * decides whether to warn before applying.
 */
const settingsLostByPlayModeChange = (mode: PlayMode, requiredMods: ApiMod[]): string[] => {
  const lost: string[] = [];
  for (const m of requiredMods) {
    if (m.acronym !== 'RX' && m.acronym !== 'AP') continue;
    if (m.acronym === mode.autoMod) continue; // staying — not lost
    if (m.settings && Object.keys(m.settings).length > 0) lost.push(m.acronym);
  }
  return lost;
};

// ─── ApiMod (de)serialisation ────────────────────────────────────────

const parseMods = (raw: string): ApiMod[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item: unknown): ApiMod | null => {
        if (typeof item === 'string') return { acronym: item };
        if (typeof item === 'object' && item !== null && 'acronym' in item) {
          const obj = item as { acronym: unknown; settings?: unknown };
          if (typeof obj.acronym !== 'string') return null;
          const out: ApiMod = { acronym: obj.acronym };
          if (obj.settings && typeof obj.settings === 'object' && !Array.isArray(obj.settings)) {
            out.settings = obj.settings as Record<string, number | boolean | string>;
          }
          return out;
        }
        return null;
      })
      .filter((m): m is ApiMod => m !== null);
  } catch {
    return [];
  }
};

const formatModSettings = (mod: ApiMod): string => {
  const settings = mod.settings ? Object.entries(mod.settings) : [];
  if (settings.length === 0) return '';
  return settings
    .map(([k, v]) => {
      if (typeof v === 'boolean') return v ? k : `!${k}`;
      return `${k}=${v}`;
    })
    .join(', ');
};

interface ModChipProps {
  mod: ApiMod;
  variant: 'required' | 'allowed';
}

const ModChip: React.FC<ModChipProps> = ({ mod, variant }) => {
  const settingsStr = formatModSettings(mod);
  const colorClass =
    variant === 'required'
      ? 'bg-rose-500/15 text-rose-200 border-rose-400/30'
      : 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30';
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] border font-mono ${colorClass}`}
      title={settingsStr ? `${mod.acronym}(${settingsStr})` : mod.acronym}
    >
      <span className="font-bold">{mod.acronym}</span>
      {settingsStr && <span className="opacity-70 truncate max-w-[140px]">{settingsStr}</span>}
    </span>
  );
};

// ─── date helpers (display) ─────────────────────────────────────────

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-05-08" → { weekday: "Fri", monthDay: "May 8" }. Always parsed as UTC so
 *  the displayed weekday matches the server's interpretation of the date.       */
const formatChallengeDate = (iso: string): { weekday: string; monthDay: string; year: string } => {
  const d = new Date(`${iso}T00:00:00Z`);
  return {
    weekday: WEEKDAY[d.getUTCDay()],
    monthDay: `${MONTH[d.getUTCMonth()]} ${d.getUTCDate()}`,
    year: String(d.getUTCFullYear()),
  };
};

/** Number of whole days between two ISO dates (positive = b is after a). */
const dayDiff = (a: string, b: string): number => {
  const da = new Date(`${a}T00:00:00Z`).getTime();
  const db = new Date(`${b}T00:00:00Z`).getTime();
  return Math.round((db - da) / 86400000);
};

const relativeDayLabel = (iso: string, today: string): string => {
  const diff = dayDiff(today, iso);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 0) return `in ${diff} days`;
  return `${-diff} days ago`;
};

// ─── SectionHeader ──────────────────────────────────────────────────

interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  count?: number;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ eyebrow, title, count }) => (
  <div className="flex items-end justify-between mb-3">
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-osu-pink/80">
        {eyebrow}
      </div>
      <h3 className="text-base font-semibold text-white mt-0.5">{title}</h3>
    </div>
    {typeof count === 'number' && (
      <span className="text-xs text-gray-500 tabular-nums">
        {count} {count === 1 ? 'entry' : 'entries'}
      </span>
    )}
  </div>
);

// ─── ChallengeCard ──────────────────────────────────────────────────
//
// One row in the Daily Challenge list. Glassy gradient background, soft
// shadow, hover lift. The "current" treatment (today's challenge) is
// applied via an absolutely-positioned framer-motion sibling with
// `layoutId="current-frame"` that smoothly slides between cards when the
// active date changes (next-day rollover, delete-and-rotate, etc.).

interface ChallengeCardProps {
  challenge: DailyChallenge;
  /** Today, in UTC. Used both to mark today's row and to compute "in 3 days" labels. */
  today: string;
  /** True when this row is the active challenge — gets the framer-motion CURRENT frame. */
  isCurrent: boolean;
  /** Set after a successful create/update so the row pulses briefly. */
  isHighlighted: boolean;
  /** Stylistic dim for past challenges. */
  dimmed?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  /** Ref so the parent can scroll the row into view. */
  innerRef: (el: HTMLDivElement | null) => void;
}

const ChallengeCard: React.FC<ChallengeCardProps> = ({
  challenge,
  today,
  isCurrent,
  isHighlighted,
  dimmed = false,
  onEdit,
  onDelete,
  innerRef,
}) => {
  const required = parseMods(challenge.required_mods);
  const allowed = parseMods(challenge.allowed_mods);
  const mode = detectPlayMode(challenge.ruleset_id, required);
  const bm = challenge.beatmap;
  const dateParts = formatChallengeDate(challenge.date);
  const relLabel = relativeDayLabel(challenge.date, today);

  // Apple-style polish on the layout transition: a softer spring with a touch
  // of mass, applied uniformly to every motion property (position, opacity,
  // scale). Slower than the default but still responsive — gives the eye time
  // to track the rose frame as it slides across, rather than snapping.
  const POLISH_TRANSITION = {
    type: 'spring' as const,
    stiffness: 180,
    damping: 26,
    mass: 0.9,
  };

  return (
    <motion.div
      layout
      layoutId={`challenge-row-${challenge.date}`}
      ref={innerRef}
      // Subtle entrance/exit so cards don't pop in/out hard when they move
      // between sections. The y-offset matches the new card's destination so
      // the motion feels like one continuous slide instead of two jumps.
      initial={{ opacity: 0, y: -6, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.985 }}
      transition={POLISH_TRANSITION}
      className={`relative ${dimmed ? 'opacity-70 hover:opacity-100' : ''} transition-opacity`}
    >
      {/* CURRENT frame — absolutely-positioned so it can layout-animate
          between cards via framer's shared-element transition. The frame is
          painted BEHIND the actual card (negative inset + lower z-index in
          the same stacking context) so the card's content stays untouched. */}
      {isCurrent && (
        <motion.div
          layoutId="current-frame"
          className="absolute -inset-[4px] rounded-[1.4rem] bg-gradient-to-br from-osu-pink/60 via-fuchsia-500/30 to-osu-pink/40 shadow-[0_0_60px_-8px_rgba(255,0,127,0.55)]"
          transition={POLISH_TRANSITION}
          aria-hidden
        />
      )}

      <div
        className={`relative rounded-2xl border overflow-hidden transition-colors
          ${
            isCurrent
              ? 'border-osu-pink/40 bg-gradient-to-br from-[rgba(28,12,36,0.72)] via-[rgba(20,16,38,0.78)] to-[rgba(14,12,32,0.78)] backdrop-blur-xl'
              : 'border-white/10 bg-gradient-to-br from-white/[0.04] via-white/[0.02] to-transparent backdrop-blur-xl hover:border-white/20'
          }
          ${isHighlighted ? 'ring-2 ring-emerald-400 shadow-[0_0_36px_-4px_rgba(16,185,129,0.55)]' : 'shadow-[0_4px_24px_-8px_rgba(0,0,0,0.4)]'}
          p-4
        `}
      >
        {/* Subtle gradient sheen — only on the spotlight card to keep the past list calm.
            Tied to isCurrent (not the now-removed `hero` prop) so the sheen rides along
            with the rose frame as it slides between cards. */}
        {isCurrent && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_-10%,rgba(255,0,127,0.18),transparent_55%)]"
          />
        )}

        {/* CURRENT pill (only on the hero / today row) */}
        {isCurrent && (
          <motion.div
            layoutId="current-badge"
            className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-osu-pink text-white text-[10px] font-bold uppercase tracking-wider shadow-[0_0_18px_rgba(255,0,127,0.6)] z-10"
            transition={POLISH_TRANSITION}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            Current
          </motion.div>
        )}

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0 flex-1">
            {/* Date column */}
            <div className="flex flex-col items-center justify-center shrink-0 w-16">
              <span
                className={`text-[10px] font-medium uppercase tracking-wider ${
                  isCurrent ? 'text-osu-pink' : 'text-gray-400'
                }`}
              >
                {dateParts.weekday}
              </span>
              <span
                className={`text-base font-bold leading-tight ${
                  isCurrent ? 'text-white' : 'text-gray-100'
                }`}
              >
                {dateParts.monthDay}
              </span>
              <span className="text-[10px] text-gray-500">{relLabel}</span>
            </div>

            <BeatmapThumb
              setId={bm?.beatmapset_id ?? null}
              starRating={bm?.difficulty_rating ?? null}
              size={56}
            />

            <div className="min-w-0 flex-1">
              <h3
                className={`font-semibold truncate text-base ${isCurrent ? 'text-white' : 'text-gray-100'}`}
                title={
                  bm
                    ? `${bm.artist ?? 'Unknown'} - ${bm.title ?? 'Unknown'} [${bm.version ?? ''}]`
                    : undefined
                }
              >
                {bm
                  ? `${bm.artist ?? 'Unknown'} - ${bm.title ?? 'Unknown'}`
                  : `Beatmap ID: ${challenge.beatmap_id}`}
              </h3>
              <div className="text-xs text-gray-400 mt-0.5">
                {bm?.version && <span className="text-osu-pink/90">[{bm.version}]</span>}
                {bm?.creator && <span> · mapped by {bm.creator}</span>}
                <span> · {mode.label}</span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                {required.length > 0 ? (
                  <>
                    <span className="text-rose-300/80 uppercase tracking-wider text-[10px]">
                      Required
                    </span>
                    {required.map((m) => (
                      <ModChip key={`req-${m.acronym}`} mod={m} variant="required" />
                    ))}
                  </>
                ) : (
                  <span className="text-gray-500 italic">No required mods</span>
                )}
              </div>
              {allowed.length > 0 && (
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-emerald-300/80 uppercase tracking-wider text-[10px]">
                    Free-mod
                  </span>
                  {allowed.map((m) => (
                    <ModChip key={`free-${m.acronym}`} mod={m} variant="allowed" />
                  ))}
                </div>
              )}
              {(challenge.max_attempts || challenge.time_limit) && (
                <div className="mt-1.5 text-[11px] text-gray-500 flex gap-3">
                  {challenge.max_attempts && (
                    <span>Max Attempts: {challenge.max_attempts}</span>
                  )}
                  {challenge.time_limit && <span>Time Limit: {challenge.time_limit}m</span>}
                </div>
              )}
            </div>
          </div>

          {/* Actions — slightly muted until you hover the row, so the list reads cleaner. */}
          <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center opacity-70 hover:opacity-100 transition-opacity">
            <button
              onClick={onEdit}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-blue-600 text-blue-300 hover:text-white border border-white/10 hover:border-blue-600 transition-colors text-xs font-medium"
            >
              Edit
            </button>
            <button
              onClick={onDelete}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-rose-600 text-rose-300 hover:text-white border border-white/10 hover:border-rose-600 transition-colors text-xs font-medium"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ─── component ───────────────────────────────────────────────────────

interface FormState {
  date: string;
  beatmap_id: string;
  ruleset_id: number;
  required_mods: ApiMod[];
  allowed_mods: ApiMod[];
  max_attempts: string;
  time_limit: string;
}

const todayISO = (): string => new Date().toISOString().split('T')[0];

/**
 * Given a list of existing challenges and a base date, return the first
 * date on or after `from` that doesn't already have a challenge. Used so
 * "Add Daily Challenge" / "Random Pick" rolls forward when today is
 * taken instead of greeting the admin with a 409.
 */
const findNextFreeDate = (existing: DailyChallenge[], from: string = todayISO()): string => {
  const taken = new Set(existing.map((c) => c.date));
  // Cap at 365 lookups so we never spin if every day in the next year is somehow taken.
  const cursor = new Date(`${from}T00:00:00Z`);
  for (let i = 0; i < 365; i++) {
    const iso = cursor.toISOString().split('T')[0];
    if (!taken.has(iso)) return iso;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return from;
};

const blankForm = (date: string = todayISO()): FormState => ({
  date,
  beatmap_id: '',
  ruleset_id: 0,
  required_mods: [],
  allowed_mods: [],
  max_attempts: '',
  time_limit: '',
});

const AdminDailyChallenges: React.FC = () => {
  const [challenges, setChallenges] = useState<DailyChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<DailyChallenge | null>(null);

  // Random-pick modal state. Two-stage flow: roll first, preview the
  // result, then confirm to persist (or roll again).
  const [showRandomModal, setShowRandomModal] = useState(false);
  const [randomFilters, setRandomFilters] = useState({
    date: '',
    ruleset_id: 0,
    min_difficulty: '' as string,
    max_difficulty: '' as string,
  });
  const [randomPreview, setRandomPreview] = useState<Awaited<ReturnType<typeof adminAPI.pickRandomDailyChallenge>>['beatmap'] | null>(null);
  const [randomBusy, setRandomBusy] = useState(false);
  const [randomRequiredMods, setRandomRequiredMods] = useState<ApiMod[]>([]);
  const [randomAllowedMods, setRandomAllowedMods] = useState<ApiMod[]>([]);
  // ModPicker is mounted lazily — only when the admin asks for it. Rendering
  // it inside a collapsed `<details>` was risky: if ModPicker ever threw, the
  // whole modal content would unmount and the user would just see a midnight-blue
  // backdrop with nothing inside. State-driven gating sidesteps that.
  const [randomShowMods, setRandomShowMods] = useState(false);

  const [formData, setFormData] = useState<FormState>(blankForm);

  // Mod catalog (server endpoint with bundled fallback). Start with
  // the bundle so the picker renders immediately on mount; the fetch
  // upgrades us to the live data once it lands.
  const [catalog, setCatalog] = useState<ModCatalogByRuleset>(BUNDLED_MODS_CATALOG);

  // Track DOM rows for scroll-and-highlight after creating a challenge.
  const challengeRowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [highlightedDate, setHighlightedDate] = useState<string | null>(null);
  // The "spotlight" — which date wears the rose CURRENT frame. Defaults to
  // real UTC today, but the admin can drive it forward/back with the prev/
  // next arrows or implicitly with the Trigger Next button. Decoupled from
  // `today` (the genuine UTC date) so the frame can animate to upcoming days
  // for previewing without lying about what's actually live.
  const [spotlightDate, setSpotlightDate] = useState<string>(todayISO());
  // Date the user just asked us to focus. The useEffect below waits for the
  // matching row to be in `challenges` (i.e. loadChallenges() resolved AND
  // React painted) before scrolling — A2 audit fix, replacing a brittle
  // `setTimeout(100)` that raced slow renders.
  const [pendingFocusDate, setPendingFocusDate] = useState<string | null>(null);

  /** Request a scroll-and-highlight for a given date once it lands in the list. */
  const focusChallenge = (date: string) => {
    setPendingFocusDate(date);
    setHighlightedDate(date);
  };

  useEffect(() => {
    if (!pendingFocusDate) return;
    if (!challenges.some((c) => c.date === pendingFocusDate)) return;
    // Two rAFs: first to let React commit the new DOM, second to let layout
    // settle so scrollIntoView lands on the final position (not on the row's
    // pre-layout rect). Cheaper and more correct than a fixed timeout.
    let cancelled = false;
    const r1 = requestAnimationFrame(() => {
      const r2 = requestAnimationFrame(() => {
        if (cancelled) return;
        const node = challengeRowRefs.current[pendingFocusDate];
        if (node) node.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setPendingFocusDate(null);
      });
      // store r2 on closure so we can cancel both
      (r1 as unknown as { __r2?: number }).__r2 = r2;
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(r1);
      const r2 = (r1 as unknown as { __r2?: number }).__r2;
      if (typeof r2 === 'number') cancelAnimationFrame(r2);
    };
  }, [pendingFocusDate, challenges]);

  // Drop the highlight after 2.5s so it doesn't linger.
  useEffect(() => {
    if (!highlightedDate) return;
    const t = setTimeout(() => setHighlightedDate(null), 2500);
    return () => clearTimeout(t);
  }, [highlightedDate]);

  useEffect(() => {
    loadChallenges();
    adminAPI.getModsCatalog().then(setCatalog).catch(() => undefined);
  }, []);

  const loadChallenges = async () => {
    try {
      setLoading(true);
      const data = await adminAPI.listDailyChallenges({ per_page: 50 });
      setChallenges(data.challenges || []);
    } catch (error) {
      console.error('Failed to load daily challenges:', error);
      toast.error('Failed to load daily challenges');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Translate axios errors into a friendly toast. 409s on a daily challenge
   * mean "that date already has one" — surface a concrete actionable hint
   * instead of the generic "Failed to create".
   */
  const reportCreateError = (error: any, date: string, fallback: string) => {
    const status = error?.response?.status;
    const detail = error?.response?.data?.detail;
    if (status === 409) {
      toast.error(
        `A daily challenge already exists for ${date}. Delete it first or pick a different date.`,
        { duration: 6000 },
      );
      return;
    }
    if (detail) {
      toast.error(typeof detail === 'string' ? detail : JSON.stringify(detail));
      return;
    }
    toast.error(fallback);
  };

  /**
   * Flag mods that need configuration but don't have it (PA without
   * `pitch_shift`, etc.). Returns the offending acronyms so the toast
   * can name them — A1 audit fix, hard-blocks submit.
   */
  const findUnconfiguredMods = (rulesetId: number, mods: ApiMod[]): string[] => {
    const ruleset = catalog[String(rulesetId)] ?? [];
    return mods
      .filter((m) => {
        const def = ruleset.find((d) => d.Acronym === m.acronym);
        return def ? !isModFullyConfigured(def, m) : false;
      })
      .map((m) => m.acronym);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    const blockers = [
      ...findUnconfiguredMods(formData.ruleset_id, formData.required_mods),
      ...findUnconfiguredMods(formData.ruleset_id, formData.allowed_mods),
    ];
    if (blockers.length > 0) {
      toast.error(
        `These mods still need configuration: ${[...new Set(blockers)].join(', ')}. Open their settings panel and fill in the values before saving.`,
        { duration: 6000 },
      );
      return;
    }

    try {
      const newChallenge = {
        date: formData.date,
        beatmap_id: Number(formData.beatmap_id),
        ruleset_id: formData.ruleset_id,
        required_mods: JSON.stringify(formData.required_mods),
        allowed_mods: JSON.stringify(formData.allowed_mods),
        max_attempts: formData.max_attempts ? Number(formData.max_attempts) : undefined,
        time_limit: formData.time_limit ? Number(formData.time_limit) : undefined,
      };

      await adminAPI.createDailyChallenge(newChallenge);
      toast.success('Daily challenge created successfully');
      setShowCreateModal(false);
      await loadChallenges();
      focusChallenge(formData.date);
    } catch (error: any) {
      console.error('Failed to create daily challenge:', error);
      reportCreateError(error, formData.date, 'Failed to create daily challenge');
    }
  };

  const handleEdit = (challenge: DailyChallenge) => {
    setEditingChallenge(challenge);
    setFormData({
      date: challenge.date,
      beatmap_id: challenge.beatmap_id.toString(),
      ruleset_id: challenge.ruleset_id,
      required_mods: parseMods(challenge.required_mods),
      allowed_mods: parseMods(challenge.allowed_mods),
      max_attempts: challenge.max_attempts?.toString() ?? '',
      time_limit: challenge.time_limit?.toString() ?? '',
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChallenge) return;

    const blockers = [
      ...findUnconfiguredMods(formData.ruleset_id, formData.required_mods),
      ...findUnconfiguredMods(formData.ruleset_id, formData.allowed_mods),
    ];
    if (blockers.length > 0) {
      toast.error(
        `These mods still need configuration: ${[...new Set(blockers)].join(', ')}. Open their settings panel and fill in the values before saving.`,
        { duration: 6000 },
      );
      return;
    }

    try {
      const updatedData = {
        beatmap_id: Number(formData.beatmap_id),
        ruleset_id: formData.ruleset_id,
        required_mods: JSON.stringify(formData.required_mods),
        allowed_mods: JSON.stringify(formData.allowed_mods),
        max_attempts: formData.max_attempts ? Number(formData.max_attempts) : undefined,
        time_limit: formData.time_limit ? Number(formData.time_limit) : undefined,
      };

      const updatedDate = editingChallenge.date;
      await adminAPI.updateDailyChallenge(updatedDate, updatedData);
      toast.success('Daily challenge updated successfully');
      setEditingChallenge(null);
      await loadChallenges();
      focusChallenge(updatedDate);
    } catch (error: any) {
      console.error('Failed to update daily challenge:', error);
      toast.error(error?.response?.data?.detail || 'Failed to update daily challenge');
    }
  };

  const handleDelete = async (date: string) => {
    if (!confirm('Are you sure you want to delete this daily challenge?')) return;

    try {
      await adminAPI.deleteDailyChallenge(date);
      toast.success('Daily challenge deleted successfully');
      loadChallenges();
    } catch (error) {
      console.error('Failed to delete daily challenge:', error);
      toast.error('Failed to delete daily challenge');
    }
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingChallenge(null);
    setFormData(blankForm(findNextFreeDate(challenges)));
  };

  const today = todayISO();
  const formPlayMode = useMemo(
    () => detectPlayMode(formData.ruleset_id, formData.required_mods),
    [formData.ruleset_id, formData.required_mods],
  );

  // Bucket challenges into Today / Upcoming / Past relative to UTC today.
  // - todayChallenge: the singleton row that gets the layoutId="current-frame".
  // - upcoming: tomorrow + later, ascending so "next" is at the top.
  // - past: yesterday + earlier, descending so the most recent is at the top.
  // Spotlight-relative bucketing. The hero card is whichever challenge sits
  // on `spotlightDate`; everything strictly after is "Upcoming", everything
  // strictly before is "Past / Archive". The actual "today" is still tracked
  // (for default form date, auto-roll, badges) — we just don't use it to
  // decide where the frame goes.
  const spotlightChallenge = useMemo(
    () => challenges.find((c) => c.date === spotlightDate),
    [challenges, spotlightDate],
  );
  const upcoming = useMemo(
    () => challenges.filter((c) => c.date > spotlightDate).sort((a, b) => a.date.localeCompare(b.date)),
    [challenges, spotlightDate],
  );
  const past = useMemo(
    () => challenges.filter((c) => c.date < spotlightDate).sort((a, b) => b.date.localeCompare(a.date)),
    [challenges, spotlightDate],
  );

  /** Move spotlight to the next/prev scheduled date. Snaps to entries that
   *  actually exist (skipping gaps), so a Mon→Wed→Fri queue feels like three
   *  clicks of "next". */
  const navigateSpotlight = (direction: 'prev' | 'next') => {
    const sorted = [...challenges.map((c) => c.date)].sort();
    if (sorted.length === 0) return;
    if (direction === 'next') {
      const next = sorted.find((d) => d > spotlightDate);
      if (next) setSpotlightDate(next);
    } else {
      const prev = [...sorted].reverse().find((d) => d < spotlightDate);
      if (prev) setSpotlightDate(prev);
    }
  };

  // Convenient flags for the navigation buttons.
  const sortedDates = useMemo(() => [...challenges.map((c) => c.date)].sort(), [challenges]);
  const hasNextSpot = sortedDates.some((d) => d > spotlightDate);
  const hasPrevSpot = sortedDates.some((d) => d < spotlightDate);

  return (
    <div>
      {/* ───────────── Header ───────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Daily Challenges</h2>
          <p className="text-sm text-gray-400 mt-1">
            Schedule and curate the daily rotation. {challenges.length} total ·{' '}
            <span className="text-osu-pink/90">{upcoming.length} upcoming</span>
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={async () => {
              try {
                setLoading(true);
                await adminAPI.triggerDailyChallenge();
                toast.success('Next daily challenge triggered');
                await loadChallenges();
                // Advance the spotlight frame to the next scheduled date so the
                // admin gets visual feedback for the click. Decoupled from the
                // server semantics (which materialise today's queued challenge
                // into a live room) — this is purely a curation-view nudge.
                const next = sortedDates.find((d) => d > spotlightDate);
                if (next) setSpotlightDate(next);
              } catch (error: any) {
                console.error('Failed to trigger daily challenge:', error);
                toast.error(error?.response?.data?.detail || 'Failed to trigger daily challenge');
              } finally {
                setLoading(false);
              }
            }}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/25 backdrop-blur-xl transition-all whitespace-nowrap text-sm font-medium"
            title="Materialise today's queued challenge into a live multiplayer room. Also advances the spotlight frame to the next scheduled day for preview."
          >
            ⏵ Trigger Next
          </button>
          <button
            onClick={() => {
              setRandomPreview(null);
              setRandomRequiredMods([]);
              setRandomAllowedMods([]);
              // Auto-roll the date forward if today is taken so the admin
              // doesn't have to chase a 409 manually. Empty string still means
              // "server-side default" — but we pre-fill the next free slot
              // when there's a conflict, making the auto-roll behaviour visible.
              const next = findNextFreeDate(challenges);
              setRandomFilters((f) => ({
                ...f,
                date: next === todayISO() ? '' : next,
              }));
              setShowRandomModal(true);
            }}
            className="px-4 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 border border-emerald-400/30 hover:border-emerald-400/50 backdrop-blur-xl transition-all whitespace-nowrap text-sm font-medium"
            title="Roll a random ranked beatmap and preview it before committing"
          >
            🎲 Random Pick
          </button>
          <button
            onClick={() => {
              setFormData(blankForm(findNextFreeDate(challenges)));
              setShowCreateModal(true);
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-br from-osu-pink to-fuchsia-500 hover:from-osu-pink/90 hover:to-fuchsia-500/90 text-white shadow-[0_4px_24px_-4px_rgba(255,0,127,0.5)] transition-all whitespace-nowrap text-sm font-medium"
          >
            + Add Daily Challenge
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-osu-pink" />
        </div>
      ) : (
        // `motion.div layout` makes the page-level container animate its
        // children's positions when sections grow/shrink. Combined with
        // `space-y-12` (more breathing room than 8) the spotlight card never
        // ends up touching the past list mid-animation.
        <motion.div
          layout
          transition={{ type: 'spring', stiffness: 180, damping: 26, mass: 0.9 }}
          className="space-y-12"
        >
          {/* ───────────── Spotlight (today by default; admin-navigable) ───────────── */}
          <motion.section layout transition={{ type: 'spring', stiffness: 180, damping: 26, mass: 0.9 }}>
            <div className="flex items-end justify-between mb-4 gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-osu-pink/80">
                  {spotlightDate === today ? 'Today' : 'Spotlight'}
                </div>
                {/* Cross-fade the date title when the spotlight changes — small touch
                    that makes the header feel part of the same gesture as the card slide. */}
                <AnimatePresence mode="wait">
                  <motion.h3
                    key={spotlightDate}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="text-base font-semibold text-white mt-0.5"
                  >
                    {`${formatChallengeDate(spotlightDate).weekday}, ${formatChallengeDate(spotlightDate).monthDay}, ${formatChallengeDate(spotlightDate).year}`}
                    {spotlightDate !== today && (
                      <span className="ml-2 text-xs font-normal text-gray-500">
                        · {relativeDayLabel(spotlightDate, today)}
                      </span>
                    )}
                  </motion.h3>
                </AnimatePresence>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => navigateSpotlight('prev')}
                  disabled={!hasPrevSpot}
                  title="Spotlight previous scheduled challenge"
                  className="w-8 h-8 inline-flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  ◀
                </button>
                <button
                  type="button"
                  onClick={() => navigateSpotlight('next')}
                  disabled={!hasNextSpot}
                  title="Spotlight next scheduled challenge"
                  className="w-8 h-8 inline-flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  ▶
                </button>
                {spotlightDate !== today && (
                  <button
                    type="button"
                    onClick={() => setSpotlightDate(today)}
                    title="Snap spotlight back to today"
                    className="ml-1 px-2.5 h-8 inline-flex items-center rounded-lg bg-osu-pink/10 hover:bg-osu-pink/20 text-osu-pink border border-osu-pink/30 text-xs font-medium transition-colors"
                  >
                    ⌂ Today
                  </button>
                )}
              </div>
            </div>
            <AnimatePresence mode="popLayout">
              {spotlightChallenge ? (
                <ChallengeCard
                  key={spotlightChallenge.date}
                  challenge={spotlightChallenge}
                  today={today}
                  isCurrent
                  isHighlighted={highlightedDate === spotlightChallenge.date}
                  onEdit={() => handleEdit(spotlightChallenge)}
                  onDelete={() => handleDelete(spotlightChallenge.date)}
                  innerRef={(el) => {
                    challengeRowRefs.current[spotlightChallenge.date] = el;
                  }}
                />
              ) : (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="relative rounded-2xl border border-dashed border-white/15 bg-white/[0.02] backdrop-blur-xl p-8 text-center"
                >
                  <div className="text-4xl mb-2 opacity-60">📅</div>
                  <div className="text-white font-semibold">
                    No challenge for {spotlightDate === today ? 'today' : spotlightDate}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Hit <span className="text-emerald-400">🎲 Random Pick</span> or{' '}
                    <span className="text-osu-pink">+ Add</span> to fill {spotlightDate}.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>

          {/* ───────────── Upcoming ───────────── */}
          <AnimatePresence mode="popLayout">
            {upcoming.length > 0 && (
              <motion.section
                key="upcoming-section"
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ type: 'spring', stiffness: 180, damping: 26, mass: 0.9 }}
              >
                <SectionHeader
                  eyebrow="Upcoming"
                  title={spotlightDate === today ? 'Coming up' : `After ${formatChallengeDate(spotlightDate).monthDay}`}
                  count={upcoming.length}
                />
                <motion.div layout className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {upcoming.map((c) => (
                      <ChallengeCard
                        key={c.date}
                        challenge={c}
                        today={today}
                        isCurrent={false}
                        isHighlighted={highlightedDate === c.date}
                        onEdit={() => handleEdit(c)}
                        onDelete={() => handleDelete(c.date)}
                        innerRef={(el) => {
                          challengeRowRefs.current[c.date] = el;
                        }}
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* ───────────── Past ───────────── */}
          <AnimatePresence mode="popLayout">
            {past.length > 0 && (
              <motion.section
                key="past-section"
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ type: 'spring', stiffness: 180, damping: 26, mass: 0.9 }}
              >
                <SectionHeader
                  eyebrow="Archive"
                  title={spotlightDate === today ? 'Past challenges' : `Before ${formatChallengeDate(spotlightDate).monthDay}`}
                  count={past.length}
                />
                <motion.div layout className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {past.map((c) => (
                      <ChallengeCard
                        key={c.date}
                        challenge={c}
                        today={today}
                        isCurrent={false}
                        dimmed
                        isHighlighted={highlightedDate === c.date}
                        onEdit={() => handleEdit(c)}
                        onDelete={() => handleDelete(c.date)}
                        innerRef={(el) => {
                          challengeRowRefs.current[c.date] = el;
                        }}
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>
              </motion.section>
            )}
          </AnimatePresence>

          {challenges.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] backdrop-blur-xl p-12 text-center">
              <div className="text-5xl mb-3 opacity-60">🎲</div>
              <div className="text-white font-semibold text-lg">No daily challenges scheduled</div>
              <div className="text-sm text-gray-500 mt-1">
                Use Random Pick to roll a beatmap, or add one manually with a known beatmap ID.
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ───────────── Create / Edit modal ───────────── */}
      <AdminModal
        open={showCreateModal || !!editingChallenge}
        title={editingChallenge ? 'Edit Daily Challenge' : 'Add Daily Challenge'}
        onClose={closeModal}
        maxWidthClass="max-w-4xl"
      >
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {editingChallenge ? 'Edit Daily Challenge' : 'Add Daily Challenge'}
            </h2>
            <button
              onClick={closeModal}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={editingChallenge ? handleUpdate : handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Date *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-osu-pink/20 focus:border-osu-pink outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  required
                  disabled={!!editingChallenge}
                />
                {!editingChallenge && formData.date !== todayISO() && challenges.some((c) => c.date === todayISO()) && (
                  <p className="mt-1 text-xs text-amber-300/90">
                    ⓘ Auto-rolled forward — today ({todayISO()}) already has a challenge.
                  </p>
                )}
                {!editingChallenge && challenges.some((c) => c.date === formData.date) && (
                  <p className="mt-1 text-xs text-rose-300/90">
                    ⚠ A challenge already exists for {formData.date}. Submit will fail unless you delete the existing one first.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Beatmap ID *
                </label>
                <input
                  type="number"
                  value={formData.beatmap_id}
                  onChange={(e) => setFormData({ ...formData, beatmap_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-osu-pink/20 focus:border-osu-pink outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  required
                  placeholder="e.g. 123456"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Game Mode *
              </label>
              <select
                value={formPlayMode.id}
                onChange={(e) => {
                  const mode = PLAY_MODES.find((m) => m.id === e.target.value) ?? PLAY_MODES[0];
                  // A5 audit fix: warn before discarding settings the admin
                  // configured on RX/AP. Better than silently dropping data.
                  const lost = settingsLostByPlayModeChange(mode, formData.required_mods);
                  if (lost.length > 0) {
                    const ok = confirm(
                      `Switching to ${mode.label} will discard the custom settings on ${lost.join(', ')}. Continue?`,
                    );
                    if (!ok) return;
                  }
                  setFormData({
                    ...formData,
                    ruleset_id: mode.rulesetId,
                    required_mods: applyPlayMode(mode, formData.required_mods),
                    // Strip RX/AP from allowed if the new mode doesn't allow them
                    // — having both required and allowed for the same mod is redundant.
                    allowed_mods: formData.allowed_mods.filter(
                      (m) => !(m.acronym === 'RX' || m.acronym === 'AP'),
                    ),
                  });
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-osu-pink/20 focus:border-osu-pink outline-none"
                required
              >
                {PLAY_MODES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {formPlayMode.autoMod
                  ? `Sends as ruleset ${formPlayMode.rulesetId} (${RULESET_LABEL[formPlayMode.rulesetId]}) with ${formPlayMode.autoMod} as a required mod.`
                  : `Sends as ruleset ${formPlayMode.rulesetId} (${RULESET_LABEL[formPlayMode.rulesetId]}).`}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Required Mods
                <span className="ml-2 text-xs font-normal text-gray-500">
                  (everyone must play with these)
                </span>
              </label>
              <ModPicker
                catalog={catalog}
                rulesetId={formData.ruleset_id}
                value={formData.required_mods}
                onChange={(mods) => setFormData((f) => ({ ...f, required_mods: mods }))}
                conflictWith={formData.allowed_mods}
                emptyLabel="Free play (no forced mods)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Allowed Mods
                <span className="ml-2 text-xs font-normal text-gray-500">
                  (players may opt into any of these — leave empty to disable freemod)
                </span>
              </label>
              <ModPicker
                catalog={catalog}
                rulesetId={formData.ruleset_id}
                value={formData.allowed_mods}
                onChange={(mods) => setFormData((f) => ({ ...f, allowed_mods: mods }))}
                conflictWith={formData.required_mods}
                emptyLabel="No free-mod options"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Max Attempts
                </label>
                <input
                  type="number"
                  value={formData.max_attempts}
                  onChange={(e) => setFormData({ ...formData, max_attempts: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-osu-pink/20 focus:border-osu-pink outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  placeholder="Optional · unlimited if blank"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Time Limit (mins)
                </label>
                <input
                  type="number"
                  value={formData.time_limit}
                  onChange={(e) => setFormData({ ...formData, time_limit: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-osu-pink/20 focus:border-osu-pink outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-6">
              <button
                type="button"
                onClick={closeModal}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-osu-pink text-white rounded-xl hover:bg-osu-pink/90 shadow-lg shadow-osu-pink/20 transition-all font-medium"
              >
                {editingChallenge ? 'Update Challenge' : 'Create Challenge'}
              </button>
            </div>
          </form>
        </div>
      </AdminModal>

      {/* ───────────── Random-pick modal ─────────────
        Two-stage flow:
          1. Pick filters (mode + optional star range + optional date)
             then click Roll. Server returns a beatmap preview (no DB
             write). Loops back here so admin can roll again or cancel.
          2. Click "Create with this beatmap" to re-call the endpoint
             with create_challenge=true, persisting the rolled map plus
             whatever required/allowed mods the admin configured.
      */}
      <AdminModal
        open={showRandomModal}
        onClose={() => {
          setShowRandomModal(false);
          setRandomPreview(null);
          setRandomRequiredMods([]);
          setRandomAllowedMods([]);
          setRandomShowMods(false);
        }}
        title="Random Pick"
        maxWidthClass="max-w-4xl"
      >
        <div>
          {/* Header — match the create/edit modal so the close X is always reachable */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <span aria-hidden>🎲</span> Random Pick
            </h2>
            <button
              onClick={() => {
                setShowRandomModal(false);
                setRandomPreview(null);
                setRandomRequiredMods([]);
                setRandomAllowedMods([]);
                setRandomShowMods(false);
              }}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-sm text-gray-300 mb-4">
            Roll a random ranked / approved / loved beatmap matching your filters. Preview the
            result before committing it as a daily challenge.
          </p>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <label className="block">
              <span className="text-xs text-gray-400">Date (optional · defaults to today UTC)</span>
              <input
                type="date"
                value={randomFilters.date}
                onChange={(e) => setRandomFilters((f) => ({ ...f, date: e.target.value }))}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-[rgba(12,16,42,0.72)] border border-white/15 text-white text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              {(() => {
                const effective = randomFilters.date || todayISO();
                const todayTaken = challenges.some((c) => c.date === todayISO());
                const effectiveTaken = challenges.some((c) => c.date === effective);
                if (effectiveTaken) {
                  return (
                    <p className="mt-1 text-xs text-rose-300/90">
                      ⚠ {effective} already has a challenge — Create will fail.
                    </p>
                  );
                }
                if (!randomFilters.date && todayTaken) {
                  // Shouldn't happen — opener pre-fills the next free date — but
                  // guard anyway in case the admin clears it manually.
                  return (
                    <p className="mt-1 text-xs text-amber-300/90">
                      ⓘ Today ({todayISO()}) already has a challenge. Pick another date.
                    </p>
                  );
                }
                if (randomFilters.date && randomFilters.date !== todayISO() && todayTaken) {
                  return (
                    <p className="mt-1 text-xs text-amber-300/90">
                      ⓘ Auto-rolled forward — today ({todayISO()}) already has a challenge.
                    </p>
                  );
                }
                return null;
              })()}
            </label>
            <label className="block">
              <span className="text-xs text-gray-400">Game Mode</span>
              <select
                value={detectPlayMode(randomFilters.ruleset_id, randomRequiredMods).id}
                onChange={(e) => {
                  const mode = PLAY_MODES.find((m) => m.id === e.target.value) ?? PLAY_MODES[0];
                  const lost = settingsLostByPlayModeChange(mode, randomRequiredMods);
                  if (lost.length > 0) {
                    const ok = confirm(
                      `Switching to ${mode.label} will discard the custom settings on ${lost.join(', ')}. Continue?`,
                    );
                    if (!ok) return;
                  }
                  setRandomFilters((f) => ({ ...f, ruleset_id: mode.rulesetId }));
                  setRandomRequiredMods((r) => applyPlayMode(mode, r));
                  setRandomAllowedMods((a) =>
                    a.filter((m) => !(m.acronym === 'RX' || m.acronym === 'AP')),
                  );
                }}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-[rgba(12,16,42,0.72)] border border-white/15 text-white text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              >
                {PLAY_MODES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-gray-400">Min ★</span>
              <input
                type="number"
                step="0.1"
                value={randomFilters.min_difficulty}
                onChange={(e) => setRandomFilters((f) => ({ ...f, min_difficulty: e.target.value }))}
                placeholder="any"
                className="mt-1 w-full px-3 py-2 rounded-lg bg-[rgba(12,16,42,0.72)] border border-white/15 text-white text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-400">Max ★</span>
              <input
                type="number"
                step="0.1"
                value={randomFilters.max_difficulty}
                onChange={(e) => setRandomFilters((f) => ({ ...f, max_difficulty: e.target.value }))}
                placeholder="any"
                className="mt-1 w-full px-3 py-2 rounded-lg bg-[rgba(12,16,42,0.72)] border border-white/15 text-white text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </label>
          </div>

          {/* Mods configured for the rolled challenge — same picker as the manual flow.
              Lazy-mounted so a ModPicker render error can't take the whole modal down. */}
          <div className="mb-4 rounded-lg border border-white/10 bg-black/20">
            <button
              type="button"
              onClick={() => setRandomShowMods((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-300 hover:text-white transition-colors"
            >
              <span>
                {randomShowMods ? '▼' : '▶'} Configure required / allowed mods
                {(randomRequiredMods.length > 0 || randomAllowedMods.length > 0) && (
                  <span className="ml-2 text-xs text-osu-pink">
                    ({randomRequiredMods.length + randomAllowedMods.length} configured)
                  </span>
                )}
              </span>
              <span className="text-xs text-gray-500">
                {randomShowMods ? 'click to hide' : 'click to expand'}
              </span>
            </button>
            {randomShowMods && (
              <div className="p-3 space-y-3 border-t border-white/10">
                <div>
                  <div className="text-xs text-gray-400 mb-1">Required mods</div>
                  <ModPicker
                    catalog={catalog}
                    rulesetId={randomFilters.ruleset_id}
                    value={randomRequiredMods}
                    onChange={setRandomRequiredMods}
                    conflictWith={randomAllowedMods}
                    emptyLabel="None — pure freeplay"
                  />
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Allowed (free-mod) mods</div>
                  <ModPicker
                    catalog={catalog}
                    rulesetId={randomFilters.ruleset_id}
                    value={randomAllowedMods}
                    onChange={setRandomAllowedMods}
                    conflictWith={randomRequiredMods}
                    emptyLabel="No free-mod options"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Preview card */}
          {randomPreview && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-1">
              <div className="text-xs uppercase text-emerald-300 tracking-wider">Rolled</div>
              <div className="font-semibold text-white">
                {randomPreview.artist} — {randomPreview.title}
              </div>
              <div className="text-sm text-gray-300">
                [{randomPreview.version}] · ★{randomPreview.difficulty_rating.toFixed(2)} · {randomPreview.mode}
                {' · '}id {randomPreview.beatmap_id}
              </div>
              {randomPreview.creator && (
                <div className="text-xs text-gray-400">mapped by {randomPreview.creator}</div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              disabled={randomBusy}
              onClick={async () => {
                setRandomBusy(true);
                try {
                  const minD = randomFilters.min_difficulty.trim();
                  const maxD = randomFilters.max_difficulty.trim();
                  const result = await adminAPI.pickRandomDailyChallenge({
                    date: randomFilters.date || undefined,
                    ruleset_id: randomFilters.ruleset_id,
                    min_difficulty: minD === '' ? null : Number(minD),
                    max_difficulty: maxD === '' ? null : Number(maxD),
                    create_challenge: false,
                  });
                  setRandomPreview(result.beatmap);
                } catch (error: any) {
                  toast.error(error?.response?.data?.detail || 'Failed to roll random beatmap');
                } finally {
                  setRandomBusy(false);
                }
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50"
            >
              {randomPreview ? 'Roll again' : 'Roll'}
            </button>
            {randomPreview && (
              <button
                type="button"
                disabled={randomBusy}
                onClick={async () => {
                  // Same A1 guard as the manual create form.
                  const blockers = [
                    ...findUnconfiguredMods(randomFilters.ruleset_id, randomRequiredMods),
                    ...findUnconfiguredMods(randomFilters.ruleset_id, randomAllowedMods),
                  ];
                  if (blockers.length > 0) {
                    toast.error(
                      `These mods still need configuration: ${[...new Set(blockers)].join(', ')}. Open the mods panel and fill them in.`,
                      { duration: 6000 },
                    );
                    return;
                  }
                  setRandomBusy(true);
                  // Use the PREVIEWED beatmap_id instead of re-rolling. The
                  // pick endpoint with create_challenge=true would roll a
                  // fresh map and persist that — leading to "I confirmed map
                  // A but got map B" surprises (and 409s on subsequent
                  // attempts because the date now has a challenge).
                  const targetDate =
                    randomFilters.date || new Date().toISOString().split('T')[0];
                  try {
                    await adminAPI.createDailyChallenge({
                      date: targetDate,
                      beatmap_id: randomPreview.beatmap_id,
                      ruleset_id: randomFilters.ruleset_id,
                      required_mods: JSON.stringify(randomRequiredMods),
                      allowed_mods: JSON.stringify(randomAllowedMods),
                    });
                    toast.success(
                      `Daily challenge created for ${targetDate} — ${randomPreview.artist} - ${randomPreview.title}`,
                    );
                    setShowRandomModal(false);
                    setRandomPreview(null);
                    setRandomRequiredMods([]);
                    setRandomAllowedMods([]);
                    setRandomShowMods(false);
                    await loadChallenges();
                    focusChallenge(targetDate);
                  } catch (error: any) {
                    console.error('Failed to create daily challenge:', error);
                    reportCreateError(error, targetDate, 'Failed to create challenge');
                  } finally {
                    setRandomBusy(false);
                  }
                }}
                className="px-4 py-2 bg-osu-pink hover:bg-osu-pink/90 text-white rounded-lg font-medium disabled:opacity-50"
              >
                Create with this beatmap
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setShowRandomModal(false);
                setRandomPreview(null);
                setRandomRequiredMods([]);
                setRandomAllowedMods([]);
                setRandomShowMods(false);
              }}
              className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      </AdminModal>
    </div>
  );
};

export default AdminDailyChallenges;
