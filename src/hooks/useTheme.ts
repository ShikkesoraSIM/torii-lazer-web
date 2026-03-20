import { useState, useEffect } from 'react';
import type { Theme } from '../types';

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    // Check localStorage first
    const savedTheme = localStorage.getItem('theme') as Theme;
    
    const applyTheme = (themeToApply: Theme) => {
      setTheme(themeToApply);
      document.documentElement.classList.toggle('dark', themeToApply === 'dark');
    };

    if (savedTheme) {
      applyTheme(savedTheme);
    } else {
      // Torii design assumes a dark baseline. Keep dark by default for consistency
      // across browsers (Safari in light mode can otherwise produce unreadable text).
      applyTheme('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const setSpecificTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  return {
    theme,
    isDark: theme === 'dark',
    toggleTheme,
    setTheme: setSpecificTheme,
  };
};
