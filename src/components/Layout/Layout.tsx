import React, { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import MaintenanceBanner from './MaintenanceBanner';
import RestrictionBanner from './RestrictionBanner';
import { Toaster } from 'react-hot-toast';
import { Tooltip } from 'react-tooltip';
import { useAuth } from '../../hooks/useAuth';
import { NotificationProvider } from '../../contexts/NotificationContext';
import ErrorBoundary from '../ErrorBoundary';
import LoadingSpinner from '../UI/LoadingSpinner';

const PageFallback: React.FC = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <LoadingSpinner size="lg" />
  </div>
);

const Layout: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  // Login / register / password-reset pages don't need the top padding.
  const noTopPaddingRoutes = ['/', '/login', '/register', '/password-reset'];
  const shouldApplyTopPadding = !noTopPaddingRoutes.includes(location.pathname);

  // Move focus to main content on client-side route navigation for keyboard & screen-reader users
  useEffect(() => {
    const main = document.getElementById('main-content');
    if (main && typeof main.focus === 'function') {
      main.focus({ preventScroll: true });
    }
  }, [location.pathname]);

  return (
    <NotificationProvider isAuthenticated={isAuthenticated} user={user}>
      <div className="torii-app-shell min-h-screen">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:rounded-xl focus:bg-torii focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to main content
        </a>
        <RestrictionBanner />
        <Navbar />
        <MaintenanceBanner />
        <main
          id="main-content"
          tabIndex={-1}
          className="torii-page-stage outline-none"
          style={{
            paddingTop: shouldApplyTopPadding
              ? 'calc(var(--restriction-banner-h, 0px) + var(--maintenance-banner-h, 0px) + var(--navbar-h, 76px))'
              : 'calc(var(--restriction-banner-h, 0px) + var(--maintenance-banner-h, 0px))',
          }}
        >
          <ErrorBoundary>
            <Suspense fallback={<PageFallback />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
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
