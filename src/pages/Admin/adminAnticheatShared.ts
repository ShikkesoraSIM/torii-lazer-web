// Shared helpers across the anti-cheat admin sub-pages.

export const severityBadgeClass = (severity: string): string => {
  const lower = (severity || '').toLowerCase();
  if (lower === 'critical') {
    return 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30';
  }
  if (lower === 'warning' || lower === 'suspicious') {
    return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30';
  }
  if (lower === 'low_concern' || lower === 'info') {
    return 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30';
  }
  if (lower === 'ok') {
    return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30';
  }
  if (lower === 'errored' || lower === 'inconclusive') {
    return 'bg-gray-500/15 text-gray-700 dark:text-gray-300 border border-gray-500/30';
  }
  return 'bg-gray-500/15 text-gray-700 dark:text-gray-300 border border-gray-500/30';
};

export const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

export const truncate = (s: string, n = 140): string => {
  if (!s) return '';
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
};

export const fieldClass =
  'rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-osu-pink/60 focus:border-transparent';

export const formatMods = (mods: Array<Record<string, unknown> | string>): string => {
  if (!mods || mods.length === 0) return 'NM';
  return mods
    .map((m) => (typeof m === 'string' ? m : String((m as { acronym?: string }).acronym ?? '')))
    .filter(Boolean)
    .join('');
};
