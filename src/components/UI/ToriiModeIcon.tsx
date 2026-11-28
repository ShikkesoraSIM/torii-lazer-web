import React from 'react';
import type { MainGameMode } from '../../types';

interface ToriiModeIconProps {
  mode: MainGameMode;
  className?: string;
}

const MODE_ICON_PATHS: Record<MainGameMode, string> = {
  osu: '/image/modes/osu.png',
  taiko: '/image/modes/taiko.png',
  fruits: '/image/modes/fruits.png',
  mania: '/image/modes/mania.png',
};

/**
 * Official Torii ruleset icons sourced from toriirefresh-resources (commit a62ed2bf),
 * rendered via CSS mask so they inherit `currentColor` cleanly across themes.
 */
const ToriiModeIcon: React.FC<ToriiModeIconProps> = ({ mode, className = 'w-5 h-5' }) => {
  const src = MODE_ICON_PATHS[mode];
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 ${className}`}
      style={{
        backgroundColor: 'currentColor',
        maskImage: `url(${src})`,
        WebkitMaskImage: `url(${src})`,
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
      }}
    />
  );
};

export default ToriiModeIcon;
