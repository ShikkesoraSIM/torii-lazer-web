import React from 'react';
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { FiChevronDown, FiCheck } from 'react-icons/fi';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}

/**
 * Accessible select built on @headlessui/react Listbox (keyboard navigation,
 * typeahead, Escape, ARIA listbox/option semantics, no extra framer-motion overhead).
 */
const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  disabled = false,
  placeholder = 'Select...',
  className = '',
  ariaLabel,
}) => {
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className={`relative ${className}`}>
      <Listbox value={value} onChange={onChange} disabled={disabled}>
        {({ open }) => (
          <>
            <ListboxButton
              aria-label={ariaLabel}
              className={`w-full px-4 py-2.5 border rounded-xl bg-card text-text-primary transition-colors duration-150 flex items-center justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-torii ${
                disabled
                  ? 'opacity-50 cursor-not-allowed border-border-color'
                  : 'cursor-pointer hover:border-torii/60'
              } ${open ? 'border-torii ring-2 ring-torii/25' : 'border-border-color'}`}
            >
              <span className={`truncate ${selectedOption ? 'text-text-primary' : 'text-text-muted'}`}>
                {selectedOption ? selectedOption.label : placeholder}
              </span>
              <FiChevronDown
                className={`w-5 h-5 text-text-muted flex-shrink-0 transition-transform duration-150 ${
                  open ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              />
            </ListboxButton>

            <ListboxOptions
              className="absolute z-50 w-full mt-2 bg-[#0d122c] border border-white/15 rounded-xl shadow-elev-3 py-1 max-h-60 overflow-y-auto focus:outline-none"
            >
              {options.map((option) => (
                <ListboxOption
                  key={option.value}
                  value={option.value}
                  className={({ focus, selected }) =>
                    `w-full px-4 py-2.5 text-left flex items-center justify-between cursor-pointer transition-colors duration-150 ${
                      selected
                        ? 'bg-torii text-white'
                        : focus
                          ? 'bg-white/10 text-white'
                          : 'text-text-secondary'
                    }`
                  }
                >
                  {({ selected }) => (
                    <>
                      <span className="font-medium truncate">{option.label}</span>
                      {selected && <FiCheck className="w-4 h-4 flex-shrink-0" aria-hidden="true" />}
                    </>
                  )}
                </ListboxOption>
              ))}
            </ListboxOptions>
          </>
        )}
      </Listbox>
    </div>
  );
};

export default CustomSelect;
