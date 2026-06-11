import React from 'react';
import { twemojiFlagUrl } from '../../utils/countryFlag';

interface CountryFlagProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** ISO 3166-1 alpha-2 country code (case-insensitive). */
  code?: string | null;
  /** Country name, used for alt text + the shared `country-tooltip`. */
  name?: string;
  /** Corner rounding (osu flags are softly rounded). Override if needed. */
  rounded?: string;
}

/**
 * Country flag rendered with the exact set osu! uses (Twemoji), via twemojiFlagUrl.
 *
 * The Twemoji SVG is a 36x36 canvas with the flag occupying the middle 36x26 band
 * (transparent top/bottom). We use `aspect-[18/13]` (== 36/26) + object-cover so the
 * box crops exactly those bands and the flag fills it tightly at any height — set the
 * height via `className` (e.g. `h-[26px]`), width follows the flag aspect.
 *
 * Falls back Twemoji -> flagcdn -> local /image/flag, once each, no loops.
 * Defaults to the shared `country-tooltip`; pass `data-tooltip-id` to override.
 */
const CountryFlag: React.FC<CountryFlagProps> = ({
  code,
  name,
  className = 'h-[18px]',
  rounded = 'rounded-[3px]',
  ...rest
}) => {
  if (!code) return null;
  const cc = code.toLowerCase();

  return (
    <img
      src={twemojiFlagUrl(code)}
      alt={name || code}
      loading="lazy"
      decoding="async"
      data-tooltip-id="country-tooltip"
      data-tooltip-content={name}
      className={`aspect-[18/13] w-auto shrink-0 object-cover drop-shadow-sm ${rounded} ${className}`}
      onError={(e) => {
        const img = e.currentTarget;
        if (img.dataset.fb !== '1' && img.dataset.fb !== '2') {
          img.dataset.fb = '1';
          img.src = `https://flagcdn.com/${cc}.svg`;
        } else if (img.dataset.fb === '1') {
          img.dataset.fb = '2';
          img.src = `/image/flag/${cc}.svg`;
        }
      }}
      {...rest}
    />
  );
};

export default CountryFlag;
