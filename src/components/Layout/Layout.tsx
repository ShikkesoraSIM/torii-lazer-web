import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import MaintenanceBanner from './MaintenanceBanner';
import RestrictionBanner from './RestrictionBanner';
import { Toaster } from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { NotificationProvider } from '../../contexts/NotificationContext';

const Layout: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  // 登录/注册/找回密码页面不需要顶部内边距
  const noTopPaddingRoutes = ['/', '/login', '/register', '/password-reset'];
  const shouldApplyTopPadding = !noTopPaddingRoutes.includes(location.pathname);

  // RestrictionBanner is a thin red stripe pinned above the navbar
  // (z-index 60 vs navbar's 50). When it's visible the page content
  // would otherwise sit underneath it — push the main stage down by
  // an extra ~40px to compensate. The banner only renders for
  // authenticated AND restricted users so this padding is dead code
  // for everyone else.
  const isRestricted = !!(isAuthenticated && user?.is_restricted);

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
        <main className={`torii-page-stage ${shouldApplyTopPadding ? 'pt-[56px] md:pt-20' : ''} ${isRestricted ? 'mt-10' : ''}`}>
          <Outlet />
        </main>
        <Toaster
        position="top-right"
        containerStyle={{
          top: '80px', // 在顶栏下面显示，顶栏高度约为64px，留一些间距
          right: '16px', // 右侧留一些边距
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
      </div>
    </NotificationProvider>
  );
};

export default Layout;
