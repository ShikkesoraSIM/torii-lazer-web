export interface ParsedScoreClientVersion {
  raw: string;
  clientName: string;
  version: string | null;
  os: string | null;
  summary: string;
}

export type ScoreClientDisplayMode = 'icon' | 'name';

export const SCORE_CLIENT_DISPLAY_MODE_KEY = 'score_client_display_mode';
export const DEFAULT_SCORE_CLIENT_DISPLAY_MODE: ScoreClientDisplayMode = 'icon';

const INVALID_VALUES = new Set(['invalid client version', '()', 'unknown']);

const VERSION_RE = /\b\d{4}\.\d{1,3}\.\d+(?:-[a-z0-9._-]+)?\b/i;
const HASH_RE = /hash:([a-f0-9]{6,40})/i;

const clean = (value: string | null | undefined): string => (value || '').trim();

const detectClientName = (text: string, version: string | null): string => {
  const lower = text.toLowerCase();
  const versionLower = (version || '').toLowerCase();

  if (lower.includes('shigetiro') || versionLower.includes('shigetiro')) return 'Shigetiro Client';
  if (lower.includes('tachyon') || versionLower.includes('tachyon')) return 'Tachyon Client';
  if (lower.includes('osu!') || lower.includes('osulazer') || lower.includes('osu lazer')) return 'osu!lazer';

  // Fallback to first token from raw label.
  const token = text.split(/\s+/)[0]?.trim();
  return token || 'Unknown client';
};

export const parseScoreClientVersion = (
  clientVersion?: string | null,
): ParsedScoreClientVersion | null => {
  const raw = clean(clientVersion);
  if (!raw) return null;
  if (INVALID_VALUES.has(raw.toLowerCase())) return null;

  let working = raw;
  let os: string | null = null;

  const osMatch = working.match(/\(([^)]+)\)\s*$/);
  if (osMatch) {
    os = clean(osMatch[1]) || null;
    working = clean(working.slice(0, osMatch.index));
  }

  const versionMatch = working.match(VERSION_RE);
  const hashMatch = working.match(HASH_RE) || raw.match(HASH_RE);
  const version = versionMatch
    ? clean(versionMatch[0])
    : hashMatch
      ? `hash:${clean(hashMatch[1]).slice(0, 12)}`
      : null;

  const clientName = detectClientName(working, version);
  const summary = version ? `${clientName} ${version}` : clientName;

  return {
    raw,
    clientName,
    version,
    os,
    summary,
  };
};

export const formatScoreClientVersion = (clientVersion?: string | null): string | null =>
  parseScoreClientVersion(clientVersion)?.summary || null;

export const getScoreClientDisplayMode = (
  extra?: Record<string, any> | null,
): ScoreClientDisplayMode => {
  const rawValue = typeof extra?.[SCORE_CLIENT_DISPLAY_MODE_KEY] === 'string'
    ? String(extra[SCORE_CLIENT_DISPLAY_MODE_KEY]).toLowerCase()
    : '';

  return rawValue === 'name' ? 'name' : DEFAULT_SCORE_CLIENT_DISPLAY_MODE;
};
