import React, { memo, useCallback } from 'react';

interface HueSliderProps {
  hue: number;
  onChange: (hue: number) => void;
  className?: string;
}

/**
 * HueSlider - hue slider component
 * Based on fuwari's implementation, using the OKLCH color space
 * Wrapped in memo to avoid unnecessary re-renders
 */
const HueSlider: React.FC<HueSliderProps> = memo(({ hue, onChange, className = '' }) => {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value));
  }, [onChange]);

  return (
    <div className={`hue-slider-wrapper ${className}`}>
      <input
        type="range"
        min="0"
        max="360"
        step="1"
        value={hue}
        onChange={handleChange}
        className="hue-slider"
        aria-label="Hue selector"
      />
    </div>
  );
});

HueSlider.displayName = 'HueSlider';

export default HueSlider;

