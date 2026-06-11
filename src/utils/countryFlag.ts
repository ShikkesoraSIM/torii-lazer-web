// Country flag helpers.
//
// osu! renders country flags using the Twemoji set (Twitter's open-source emoji
// flags, pinned at v14.0.2) rather than plain rectangular flags — those are the
// clean, slightly-rounded ones used across the official site and client. We pull
// the exact same set straight from the Twemoji CDN by turning an ISO 3166-1
// alpha-2 country code into its two regional-indicator codepoints
// (e.g. "AR" -> 1f1e6-1f1f7).

const TWEMOJI_BASE = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg';

/** Build the Twemoji flag SVG URL for an ISO 3166-1 alpha-2 country code. */
export function twemojiFlagUrl(code: string): string {
  const cp = code
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .split('')
    .map((ch) => (0x1f1e6 + ch.charCodeAt(0) - 65).toString(16))
    .join('-');
  return `${TWEMOJI_BASE}/${cp}.svg`;
}
