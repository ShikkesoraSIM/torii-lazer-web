// Site-wide restriction banner.
//
// Renders a red stripe at the top of every page while the logged-in user
// carries an active restriction. The state comes from the dedicated
// GET /api/v2/torii/restriction endpoint (see AuthContext.checkRestriction)
// rather than the user payload, because a restricted account 403s on
// /api/v2/me and never gets a user object on the web at all - so reading
// user.is_restricted would never light up. The endpoint is the one
// authenticated surface a restricted user can still reach.
//
// Read-only: it just makes the state visible. Write-side restrictions
// (score submission, chat, etc.) are enforced server-side at their own
// endpoints. Paired with the ToriiHalo PM in-client and the in-game
// ToriiBriefingGlass restriction panel.

import React from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';
import { useAuth } from '../../hooks/useAuth';

const DISCORD_URL = 'https://discord.gg/fZXsZFT5Xv';

const RestrictionBanner: React.FC = () => {
  const { restriction } = useAuth();

  // Happy path is invisible: anonymous visitors and non-restricted users see
  // nothing, mirroring MaintenanceBanner so the layout's reserved-space logic
  // doesn't shift for the 99% who aren't affected.
  if (!restriction?.is_restricted) {
    return null;
  }

  const reason = restriction.reason?.trim();

  // ends_at is ISO-UTC (tagged with Z by the server). Show a friendly date.
  let endsStr: string | null = null;
  if (!restriction.permanent && restriction.ends_at) {
    const d = new Date(restriction.ends_at);
    if (!isNaN(d.getTime())) {
      endsStr = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }
  }

  // Pinned to the top of the viewport above the Navbar (z-index 70 vs 50).
  // The Navbar and Layout reserve space for it when a restriction is active.
  return (
    <div
      className="fixed top-0 left-0 right-0 z-[70] bg-red-600 text-white shadow-lg"
      role="alert"
      aria-live="polite"
    >
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-start gap-3">
        <FaExclamationTriangle className="flex-shrink-0 text-yellow-300 mt-0.5" aria-hidden />
        <p className="text-sm md:text-base font-medium leading-snug">
          Your account is restricted{reason ? <>, for: <span className="font-semibold">{reason}</span></> : ''}.
          {restriction.permanent
            ? ' This restriction is currently permanent.'
            : endsStr
              ? ` It is scheduled to lift on ${endsStr}.`
              : ''}
          {' '}This can be a safety measure or while staff look into something, and is not necessarily permanent.
          You can reach out to the admins on our{' '}
          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-semibold hover:text-yellow-200"
          >
            Discord
          </a>{' '}to appeal.
        </p>
      </div>
    </div>
  );
};

export default RestrictionBanner;
