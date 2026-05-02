// Admin-only country picker for the user editor modal.
//
// Why this exists instead of reusing the global `CountrySelect`:
//
//   1. CountrySelect's value-and-search are the SAME state — typing "M"
//      immediately writes "M" into the form's `country_code`. If the admin
//      typed and then submitted without picking, the user got saved with a
//      bogus 1-2 char "country code". We want type-to-search but commit-on-
//      pick semantics here.
//
//   2. CountrySelect uses @floating-ui's FloatingPortal + FloatingFocusManager
//      and shows up to (availableHeight - 16)px tall on screens / inside
//      modals where availableHeight is large. The dark glass background
//      (rgba(11,15,38,0.94)) at near-fullscreen height made the page look
//      "all black and blue" while typing — the modal's own black overlay
//      sits behind it. Containing the dropdown inside the modal's
//      overflow-y-auto wrapper avoids the takeover entirely.
//
//   3. The admin needs the COMPLETE ISO 3166 list (so a fresh user from a
//      country with zero ranked players can still get their flag). The
//      global picker drives off `useAvailableCountries`, which is built
//      from country leaderboards.
//
// Behaviour summary:
//   - Search box mirrors the selected country code by default; clearing it
//     does NOT clear the value (use the explicit Clear button for that).
//   - Click an option → fires onChange and closes.
//   - Press Enter when there's exactly one filtered match → commits it.
//   - Esc closes the dropdown.
//   - "Clear" button blanks the value.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ISO_COUNTRIES, findCountryByCode } from '../../data/iso3166Countries';

interface AdminCountryPickerProps {
  /** Current saved value, e.g. "AR" or null if unset. */
  value: string | null | undefined;
  /** Called with an uppercase ISO code, or "" when cleared. Only fires on
   *  explicit selection — never on partial typing. */
  onChange: (value: string) => void;
  placeholder?: string;
}

const AdminCountryPicker: React.FC<AdminCountryPickerProps> = ({
  value,
  onChange,
  placeholder = 'Search by country name or code (e.g. "Argentina" or "AR")',
}) => {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = findCountryByCode(value ?? undefined);

  // Filter list as user types. Empty search → show everything (so opening
  // the dropdown with nothing typed gives a full browseable list).
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ISO_COUNTRIES;
    return ISO_COUNTRIES.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q),
    );
  }, [search]);

  // Close on outside click. Done with a body-level listener so it works
  // even though the picker lives inside an already-portaled modal.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const commit = (code: string) => {
    onChange(code.toUpperCase());
    setSearch('');
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false);
      // Reset the search text to nothing so the displayed flag/value stays
      // consistent with the saved value.
      setSearch('');
      inputRef.current?.blur();
      e.preventDefault();
    } else if (e.key === 'Enter') {
      // Two cases where Enter should commit:
      //   - the typed search is itself a valid 2-letter code ("AR")
      //   - filtered list has exactly one entry (so the intent is unambiguous)
      const direct = findCountryByCode(search);
      if (direct) {
        commit(direct.code);
        e.preventDefault();
      } else if (filtered.length === 1) {
        commit(filtered[0].code);
        e.preventDefault();
      }
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          {/* Selected flag + code chip on the left, only when a country is
              actually saved. Keeps the input visually grounded to the
              current value even while the admin is searching. */}
          {selected && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
              <img
                src={`/image/flag/${selected.code.toLowerCase()}.svg`}
                alt={selected.code}
                className="w-5 h-3.5 rounded-sm shadow-sm"
              />
              <span className="text-xs font-semibold text-white/80 tabular-nums">
                {selected.code}
              </span>
            </div>
          )}
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={selected ? '' : placeholder}
            className={`w-full py-2 sm:py-2.5 pr-10 border border-white/15 rounded-2xl bg-[rgba(12,16,42,0.72)] text-white shadow-[0_10px_28px_rgba(0,0,0,0.3)] backdrop-blur-xl min-h-[44px] sm:min-h-[48px] focus:ring-2 focus:ring-profile-color/60 focus:border-white/30 font-medium text-sm sm:text-base placeholder:text-white/45 ${
              selected ? 'pl-[4.25rem]' : 'pl-3 sm:pl-4'
            }`}
          />
          <button
            type="button"
            onClick={() => {
              setOpen((o) => !o);
              if (!open) inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 p-1"
            aria-label={open ? 'Close country list' : 'Open country list'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={open ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'}
              />
            </svg>
          </button>
        </div>

        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setSearch('');
            }}
            className="px-3 sm:px-4 py-2 sm:py-2.5 bg-white/12 text-white rounded-2xl border border-white/15 hover:bg-white/18 transition-colors shadow-[0_10px_24px_rgba(0,0,0,0.26)] font-medium text-sm sm:text-base min-h-[44px] sm:min-h-[48px] flex items-center justify-center"
          >
            Clear
          </button>
        )}
      </div>

      {/* Inline dropdown — NOT a portal. It scrolls inside the modal's
          overflow-y-auto and never extends past max-h-72, so it can't
          take over the visible page like the @floating-ui version did. */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-[rgba(11,15,38,0.96)] border border-white/15 rounded-2xl shadow-[0_16px_42px_rgba(0,0,0,0.5)] backdrop-blur-xl overflow-hidden">
          <div className="px-3 py-1.5 text-[11px] uppercase tracking-wider text-white/45 border-b border-white/10 flex items-center justify-between">
            <span>{filtered.length} {filtered.length === 1 ? 'country' : 'countries'}</span>
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  inputRef.current?.focus();
                }}
                className="text-white/55 hover:text-white normal-case tracking-normal"
              >
                clear search
              </button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto overscroll-contain">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-white/55 text-sm text-center">
                No country matches “{search}”.
              </div>
            ) : (
              filtered.map((c) => {
                const isActive = selected?.code === c.code;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => commit(c.code)}
                    className={`w-full px-3 py-2 text-left flex items-center gap-3 transition-colors ${
                      isActive
                        ? 'bg-white/12 text-white'
                        : 'hover:bg-white/8 focus:bg-white/8 focus:outline-none text-white/90'
                    }`}
                  >
                    <img
                      src={`/image/flag/${c.code.toLowerCase()}.svg`}
                      alt={c.code}
                      className="w-5 h-3.5 rounded-sm flex-shrink-0"
                    />
                    <span className="flex-1 text-sm">{c.name}</span>
                    <span className="text-white/55 text-xs tabular-nums">{c.code}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCountryPicker;
