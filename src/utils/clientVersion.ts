export interface ParsedScoreClientVersion {
  raw: string;
  clientName: string;
  version: string | null;
  os: string | null;
  summary: string;
  stream: ClientStream;
  platform: ClientPlatform;
}

export type ScoreClientDisplayMode = 'icon' | 'name';

export type ClientStream = 'torii' | 'nova' | 'vanilla' | 'shigetiro' | 'lazer' | 'unknown';
export type ClientPlatform = 'windows' | 'macos' | 'linux' | 'android' | 'ios' | 'unknown';

export const SCORE_CLIENT_DISPLAY_MODE_KEY = 'score_client_display_mode';
export const DEFAULT_SCORE_CLIENT_DISPLAY_MODE: ScoreClientDisplayMode = 'icon';

const INVALID_VALUES = new Set(['invalid client version', '()', 'unknown']);

const VERSION_RE = /\b\d{4}\.\d{1,3}\.\d+(?:-[a-z0-9._-]+)?\b/i;
const HASH_RE = /hash:([a-f0-9]{6,40})/i;

const clean = (value: string | null | undefined): string => (value || '').trim();

const STREAM_LABELS: Record<ClientStream, string> = {
  torii: 'Torii',
  nova: 'Torii Nova',
  vanilla: 'Torii Vanilla',
  shigetiro: 'Torii Client', // legacy Shigetiro builds, folded under the Torii name
  lazer: 'osu!lazer',
  unknown: 'Unknown client',
};

// Brand + version-suffix detection. Order matters: "Torii Nova" / "Torii Vanilla"
// and their "-nova" / "-vanilla" version suffixes both also match a loose "torii"
// test, so the specific streams have to win before we fall back to plain Torii.
const detectClientStream = (text: string, version: string | null): ClientStream => {
  const hay = `${text} ${version || ''}`.toLowerCase();

  if (hay.includes('nova') || hay.includes('-nova')) return 'nova';
  if (hay.includes('vanilla') || hay.includes('-vanilla')) return 'vanilla';
  if (hay.includes('shigetiro')) return 'shigetiro';
  if (hay.includes('torii')) return 'torii';
  if (hay.includes('osu!') || hay.includes('osulazer') || hay.includes('osu lazer') || hay.includes('lazer'))
    return 'lazer';

  return 'unknown';
};

const detectPlatform = (os: string | null): ClientPlatform => {
  const lower = (os || '').toLowerCase();
  if (!lower) return 'unknown';
  if (lower.includes('win')) return 'windows';
  if (lower.includes('mac') || lower.includes('osx') || lower.includes('darwin')) return 'macos';
  if (lower.includes('android')) return 'android';
  if (lower.includes('ios') || lower.includes('iphone') || lower.includes('ipad')) return 'ios';
  if (lower.includes('linux') || lower.includes('unix') || lower.includes('bsd')) return 'linux';
  return 'unknown';
};

const clientNameForStream = (stream: ClientStream, text: string): string => {
  if (stream !== 'unknown') return STREAM_LABELS[stream];
  // Keep the old fallback: first token off the raw label.
  const token = text.split(/\s+/)[0]?.trim();
  return token || STREAM_LABELS.unknown;
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

  const stream = detectClientStream(working, version);
  const platform = detectPlatform(os);
  const clientName = clientNameForStream(stream, working);
  const summary = version ? `${clientName} ${version}` : clientName;

  return {
    raw,
    clientName,
    version,
    os,
    summary,
    stream,
    platform,
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
