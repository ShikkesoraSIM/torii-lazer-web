// Small colour helpers shared across the profile sections.

/** Convert "#rrggbb" (or "rrggbb") to an "r, g, b" string for use in rgba(). */
export function hexToRgb(hex: string): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

/**
 * Rotate a hex colour's hue by `deg` degrees while keeping its saturation and
 * lightness. We use this to give each profile section an adjacent-but-distinct
 * accent derived from the user's chosen colour: top plays stay on the base
 * colour, pinned shifts one way, most-played shifts the other. Returns the
 * original string unchanged if it isn't a 6-digit hex.
 */
export function shiftHue(hex: string, deg: number): string {
  const c = hex.replace('#', '');
  if (c.length < 6) return hex;

  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));

  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  h = (h + deg) % 360;
  if (h < 0) h += 360;

  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - chroma / 2;

  let rr = 0;
  let gg = 0;
  let bb = 0;
  if (h < 60) { rr = chroma; gg = x; }
  else if (h < 120) { rr = x; gg = chroma; }
  else if (h < 180) { gg = chroma; bb = x; }
  else if (h < 240) { gg = x; bb = chroma; }
  else if (h < 300) { rr = x; bb = chroma; }
  else { rr = chroma; bb = x; }

  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(rr)}${toHex(gg)}${toHex(bb)}`;
}
