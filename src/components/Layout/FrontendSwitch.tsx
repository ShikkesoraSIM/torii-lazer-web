import React from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Floating switch that jumps to the same page on the osu-web-based frontend.
 *
 * Lives bottom-right on every page. It carries the current path across so you
 * land where you already were instead of on the other site's home page.
 *
 * The tooltip is pure CSS (:hover / :focus-visible) on purpose: it's a visual
 * state, so keeping it out of React means no re-render per hover, and it still
 * works for keyboard users without wiring focus handlers.
 */
const TORII_WEB_ORIGIN = 'https://torii-web.shikkesora.com';

const FrontendSwitch: React.FC = () => {
  const location = useLocation();

  // Path + query + hash, so deep links and anchors survive the jump.
  const target = `${TORII_WEB_ORIGIN}${location.pathname}${location.search}${location.hash}`;

  return (
    <a href={target} aria-label="Try the new frontend" className="torii-frontend-switch">
      <span className="torii-frontend-switch__glow" aria-hidden="true" />

      {/* Two arrows facing out: the "swap between two things" idiom. */}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
           strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="7 8 3 12 7 16" />
        <polyline points="17 8 21 12 17 16" />
        <line x1="3" y1="12" x2="21" y2="12" />
      </svg>

      <span className="torii-frontend-switch__tip" role="tooltip">
        <strong>Try our new frontend</strong>
        <span>Still a work in progress.</span>
      </span>
    </a>
  );
};

export default FrontendSwitch;
