import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FiChevronDown, FiTrendingUp, FiAward } from 'react-icons/fi';
import type { RankingType } from '../../types';

interface RankingTypeSelectorProps {
  value: RankingType;
  onChange: (value: RankingType) => void;
  className?: string;
}

const RankingTypeSelector: React.FC<RankingTypeSelectorProps> = ({
  value,
  onChange,
  className = ''
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
  const [isClosing, setIsClosing] = useState(false);
  const closingTimerRef = useRef<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !dropdownRef.current) return;
    const rect = dropdownRef.current.getBoundingClientRect();
    const dropdownHeight = 190;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    setDropdownPosition(spaceBelow < dropdownHeight && spaceAbove > spaceBelow ? 'top' : 'bottom');
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (closingTimerRef.current) {
        window.clearTimeout(closingTimerRef.current);
        closingTimerRef.current = null;
      }
    };
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSelect = (selectedValue: RankingType) => {
    setIsClosing(true);
    setIsOpen(false);
    onChange(selectedValue);
    if (closingTimerRef.current) {
      window.clearTimeout(closingTimerRef.current);
    }
    closingTimerRef.current = window.setTimeout(() => {
      setIsClosing(false);
      closingTimerRef.current = null;
    }, 200);
  };

  const rankingTypes = [
    {
      value: 'performance' as RankingType,
      label: t('rankings.rankingTypes.performance'),
      icon: FiTrendingUp,
      description: 'pp'
    },
    {
      value: 'score' as RankingType,
      label: t('rankings.rankingTypes.score'),
      icon: FiAward,
      description: 'Total Score'
    }
  ];

  const currentType = rankingTypes.find(type => type.value === value);

  return (
    <div className={`relative ${className}`} ref={dropdownRef} onKeyDown={handleKeyDown}>
      <button
        onClick={() => setIsOpen((open) => !open)}
        className={`
          flex items-center justify-between w-full px-3 sm:px-4 py-2 sm:py-2.5
          border border-white/15 rounded-2xl
          bg-[rgba(12,16,42,0.72)] text-white
          shadow-[0_10px_28px_rgba(0,0,0,0.3)] backdrop-blur-xl min-h-[44px] sm:min-h-[48px] font-medium text-sm sm:text-base
          transition-all duration-200 transform group
          ${isClosing ? 'scale-95' : ''}
          ${isOpen
            ? 'ring-2 ring-profile-color border-transparent'
            : 'hover:border-white/30 hover:ring-1 hover:ring-profile-color/50'
          }
        `}
        aria-label="Ranking Type Selector"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="flex items-center space-x-2">
          {currentType && (
            <>
              <currentType.icon size={16} className="text-profile-color" />
              <span>{currentType.label}</span>
            </>
          )}
        </div>

        <div className={`transform transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`}>
          <FiChevronDown size={14} className="text-white/65" />
        </div>
      </button>

      {isOpen && (
        <div
          className={`
            absolute left-0 right-0 z-[180]
            bg-[rgba(11,15,38,0.94)] border border-white/15
            rounded-2xl shadow-[0_16px_42px_rgba(0,0,0,0.4)] backdrop-blur-xl
            py-1 origin-top animate-in fade-in-0 zoom-in-95 duration-100
            ${dropdownPosition === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2'}
          `}
        >
          {rankingTypes.map((type) => {
            const isSelected = type.value === value;
            const IconComponent = type.icon;

            return (
              <button
                key={type.value}
                onClick={() => handleSelect(type.value)}
                className={`
                  w-full px-3 sm:px-4 py-2.5 sm:py-3 text-left
                  transition-colors duration-150
                  flex items-center justify-between
                  ${isSelected
                    ? 'bg-profile-color/15 text-profile-color'
                    : 'text-white/85 hover:bg-white/8'
                  }
                `}
                role="option"
                aria-selected={isSelected}
              >
                <div className="flex items-center space-x-2">
                  <IconComponent size={16} className={isSelected ? 'text-profile-color' : 'text-white/60'} />
                  <div className="flex flex-col">
                    <span className="font-medium text-sm sm:text-base">{type.label}</span>
                    <span className="text-xs text-white/55">{type.description}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RankingTypeSelector;
