import type { User } from '../types';

const DEFAULT_USER_COVER_MARKERS = [
  '/user-profile-covers/default.jpeg',
  '/user-profile-covers/default.jpg',
];

export const isDefaultUserCoverUrl = (value?: string | null): boolean => {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;
  return DEFAULT_USER_COVER_MARKERS.some((marker) => normalized.includes(marker));
};

export const pickBestUserCoverUrl = (user?: Partial<User> | null): string | undefined => {
  if (!user) return undefined;

  const candidates = [
    user.cover_url,
    user.cover?.url,
    user.cover?.custom_url,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const normalized = candidate.trim();
    if (!normalized) continue;
    if (isDefaultUserCoverUrl(normalized)) continue;
    return normalized;
  }

  return undefined;
};

