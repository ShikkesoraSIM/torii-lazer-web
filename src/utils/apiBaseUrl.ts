const PROD_API_BASE_URL = 'https://lazer-api.shikkesora.com';

const isLocalApiHost = (value: string): boolean => {
  const normalized = value.trim().replace(/\/+$/, '');
  return /^(https?:\/\/)?(web\.)?torii\.local$/i.test(normalized);
};

export const resolveApiBaseUrl = (rawValue?: string | null): string => {
  const normalized = String(rawValue || '').trim();
  if (!normalized) {
    return PROD_API_BASE_URL;
  }

  if (import.meta.env.PROD && isLocalApiHost(normalized)) {
    return PROD_API_BASE_URL;
  }

  return normalized;
};

export const API_BASE_URL = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL);

export const API_BASE_ORIGIN = (() => {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return undefined;
  }
})();
