import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { FiChevronDown } from 'react-icons/fi';
import type { GameMode, MainGameMode } from '../../types';
import {
  GAME_MODE_NAMES,
  GAME_MODE_COLORS,
  GAME_MODE_GROUPS
} from '../../types';
import { useProfileColor } from '../../contexts/ProfileColorContext';
import ToriiModeIcon from './ToriiModeIcon';

interface ModeDropdownProps {
  mainMode: MainGameMode;
  modes: GameMode[];
  isOpen: boolean;
  onClose: () => void;
  selectedMode: GameMode;
  onSelectMode: (mode: GameMode) => void;
  getBrandColor: (mode: GameMode) => string;
  buttonEl: HTMLButtonElement | null;
}

const ModeDropdown: React.FC<ModeDropdownProps> = ({
  modes,
  isOpen,
  onClose,
  selectedMode,
  onSelectMode,
  getBrandColor,
  buttonEl,
}) => {
  const [pos, setPos] = useState<{ left: number; top: number; openAbove: boolean } | null>(null);

  useEffect(() => {
    if (!isOpen || !buttonEl) {
      setPos(null);
      return;
    }

    const update = () => {
      const rect = buttonEl.getBoundingClientRect();
      const estimatedHeight = 180;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openAbove = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;
      setPos({ left: rect.left, top: openAbove ? rect.top : rect.bottom, openAbove });
    };

    update();
    // Reposition while the page scrolls/resizes (dropdown is fixed-positioned via a portal).
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [isOpen, buttonEl]);

  const dropdownPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const firstBtn = dropdownPanelRef.current?.querySelector<HTMLButtonElement>('button');
    firstBtn?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        buttonEl?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose, buttonEl]);

  if (!isOpen || !pos) return null;

  // Portaled to <body> so the menu escapes any ancestor overflow-hidden (e.g. the
  // rounded profile header panel that was clipping it and cutting off the modes).
  return createPortal(
    <motion.div
      ref={dropdownPanelRef}
      role="menu"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
      // Keep the document-level outside-click handler from closing the (now portaled)
      // menu on mousedown before the item's click fires.
      onMouseDown={(e) => e.stopPropagation()}
      className="fixed z-[300] min-w-36 max-w-[320px] rounded-lg p-1.5 backdrop-blur-xl shadow-2xl"
      style={{
        left: pos.left,
        top: pos.top,
        transform: pos.openAbove ? 'translateY(calc(-100% - 8px))' : 'translateY(8px)',
        background: 'var(--float-panel-bg)',
        border: '1px solid var(--border-color)',
      }}
    >
      {modes.map((mode, index) => (
        <motion.button
          key={mode}
          role="menuitem"
          type="button"
          onClick={() => {
            onSelectMode(mode);
            onClose();
            buttonEl?.focus();
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.05, duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full text-left px-3 py-2.5 rounded-md font-medium transition-all duration-200 text-sm hover:bg-card-hover"
          style={{
            backgroundColor: selectedMode === mode ? getBrandColor(mode) : 'transparent',
            color: selectedMode === mode ? 'white' : 'var(--text-primary)',
          }}
        >
          {GAME_MODE_NAMES[mode]}
        </motion.button>
      ))}
    </motion.div>,
    document.body
  );
};

interface GameModeSelectorProps {
  selectedMode?: GameMode;
  onModeChange: (mode: GameMode) => void;
  className?: string;
  variant?: 'compact' | 'full';
  mainModesOnly?: boolean;
  excludeModes?: GameMode[];
}

const GameModeSelector: React.FC<GameModeSelectorProps> = ({
  selectedMode = 'osu',
  onModeChange,
  className = '',
  variant = 'full',
  mainModesOnly = false,
  excludeModes = [],
}) => {
  const [showSubModes, setShowSubModes] = useState<MainGameMode | null>(null);
  const [hoveredMode, setHoveredMode] = useState<MainGameMode | null>(null);
  const modeSelectRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Record<MainGameMode, HTMLButtonElement | null>>({
    osu: null,
    taiko: null,
    fruits: null,
    mania: null,
  });
  const { profileColor } = useProfileColor();

  const selectedMainMode = (Object.keys(GAME_MODE_GROUPS) as MainGameMode[])
    .find(mainMode => GAME_MODE_GROUPS[mainMode].includes(selectedMode)) || 'osu';

  const isDefaultAccent =
    !profileColor ||
    profileColor.toUpperCase() === '#4F8FFF' ||
    profileColor.toUpperCase() === '#0EA5E9';

  const getBrandColor = (mode: GameMode): string => {
    const colorValue = GAME_MODE_COLORS[mode];
    if (colorValue.includes('var(--profile-color') || colorValue.includes('var(--torii-accent')) {
      return isDefaultAccent ? 'var(--torii-accent, #4F8FFF)' : profileColor;
    }
    return colorValue;
  };

  const getModeButtonStyle = (
    isActive: boolean,
    brand: string,
    extra?: React.CSSProperties,
  ): React.CSSProperties => {
    if (!isActive) {
      return { ...extra };
    }
    if (isDefaultAccent) {
      return { color: 'white', ...extra };
    }
    return {
      background: `linear-gradient(180deg, color-mix(in srgb, ${brand} 86%, white 14%) 0%, ${brand} 100%)`,
      borderColor: `${brand}66`,
      boxShadow: `0 8px 22px -6px ${brand}66, inset 0 1px 0 rgba(255, 255, 255, 0.32)`,
      color: 'white',
      ...extra,
    };
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modeSelectRef.current && !modeSelectRef.current.contains(event.target as Node)) {
        setShowSubModes(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMainModeClick = (mainMode: MainGameMode) => {
    const filtered = GAME_MODE_GROUPS[mainMode].filter(m => !excludeModes.includes(m));
    if (mainModesOnly || filtered.length <= 1) {
      onModeChange(filtered[0] ?? GAME_MODE_GROUPS[mainMode][0]);
      return;
    }
    setShowSubModes(showSubModes === mainMode ? null : mainMode);
  };

  if (variant === 'compact') {
    return (
      <div className={`relative ${className}`} ref={modeSelectRef}>
        <div className="flex gap-2">
          {(Object.keys(GAME_MODE_GROUPS) as MainGameMode[]).map((mainMode) => {
            const isActive = selectedMainMode === mainMode;
            const isHovered = hoveredMode === mainMode;
            const filteredSubModes = GAME_MODE_GROUPS[mainMode].filter(m => !excludeModes.includes(m));
            const hasSubModes = !mainModesOnly && filteredSubModes.length > 1;
            const isExpanded = showSubModes === mainMode;
            const shouldExpand = isExpanded || (isHovered && hasSubModes && !showSubModes) || (isActive && hasSubModes);

            const brand = getBrandColor(GAME_MODE_GROUPS[mainMode][0]);

            return (
              <div
                key={mainMode}
                className={`relative ${showSubModes === mainMode ? 'z-[120]' : 'z-10'}`}
                onMouseEnter={() => setHoveredMode(mainMode)}
                onMouseLeave={() => setHoveredMode(null)}
              >
                <motion.button
                  type="button"
                  aria-label={GAME_MODE_NAMES[GAME_MODE_GROUPS[mainMode][0]]}
                  aria-haspopup={hasSubModes ? 'menu' : undefined}
                  aria-expanded={hasSubModes ? isExpanded : undefined}
                  ref={(el) => {
                    buttonRefs.current[mainMode] = el;
                  }}
                  onClick={() => handleMainModeClick(mainMode)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative flex items-center justify-center rounded-full !p-0 font-medium text-sm transition-colors duration-200 overflow-hidden ${
                    isActive ? 'torii-btn-primary' : 'torii-btn-glass'
                  }`}
                  style={getModeButtonStyle(isActive, brand, { height: '40px' })}
                  animate={{ width: shouldExpand ? '62px' : '48px' }}
                  transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  <motion.div
                    className="flex items-center justify-center"
                    animate={{ x: shouldExpand ? -6 : 0 }}
                    transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                    style={{ color: isActive ? 'white' : 'currentColor' }}
                  >
                    <ToriiModeIcon mode={mainMode} className="w-5 h-5 transition-colors duration-200" />
                  </motion.div>

                  {hasSubModes && (
                    <motion.div
                      className="absolute right-[8px] flex items-center justify-center"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: shouldExpand ? 1 : 0, scale: shouldExpand ? 1 : 0.8 }}
                      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                    >
                      <motion.div
                        animate={{ rotate: isExpanded ? -180 : 0 }}
                        transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                      >
                        <FiChevronDown
                          size={13}
                          style={isActive ? { color: 'white', opacity: 0.85 } : { color: 'var(--text-secondary)', opacity: 0.65 }}
                        />
                      </motion.div>
                    </motion.div>
                  )}

                  {!isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-full opacity-0 pointer-events-none"
                      animate={{ opacity: isHovered ? 0.08 : 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ backgroundColor: brand }}
                    />
                  )}
                </motion.button>

                {hasSubModes && (
                  <ModeDropdown
                    mainMode={mainMode}
                    modes={filteredSubModes}
                    isOpen={showSubModes === mainMode}
                    onClose={() => setShowSubModes(null)}
                    selectedMode={selectedMode}
                    onSelectMode={onModeChange}
                    getBrandColor={getBrandColor}
                    buttonEl={buttonRefs.current[mainMode]}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const allModes: GameMode[] = mainModesOnly
    ? ['osu', 'taiko', 'fruits', 'mania']
    : ['osu', 'taiko', 'fruits', 'mania', 'osurx', 'osuap', 'taikorx', 'fruitsrx'];

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 ${mainModesOnly ? 'lg:grid-cols-4' : 'lg:grid-cols-8'} gap-3 ${className}`}>
      {allModes.map((mode) => {
        const mainMode = (Object.keys(GAME_MODE_GROUPS) as MainGameMode[])
          .find(m => GAME_MODE_GROUPS[m].includes(mode));
        const brand = getBrandColor(mode);

        const isActive = selectedMode === mode;

        return (
          <motion.button
            key={mode}
            onClick={() => onModeChange(mode)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className={`relative !rounded-2xl !p-0 font-medium transition-all duration-200 flex flex-col items-center justify-center gap-2 overflow-hidden group ${
              isActive ? 'torii-btn-primary' : 'torii-btn-glass'
            }`}
            style={getModeButtonStyle(isActive, brand, { width: '80px', height: '64px' })}
          >
            <motion.div
              animate={{ scale: isActive ? 1.05 : 1 }}
              whileHover={{
                scale: !isActive ? 1.1 : 1.05,
                rotate: !isActive ? 5 : 0
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              style={{ color: isActive ? 'white' : 'currentColor' }}
            >
              <ToriiModeIcon mode={mainMode ?? 'osu'} className="w-5 h-5 transition-colors duration-200" />
            </motion.div>

            <motion.span className="text-xs font-semibold transition-colors duration-200 text-center leading-tight px-1">
              {GAME_MODE_NAMES[mode]}
            </motion.span>

            {!isActive && (
              <motion.div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-15 transition-opacity duration-200 pointer-events-none"
                style={{ backgroundColor: brand }}
              />
            )}

            {isActive && (
              <motion.div
                layoutId="selected-bg-full"
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{ backgroundColor: brand, opacity: 0.12 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
};

export default GameModeSelector;
