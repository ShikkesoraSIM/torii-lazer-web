import { useCallback, useEffect, useState } from 'react';
import type { Theme } from '../types';

const THEME_STORAGE_KEY = 'torii-theme';
const THEME_EVENT = 'torii-theme-changed';

const readStoredTheme = (): Theme => {
  if (typeof window === 'undefined') return 'dark';
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    return raw === 'aero' ? 'aero' : 'dark';
  } catch {
    return 'dark';
  }
};

const applyThemeToDom = (theme: Theme) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'aero') {
    root.classList.remove('dark');
    root.classList.add('theme-aero');
  } else {
    root.classList.remove('theme-aero');
    root.classList.add('dark');
  }
};

export const useTheme = () => {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme());

  useEffect(() => {
    applyThemeToDom(theme);
  }, [theme]);

  useEffect(() => {
    const onThemeEvent = (e: Event) => {
      const next = (e as CustomEvent<Theme>).detail;
      if (next === 'dark' || next === 'aero') {
        setThemeState(next);
      }
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY) {
        setThemeState(e.newValue === 'aero' ? 'aero' : 'dark');
      }
    };
    window.addEventListener(THEME_EVENT, onThemeEvent);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(THEME_EVENT, onThemeEvent);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const setTheme = useCallback((next: Theme) => {
    const normalized: Theme = next === 'aero' ? 'aero' : 'dark';
    setThemeState(normalized);
    applyThemeToDom(normalized);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, normalized);
    } catch {
      /* ignore storage errors */
    }
    window.dispatchEvent(new CustomEvent<Theme>(THEME_EVENT, { detail: normalized }));
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'aero' ? 'dark' : 'aero');
  }, [theme, setTheme]);

  return {
    theme,
    isDark: theme === 'dark',
    isAero: theme === 'aero',
    toggleTheme,
    setTheme,
  };
};
