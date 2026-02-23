import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiChevronDown } from 'react-icons/fi';
import type { GameMode, MainGameMode } from '../../types';
import {
  GAME_MODE_NAMES,
  GAME_MODE_COLORS,
  GAME_MODE_GROUPS,
  MAIN_MODE_ICONS
} from '../../types';
import { useProfileColor } from '../../contexts/ProfileColorContext';

interface ModeDropdownProps {
  mainMode: MainGameMode;
  isOpen: boolean;
  onClose: () => void;
  selectedMode: GameMode;
  onSelectMode: (mode: GameMode) => void;
  getBrandColor: (mode: GameMode) => string;
  buttonEl: HTMLButtonElement | null;
}

const ModeDropdown: React.FC<ModeDropdownProps> = ({
  mainMode,
  isOpen,
  onClose,
  selectedMode,
  onSelectMode,
  getBrandColor,
  buttonEl,
}) => {
  const [openAbove, setOpenAbove] = useState(false);

  useEffect(() => {
    if (!isOpen || !buttonEl) return;

    const rect = buttonEl.getBoundingClientRect();
    const estimatedHeight = 180;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    setOpenAbove(spaceBelow < estimatedHeight && spaceAbove > spaceBelow);
  }, [isOpen, buttonEl]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`absolute left-0 z-[180] min-w-36 max-w-[320px] rounded-lg p-1.5 backdrop-blur-xl shadow-2xl ${
        openAbove ? 'bottom-full mb-2' : 'top-full mt-2'
      }`}
      style={{
        background: 'var(--float-panel-bg)',
        border: '1px solid var(--border-color)',
      }}
    >
      {GAME_MODE_GROUPS[mainMode].map((mode, index) => (
        <motion.button
          key={mode}
          onClick={() => {
            onSelectMode(mode);
            onClose();
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
    </motion.div>
  );
};

interface GameModeSelectorProps {
  selectedMode?: GameMode;
  onModeChange: (mode: GameMode) => void;
  className?: string;
  variant?: 'compact' | 'full';
  mainModesOnly?: boolean;
}

const GameModeSelector: React.FC<GameModeSelectorProps> = ({
  selectedMode = 'osu',
  onModeChange,
  className = '',
  variant = 'full',
  mainModesOnly = false
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

  const getBrandColor = (mode: GameMode): string => {
    const colorValue = GAME_MODE_COLORS[mode];
    if (colorValue.includes('var(--profile-color')) {
      return profileColor;
    }
    return colorValue;
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
    if (mainModesOnly) {
      onModeChange(GAME_MODE_GROUPS[mainMode][0]);
      return;
    }

    const hasSubModes = GAME_MODE_GROUPS[mainMode].length > 1;
    if (!hasSubModes) {
      onModeChange(GAME_MODE_GROUPS[mainMode][0]);
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
            const hasSubModes = !mainModesOnly && GAME_MODE_GROUPS[mainMode].length > 1;
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
                  ref={(el) => {
                    buttonRefs.current[mainMode] = el;
                  }}
                  onClick={() => handleMainModeClick(mainMode)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative flex items-center justify-center rounded-lg font-medium text-sm transition-colors duration-200 overflow-hidden border ${
                    isActive ? 'shadow-lg' : 'shadow-sm'
                  }`}
                  style={{
                    height: '40px',
                    backgroundColor: isActive ? brand : 'var(--card-bg)',
                    borderColor: isActive ? `${brand}66` : 'var(--border-color)',
                    boxShadow: isActive ? `0 4px 14px ${brand}30` : undefined,
                    color: isActive ? 'white' : 'var(--text-primary)',
                  }}
                  animate={{ width: shouldExpand ? '60px' : '48px' }}
                  transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  <motion.div
                    className="flex items-center justify-center"
                    animate={{ x: shouldExpand ? -6 : 0 }}
                    transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                  >
                    <i
                      className={`${MAIN_MODE_ICONS[mainMode]} text-xl transition-colors duration-200`}
                      style={{ color: isActive ? 'white' : 'currentColor' }}
                    />
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
                          style={isActive ? { color: 'white', opacity: 0.8 } : { color: 'var(--text-secondary)', opacity: 0.6 }}
                        />
                      </motion.div>
                    </motion.div>
                  )}

                  {!isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-lg opacity-0"
                      animate={{ opacity: isHovered ? 0.08 : 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ backgroundColor: brand }}
                    />
                  )}
                </motion.button>

                {hasSubModes && (
                  <ModeDropdown
                    mainMode={mainMode}
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

        return (
          <motion.button
            key={mode}
            onClick={() => onModeChange(mode)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="relative rounded-xl font-medium transition-all duration-200 flex flex-col items-center justify-center gap-2 overflow-hidden group border shadow-sm"
            style={{
              width: '80px',
              height: '64px',
              backgroundColor: selectedMode === mode ? brand : 'var(--card-bg)',
              borderColor: selectedMode === mode ? `${brand}66` : 'var(--border-color)',
              boxShadow: selectedMode === mode ? `0 4px 16px ${brand}25` : undefined,
              color: selectedMode === mode ? 'white' : 'var(--text-primary)',
            }}
          >
            <motion.div
              animate={{ scale: selectedMode === mode ? 1.05 : 1 }}
              whileHover={{
                scale: selectedMode !== mode ? 1.1 : 1.05,
                rotate: selectedMode !== mode ? 5 : 0
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <i
                className={`${mainMode ? MAIN_MODE_ICONS[mainMode] : 'icon-osu'} text-xl transition-colors duration-200`}
                style={{ color: selectedMode === mode ? 'white' : 'currentColor' }}
              />
            </motion.div>

            <motion.span className="text-xs font-semibold transition-colors duration-200 text-center leading-tight px-1">
              {GAME_MODE_NAMES[mode]}
            </motion.span>

            {selectedMode !== mode && (
              <motion.div
                className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-15 transition-opacity duration-200"
                style={{ backgroundColor: brand }}
              />
            )}

            {selectedMode === mode && (
              <motion.div
                layoutId="selected-bg-full"
                className="absolute inset-0 rounded-xl"
                style={{ backgroundColor: brand, opacity: 0.18 }}
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
