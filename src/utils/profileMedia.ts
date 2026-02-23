const DEFAULT_USER_COVER_MARKERS = [
  '/user-profile-covers/default.jpeg',
  '/user-profile-covers/default.jpg',
];

const MEDIA_DEBUG_FLAG = 'torii_debug_cover';

type UserWithCover = {
  cover?: {
    url?: string | null;
    custom_url?: string | null;
  } | null;
  cover_url?: string | null;
};

type CoverDebugContext = {
  scope?: string;
  userId?: number | string;
  username?: string;
};

const getApiBaseOrigin = (): string | undefined => {
  const rawBaseUrl = String(import.meta.env.VITE_API_BASE_URL || '').trim();
  if (!rawBaseUrl) return undefined;
  try {
    return new URL(rawBaseUrl).origin;
  } catch {
    return undefined;
  }
};

const shouldDebugCoverMedia = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (window.location.search.includes('debugCover=1')) return true;
  return window.localStorage.getItem(MEDIA_DEBUG_FLAG) === '1';
};

const debugCoverMedia = (
  message: string,
  payload: Record<string, unknown>
): void => {
  if (!shouldDebugCoverMedia()) return;
  console.info(`[cover-debug] ${message}`, payload);
};

export const isDefaultUserCoverUrl = (value?: string | null): boolean => {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;
  return DEFAULT_USER_COVER_MARKERS.some((marker) => normalized.includes(marker));
};

export const normalizeMediaUrl = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  const normalized = value.trim();
  if (!normalized || normalized === 'null' || normalized === 'undefined') return undefined;

  if (normalized.startsWith('/')) {
    if (normalized.startsWith('/image/') || normalized === '/default.jpg') {
      return normalized;
    }
    const apiOrigin = getApiBaseOrigin();
    if (apiOrigin) {
      return `${apiOrigin}${normalized}`;
    }
    return normalized;
  }

  try {
    const parsed = new URL(normalized);
    const shouldUpgradeToHttps =
      typeof window !== 'undefined' &&
      window.location.protocol === 'https:' &&
      parsed.protocol === 'http:';

    if (shouldUpgradeToHttps) {
      parsed.protocol = 'https:';
      return parsed.toString();
    }

    return parsed.toString();
  } catch {
    return normalized;
  }
};

export const pickUserCoverCandidates = (
  user?: UserWithCover | null,
  debugContext?: CoverDebugContext
): string[] => {
  if (!user) {
    debugCoverMedia('no-user', { context: debugContext });
    return [];
  }

  const rawCandidates = [
    user.cover_url,
    user.cover?.url,
    user.cover?.custom_url,
  ];

  const uniqueCandidates = new Set<string>();
  const skipped: Array<{ value?: string | null; reason: string }> = [];

  for (const candidate of rawCandidates) {
    const normalized = normalizeMediaUrl(candidate);
    if (!normalized) {
      skipped.push({ value: candidate, reason: 'empty-or-invalid' });
      continue;
    }
    if (isDefaultUserCoverUrl(normalized)) {
      skipped.push({ value: candidate, reason: 'default-cover' });
      continue;
    }
    uniqueCandidates.add(normalized);
  }

  const resolved = Array.from(uniqueCandidates);
  debugCoverMedia('resolved-candidates', {
    context: debugContext,
    rawCandidates,
    skipped,
    resolved,
  });
  return resolved;
};

export const pickBestUserCoverUrl = (user?: UserWithCover | null): string | undefined => {
  const candidates = pickUserCoverCandidates(user);
  return candidates[0];
};
