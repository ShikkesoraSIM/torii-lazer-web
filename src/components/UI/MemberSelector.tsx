import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiChevronDown, FiUser } from 'react-icons/fi';
import { GiCrown } from 'react-icons/gi';
import { useTranslation } from 'react-i18next';
import type { User } from '../../types';
import CountryFlag from './CountryFlag';

interface MemberSelectorProps {
  value: number | null;
  onChange: (value: number | null) => void;
  members: User[];
  currentLeaderId?: number;
  placeholder?: string;
  className?: string;
}

const MemberSelector: React.FC<MemberSelectorProps> = ({
  value,
  onChange,
  members,
  currentLeaderId,
  placeholder,
  className = ''
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close the dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
    }
  }, []);

  const handleToggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const handleSelect = useCallback((selectedValue: number | null) => {
    onChange(selectedValue);
    setIsOpen(false);
  }, [onChange]);

  // Filter out the current leader
  const availableMembers = members.filter(member => member.id !== currentLeaderId);

  // Get the currently selected member
  const selectedMember = value ? members.find(member => member.id === value) : null;

  return (
    <div 
      className={`relative ${className}`}
      ref={dropdownRef}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger button */}
      <button
        type="button"
        onClick={handleToggle}
        className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg
                   bg-card text-gray-900 dark:text-white
                   focus:ring-2 focus:ring-osu-pink focus:border-transparent
                   flex items-center justify-between transition-colors
                   hover:border-gray-300 dark:hover:border-gray-600"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          {selectedMember ? (
            <>
              <div className="flex-shrink-0">
                <img
                  src={selectedMember.avatar_url || '/default.jpg'}
                  alt={selectedMember.username}
                  className="w-6 h-6 rounded-full"
                  onError={(e) => {
                    e.currentTarget.src = '/default.jpg';
                  }}
                />
              </div>
              <div className="flex flex-col items-start min-w-0">
                <span className="font-medium truncate">
                  {selectedMember.username}
                </span>
                {selectedMember.country?.name && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <span>{selectedMember.country.name}</span>
                    {selectedMember.country.code && (
                      <CountryFlag
                        code={selectedMember.country.code}
                        name={selectedMember.country.name}
                        className="h-2"
                      />
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <FiUser className="w-5 h-5 text-gray-400" />
              <span className="text-gray-500 dark:text-gray-400">
                {placeholder || t('teams.create.keepCurrentLeader')}
              </span>
            </>
          )}
        </div>
        
        <FiChevronDown 
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown options */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
          <div className="max-h-60 overflow-y-auto">
            {/* Keep current leader option */}
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                         flex items-center gap-3 ${
                           value === null 
                             ? 'bg-osu-pink/10 text-osu-pink border-r-2 border-osu-pink' 
                             : 'text-gray-900 dark:text-white'
                         }`}
            >
              <GiCrown className="w-5 h-5 text-yellow-500" />
              <span className="font-medium">
                {placeholder || t('teams.create.keepCurrentLeader')}
              </span>
            </button>

            {/* Divider */}
            {availableMembers.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-700" />
            )}

            {/* Selectable members */}
            {availableMembers.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => handleSelect(member.id)}
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                           flex items-center gap-3 ${
                             value === member.id 
                               ? 'bg-osu-pink/10 text-osu-pink border-r-2 border-osu-pink' 
                               : 'text-gray-900 dark:text-white'
                           }`}
              >
                <div className="flex-shrink-0">
                  <img
                    src={member.avatar_url || '/default.jpg'}
                    alt={member.username}
                    className="w-6 h-6 rounded-full"
                    onError={(e) => {
                      e.currentTarget.src = '/default.jpg';
                    }}
                  />
                </div>
                <div className="flex flex-col items-start min-w-0">
                  <span className="font-medium truncate">
                    {member.username}
                  </span>
                  {member.country?.name && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <span>{member.country.name}</span>
                      {member.country.code && (
                        <CountryFlag
                          code={member.country.code}
                          name={member.country.name}
                          className="h-2"
                        />
                      )}
                    </div>
                  )}
                </div>
              </button>
            ))}

            {/* Empty state */}
            {availableMembers.length === 0 && (
              <div className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                <FiUser className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t('teams.create.noMembersAvailable')}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberSelector;
