import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  size,
  useDismiss,
  useInteractions,
  FloatingPortal,
  FloatingFocusManager,
} from '@floating-ui/react';
import { getCountryName } from '../../utils/countryName';

export interface Country {
  code: string;
  name: string;
}

interface CountrySelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  countries?: Country[];
  isLoading?: boolean;
}

const CountrySelect: React.FC<CountrySelectProps> = ({
  value,
  onChange,
  placeholder = 'Select country or type country code',
  countries = [],
  isLoading = false
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  const { refs, floatingStyles, context, x, y } = useFloating({
    open: isOpen,
    onOpenChange: (open) => {
      setIsOpen(open);
      if (!open) {
        setSearchTerm('');
      }
    },
    placement: 'bottom-start',
    strategy: 'fixed',
    middleware: [
      offset(8),
      flip({
        fallbackPlacements: ['top-start', 'bottom-end', 'top-end'],
        padding: 8,
      }),
      shift({ padding: 8 }),
      size({
        apply({ availableHeight, rects, elements }) {
          Object.assign(elements.floating.style, {
            minWidth: `${rects.reference.width}px`,
            maxHeight: `${Math.max(160, availableHeight - 16)}px`,
            overflowY: 'auto',
          });
        },
        padding: 8,
      }),
    ],
    whileElementsMounted: autoUpdate,
  });

  const referenceRect = refs.reference.current?.getBoundingClientRect();
  const shouldFallbackPosition =
    !!referenceRect && x === 0 && y === 0 && referenceRect.left > 40;

  const dismiss = useDismiss(context, { outsidePressEvent: 'mousedown' });
  const { getFloatingProps } = useInteractions([dismiss]);

  const translatedCountries = countries.map((country) => ({
    ...country,
    translatedName: getCountryName(t, country.code, country.name)
  }));

  const filteredCountries = translatedCountries.filter((country) =>
    country.translatedName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase();
    setInputValue(newValue);
    setSearchTerm(newValue);
    setIsOpen(true);
    onChange(newValue);
  };

  const handleSelectCountry = (country: Country) => {
    setInputValue(country.code);
    onChange(country.code);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = () => {
    setInputValue('');
    onChange('');
    setSearchTerm('');
    inputRef.current?.focus();
  };

  const selectedCountry = translatedCountries.find((c) => c.code === value);

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1" ref={refs.setReference}>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            disabled={isLoading}
            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 pr-10 border border-white/15 rounded-2xl bg-[rgba(12,16,42,0.72)] text-white shadow-[0_10px_28px_rgba(0,0,0,0.3)] backdrop-blur-xl min-h-[44px] sm:min-h-[48px] focus:ring-2 focus:ring-profile-color/60 focus:border-white/30 font-medium text-sm sm:text-base placeholder:text-white/45 disabled:opacity-50 disabled:cursor-not-allowed"
          />

          {selectedCountry && (
            <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
              <img
                src={`/image/flag/${selectedCountry.code.toLowerCase()}.svg`}
                alt={selectedCountry.code}
                className="w-5 h-4 rounded-sm"
                title={selectedCountry.translatedName}
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white/80"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {value && (
          <button
            onClick={handleClear}
            className="px-3 sm:px-4 py-2 sm:py-2.5 bg-white/12 text-white rounded-2xl border border-white/15 hover:bg-white/18 transition-colors shadow-[0_10px_24px_rgba(0,0,0,0.26)] font-medium text-sm sm:text-base min-h-[44px] sm:min-h-[48px] flex items-center justify-center"
          >
            Clear
          </button>
        )}
      </div>

      {isOpen && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false}>
            <div
              ref={refs.setFloating}
              style={{
                ...floatingStyles,
                visibility: referenceRect ? 'visible' : 'hidden',
                pointerEvents: referenceRect ? 'auto' : 'none',
                ...(shouldFallbackPosition
                  ? {
                      left: referenceRect.left,
                      top: referenceRect.bottom + 8,
                    }
                  : {}),
              }}
              className="z-[180] bg-[rgba(11,15,38,0.94)] border border-white/15 rounded-2xl shadow-[0_16px_42px_rgba(0,0,0,0.4)] backdrop-blur-xl max-h-60"
              {...getFloatingProps()}
            >
              {isLoading ? (
                <div className="px-3 py-4 text-white/65 text-center">
                  <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white/70" />
                  <span className="ml-2">Loading...</span>
                </div>
              ) : filteredCountries.length > 0 ? (
                filteredCountries.map((country) => (
                  <button
                    key={country.code}
                    onClick={() => handleSelectCountry(country)}
                    className="w-full px-3 py-2 text-left hover:bg-white/8 focus:bg-white/8 focus:outline-none flex items-center gap-3"
                  >
                    <img
                      src={`/image/flag/${country.code.toLowerCase()}.svg`}
                      alt={country.code}
                      className="w-5 h-4 rounded-sm"
                    />
                    <span className="text-white">{country.translatedName}</span>
                    <span className="text-white/60 text-sm">{country.code}</span>
                  </button>
                ))
              ) : countries.length === 0 && !searchTerm ? (
                <div className="px-3 py-2 text-white/60 text-center">No countries available</div>
              ) : searchTerm ? (
                <div className="px-3 py-2 text-white/60 text-center">No matching countries found</div>
              ) : null}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </div>
  );
};

export default CountrySelect;
