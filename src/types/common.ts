export type GameMode = 'osu' | 'taiko' | 'fruits' | 'mania' | 'osurx' | 'osuap' | 'taikorx' | 'fruitsrx';

export type MainGameMode = 'osu' | 'taiko' | 'fruits' | 'mania';

export const GAME_MODE_GROUPS: Record<MainGameMode, GameMode[]> = {
  osu: ['osu', 'osurx', 'osuap'],
  taiko: ['taiko', 'taikorx'],
  fruits: ['fruits', 'fruitsrx'],
  mania: ['mania'],
};

export const GAME_MODE_NAMES: Record<GameMode, string> = {
  osu: 'Standard',
  osurx: 'Relax',
  osuap: 'Auto Pilot',
  taiko: 'Taiko',
  taikorx: 'Taiko RX',
  fruits: 'Catch',
  fruitsrx: 'Catch RX',
  mania: 'Mania',
};

// Helper to read the theme color - reads straight from the CSS variable
export const getProfileColor = () => {
  if (typeof window !== 'undefined') {
    const color = getComputedStyle(document.documentElement).getPropertyValue('--profile-color').trim();
    if (color) return color;
    return document.documentElement.classList.contains('theme-aero') ? '#0EA5E9' : '#4F8FFF';
  }
  return '#4F8FFF';
};

const DEFAULT_MODE_COLOR = 'var(--torii-accent, #4F8FFF)';

export const GAME_MODE_COLORS: Record<GameMode, string> = {
  osu: DEFAULT_MODE_COLOR,
  osurx: DEFAULT_MODE_COLOR,
  osuap: DEFAULT_MODE_COLOR,
  taiko: DEFAULT_MODE_COLOR,
  taikorx: DEFAULT_MODE_COLOR,
  fruits: DEFAULT_MODE_COLOR,
  fruitsrx: DEFAULT_MODE_COLOR,
  mania: DEFAULT_MODE_COLOR,
};

export type Theme = 'dark' | 'aero';

export const MAIN_MODE_ICONS: Record<MainGameMode, string> = {
  osu: 'fa-extra-mode-osu',
  taiko: 'fa-extra-mode-taiko',
  fruits: 'fa-extra-mode-fruits',
  mania: 'fa-extra-mode-mania',
};
