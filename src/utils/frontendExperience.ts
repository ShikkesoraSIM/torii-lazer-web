export const FRONTEND_PREFERENCE_COOKIE = 'torii_frontend';

export type FrontendExperience = 'classic' | 'torii-web';

const productionToriiWebOrigin = 'https://torii-web.shikkesora.com';

const envOrigin = (value: string | undefined, fallback: string): string =>
  (value?.trim() || fallback).replace(/\/$/, '');

export const TORII_WEB_ORIGIN = envOrigin(
  import.meta.env.VITE_TORII_WEB_ORIGIN,
  productionToriiWebOrigin,
);

const normalisePath = (value: string): string | null => {
  if (!value.startsWith('/') || value.startsWith('//')) return null;

  try {
    const parsed = new URL(value, window.location.origin);
    if (parsed.origin !== window.location.origin) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
};

export const readReturnPath = (search: string): string | null => {
  const value = new URLSearchParams(search).get('return');
  return value ? normalisePath(value) : null;
};

const withLocationSuffix = (path: string, source: string): string => {
  const parsed = new URL(source, window.location.origin);
  return `${path}${parsed.search}${parsed.hash}`;
};

export const getToriiWebPath = (source: string, userId?: number): string | null => {
  const parsed = new URL(source, window.location.origin);
  const path = parsed.pathname.replace(/\/$/, '') || '/';

  // Solo cruzan las pantallas que existen de los dos lados.
  if (path === '/') return withLocationSuffix('/', source);
  if (path === '/profile' && userId) return withLocationSuffix(`/users/${userId}`, source);
  if (/^\/users\/[^/]+$/.test(path)) return withLocationSuffix(path, source);
  if (path === '/rankings') return withLocationSuffix(path, source);
  if (path === '/rankings/matchmaking') {
    return withLocationSuffix('/rankings/ranked-play', source);
  }
  if (path === '/rankings/top-plays') return withLocationSuffix(path, source);
  if (/^\/teams\/[^/]+$/.test(path)) return withLocationSuffix(path, source);
  if (path === '/beatmaps') return withLocationSuffix('/beatmapsets', source);
  if (/^\/beatmapsets\/[^/]+$/.test(path)) return withLocationSuffix(path, source);
  if (/^\/scores\/[^/]+$/.test(path)) return withLocationSuffix(path, source);

  return null;
};

export const getClassicPath = (source: string): string => {
  const parsed = new URL(source, window.location.origin);
  const path = parsed.pathname.replace(/\/$/, '') || '/';

  if (/^\/users\/[^/]+\/(osu|taiko|fruits|mania)$/.test(path)) {
    return withLocationSuffix(path.split('/').slice(0, 3).join('/'), source);
  }
  if (path.startsWith('/rankings/ranked-play')) {
    return withLocationSuffix('/rankings/matchmaking', source);
  }
  if (path.startsWith('/rankings/top-plays')) {
    return withLocationSuffix('/rankings/top-plays', source);
  }
  if (path.startsWith('/rankings/')) return withLocationSuffix('/rankings', source);
  if (path === '/beatmapsets') return withLocationSuffix('/beatmaps', source);
  if (/^\/(users|teams|beatmapsets|scores)\/[^/]+$/.test(path)) {
    return withLocationSuffix(path, source);
  }

  return '/';
};

export const readFrontendPreference = (): FrontendExperience | null => {
  const match = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${FRONTEND_PREFERENCE_COOKIE}=`));
  const value = match?.split('=')[1];
  return value === 'classic' || value === 'torii-web' ? value : null;
};

const sharedCookieDomain = (): string | null => {
  const { hostname } = window.location;
  if (hostname === 'shikkesora.com' || hostname.endsWith('.shikkesora.com')) {
    return '.shikkesora.com';
  }
  if (hostname === 'torii.local' || hostname.endsWith('.torii.local')) {
    return '.torii.local';
  }
  return null;
};

export const writeFrontendPreference = (
  preference: FrontendExperience,
  remember: boolean,
): void => {
  const attributes = [
    `${FRONTEND_PREFERENCE_COOKIE}=${preference}`,
    'Path=/',
    'SameSite=Lax',
  ];
  const domain = sharedCookieDomain();
  if (domain) attributes.push(`Domain=${domain}`);
  if (window.location.protocol === 'https:') attributes.push('Secure');
  if (remember) attributes.push('Max-Age=31536000');

  document.cookie = attributes.join('; ');
};
