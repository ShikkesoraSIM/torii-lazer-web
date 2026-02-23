const DEFAULT_USER_COVER_MARKERS = [
  '/user-profile-covers/default.jpeg',
  '/user-profile-covers/default.jpg',
];

type UserWithCover = {
  cover?: {
    url?: string | null;
    custom_url?: string | null;
  } | null;
  cover_url?: string | null;
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

export const pickUserCoverCandidates = (user?: UserWithCover | null): string[] => {
  if (!user) return [];

  const candidates = [
    user.cover_url,
    user.cover?.url,
    user.cover?.custom_url,
  ];

  const uniqueCandidates = new Set<string>();
  for (const candidate of candidates) {
    const normalized = normalizeMediaUrl(candidate);
    if (!normalized) continue;
    if (isDefaultUserCoverUrl(normalized)) continue;
    uniqueCandidates.add(normalized);
  }

  return Array.from(uniqueCandidates);
};

export const pickBestUserCoverUrl = (user?: UserWithCover | null): string | undefined => {
  const candidates = pickUserCoverCandidates(user);
  return candidates[0];
};
