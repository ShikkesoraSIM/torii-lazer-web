import { useEffect } from 'react';
import type { Theme } from '../types';

const noop = () => {};

/**
 * Torii is dark-only by design. The light-mode tokens were never finished and
 * the glass surfaces are forced dark via CSS, so a real light mode renders
 * broken. This hook locks the app to dark (index.html also ships
 * class="dark" so the very first paint is correct, no flash). The toggle/setter
 * are kept as no-ops so existing callers compile unchanged.
 */
export const useTheme = () => {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return {
    theme: 'dark' as Theme,
    isDark: true,
    toggleTheme: noop,
    setTheme: noop,
  };
};
