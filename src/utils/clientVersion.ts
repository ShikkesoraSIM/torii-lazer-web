export const formatScoreClientVersion = (clientVersion?: string | null): string | null => {
  if (!clientVersion) return null;
  const normalized = clientVersion.trim();
  if (!normalized) return null;
  if (normalized === 'Invalid Client Version' || normalized === '()') return null;
  return normalized;
};
