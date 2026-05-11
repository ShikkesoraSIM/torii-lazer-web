// Site-wide restriction banner.
//
// Renders a red stripe at the top of every page while the logged-in
// user carries an active restriction. The flag comes from the user
// payload `user.is_restricted` which the API surfaces via
// `UserModel.transform` (see g0v0-server/app/database/user.py). The
// banner is read-only — it just makes the state visible; write-side
// restrictions (score submission, chat send, etc.) are enforced
// server-side at their respective endpoints.
//
// This is paired with a ToriiHalo PM that fires on every WebSocket
// reconnect for restricted users (see g0v0-server/app/router/
// notification/server.py) and an immediate-push PM at the moment of
// restriction (see admin ban endpoint). The banner is the visual
// equivalent for the web frontend — the user can't always check
// chat, but the banner is unavoidable.

import React from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';
import { useAuth } from '../../hooks/useAuth';

const RESTRICTION_MESSAGE =
  'You are restricted, please wait 1 month before your appeal through a ticket in the discord server.';

const RestrictionBanner: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  // Only render if the user is both authenticated AND restricted.
  // Anonymous visitors and non-restricted users see nothing — this
  // mirrors MaintenanceBanner's "happy path is invisible" pattern so
  // the layout's reserved-space logic doesn't shift around for the
  // 99% of users who aren't affected.
  if (!isAuthenticated || !user?.is_restricted) {
    return null;
  }

  // Pinned to the top of the viewport with z-index above the Navbar.
  // The Navbar itself reads `user.is_restricted` and shifts its own
  // `top` value when the banner is present (top-0 → top-10 on mobile,
  // top-4 → top-14 on desktop) so the two never overlap. Page content
  // gets a matching mt-10 from Layout.tsx to clear the banner.
  return (
    <div
      className="fixed top-0 left-0 right-0 z-[70] bg-red-600 text-white shadow-lg"
      role="alert"
      aria-live="polite"
    >
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-3">
        <FaExclamationTriangle className="flex-shrink-0 text-yellow-300" aria-hidden />
        <span className="text-sm md:text-base font-medium">
          {RESTRICTION_MESSAGE}
        </span>
      </div>
    </div>
  );
};

export default RestrictionBanner;
