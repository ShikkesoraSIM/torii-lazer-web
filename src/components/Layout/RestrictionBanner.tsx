// Site-wide restriction banner.
//
// Renders a frosted red glass strip at the top of every page while the logged-in
// user carries an active restriction. The state comes from the dedicated
// GET /api/v2/torii/restriction endpoint (see AuthContext.checkRestriction):
// a restricted account 403s on /api/v2/me and never produces a user object on
// the web, so reading user.is_restricted would never light up. This endpoint is
// the one authenticated surface a restricted user can still reach.
//
// It also publishes its own height as the CSS var --restriction-banner-h so the
// Navbar and page content can drop below it cleanly (the banner wraps to a
// different number of lines depending on viewport width, so a fixed offset
// would either overlap on mobile or leave a gap on desktop).
//
// Read-only: it just makes the state visible. Write-side restrictions are
// enforced server-side at their own endpoints.

import React, { useEffect, useRef } from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';
import { useAuth } from '../../hooks/useAuth';

// Public Discord invite, and the deep link to the support-ticket channel for
// people who are already in the server.
const DISCORD_INVITE_URL = 'https://discord.gg/fZXsZFT5Xv';
const DISCORD_TICKET_URL = 'https://ptb.discord.com/channels/1466783525809164373/1466851197712601239';

const RestrictionBanner: React.FC = () => {
  const { restriction } = useAuth();
  const ref = useRef<HTMLDivElement>(null);
  const isRestricted = !!restriction?.is_restricted;

  // Publish the banner's real height (incl. its top gap) so siblings can offset
  // off it. Reset to 0 whenever it's not shown. Runs after every render so the
  // value tracks line-count changes from the reason/expiry text and resizes.
  useEffect(() => {
    const root = document.documentElement;
    const el = ref.current;
    if (!isRestricted || !el) {
      root.style.setProperty('--restriction-banner-h', '0px');
      return;
    }
    const update = () => root.style.setProperty('--restriction-banner-h', `${el.offsetHeight}px`);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.setProperty('--restriction-banner-h', '0px');
    };
  }, [isRestricted, restriction]);

  // Happy path is invisible.
  if (!isRestricted || !restriction) {
    return null;
  }

  const reason = restriction.reason?.trim();

  // ends_at is ISO-UTC (tagged with Z by the server).
  let endsStr: string | null = null;
  if (!restriction.permanent && restriction.ends_at) {
    const d = new Date(restriction.ends_at);
    if (!isNaN(d.getTime())) {
      endsStr = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }
  }

  // No "permanent" vs "not necessarily permanent" contradiction: state the
  // duration plainly, and let the appeal line carry the "this can change" part.
  const durationLine = restriction.permanent
    ? 'It does not expire on its own.'
    : endsStr
      ? `It is set to lift on ${endsStr}.`
      : null;

  return (
    <div
      ref={ref}
      className="fixed top-0 left-0 right-0 z-[70] px-2 pt-2 sm:px-3 sm:pt-3 pointer-events-none"
    >
      <div
        className="pointer-events-auto mx-auto max-w-7xl rounded-2xl border border-red-300/25 bg-red-600/20 px-4 py-2.5 text-red-50 shadow-[0_14px_42px_rgba(0,0,0,0.35)] backdrop-blur-2xl backdrop-saturate-150"
        role="alert"
        aria-live="polite"
        style={{ WebkitBackdropFilter: 'blur(24px) saturate(150%)' }}
      >
        <div className="flex items-start gap-3">
          <FaExclamationTriangle className="mt-0.5 flex-shrink-0 text-amber-300" aria-hidden />
          <p className="text-[13px] leading-snug sm:text-sm">
            <span className="font-semibold">Your account is restricted</span>
            {reason ? <>: {reason}</> : ''}.{durationLine ? ` ${durationLine}` : ''}{' '}
            This can be a safety measure, or applied while staff review something, so it is not
            always final and can be appealed.{' '}
            To appeal, open a support ticket in our{' '}
            <a
              href={DISCORD_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-white underline decoration-red-200/60 underline-offset-2 hover:decoration-white"
            >
              Discord
            </a>
            .{' '}
            <span className="text-red-100/90">
              (Already in the server?{' '}
              <a
                href={DISCORD_TICKET_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-white underline decoration-red-200/60 underline-offset-2 hover:decoration-white"
              >
                Click here
              </a>{' '}
              to open a ticket.)
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RestrictionBanner;
