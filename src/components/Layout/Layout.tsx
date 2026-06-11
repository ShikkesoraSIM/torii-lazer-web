import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import MaintenanceBanner from './MaintenanceBanner';
import RestrictionBanner from './RestrictionBanner';
import { Toaster } from 'react-hot-toast';
import { Tooltip } from 'react-tooltip';
import { useAuth } from '../../hooks/useAuth';
import { NotificationProvider } from '../../contexts/NotificationContext';

const Layout: React.FC = () => {
  const { isAuthenticated, user, restriction } = useAuth();
  const location = useLocation();

  // Login / register / password-reset pages don't need the top padding.
  const noTopPaddingRoutes = ['/', '/login', '/register', '/password-reset'];
  const shouldApplyTopPadding = !noTopPaddingRoutes.includes(location.pathname);

  // RestrictionBanner is a thin red stripe pinned above the navbar
  // (z-index 60 vs navbar's 50). When it's visible the page content
  // would otherwise sit underneath it — push the main stage down by
  // an extra ~40px to compensate. The banner only renders for
  // authenticated AND restricted users so this padding is dead code
  // for everyone else.
  // Driven by the dedicated restriction endpoint (see AuthContext), not the
  // user payload: a restricted account 403s on /me and never produces a user
  // object on the web, so user?.is_restricted would never be true here.
  const isRestricted = !!restriction?.is_restricted;

  return (
    <NotificationProvider isAuthenticated={isAuthenticated} user={user}>
      <div className="torii-app-shell min-h-screen bg-gray-50 dark:bg-gray-900">
        <RestrictionBanner />
        <Navbar />
        {/*
          Maintenance banner sits between the fixed navbar and the page
          content. The banner self-hides when the server is operating
          normally, so on the happy path it's a no-op (single fetch on
          mount + a 30s interval that returns {maintenance: false}).
        */}
        <MaintenanceBanner />
        <main
          className={`torii-page-stage ${shouldApplyTopPadding ? 'pt-[56px] md:pt-20' : ''}`}
          style={isRestricted ? { marginTop: 'calc(var(--restriction-banner-h, 0px) + 0.5rem)' } : undefined}
        >
          <Outlet />
        </main>
        <Toaster
        position="top-right"
        containerStyle={{
          top: '80px', // sit below the fixed navbar
          right: '16px',
        }}
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          },
          success: {
            iconTheme: {
              primary: 'var(--osu-pink, #ED8EA6)',
              secondary: 'white',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: 'white',
            },
          },
        }}
      />
      {/* One shared country-flag tooltip for the whole app (CountryFlag points here). */}
      <Tooltip id="country-tooltip" place="bottom" float style={{ zIndex: 9999 }} />
      </div>
    </NotificationProvider>
  );
};

export default Layout;
