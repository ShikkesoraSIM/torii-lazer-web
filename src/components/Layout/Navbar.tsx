import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FiArrowLeft,
  FiBell,
  FiSearch,
  FiInfo,
  FiBookOpen,
  FiMenu,
  FiX,
  FiSettings,
  FiGlobe,
  FiCheck,
  FiLogIn,
  FiLogOut,
  FiSun,
  FiMoon,
} from 'react-icons/fi';
import {
  BarChart3,
  Disc3,
  Users2,
  Shield,
  Wrench,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { i18n as I18nInstance, TFunction } from 'i18next';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { useNotificationContext } from '../../contexts/NotificationContext';
import UserDropdown from '../UI/UserDropdown';
import Avatar from '../UI/Avatar';
import NavbarSearchOverlay from './NavbarSearchOverlay';
import CountryFlag from '../UI/CountryFlag';
import type { NavItem as NavItemType } from '../../types';

const isRouteActive = (pathname: string, itemPath: string): boolean => {
  if (itemPath === '/') return pathname === '/';
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
};

const NavItem = memo<{ item: NavItemType; isActive: boolean; compact?: boolean }>(
  ({ item, isActive, compact = false }) => {
    const IconComponent = item.icon;

    return (
      <div className="relative flex-shrink-0 group">
        <Link
          to={item.path}
          title={compact ? item.title : undefined}
          aria-label={compact ? item.title : undefined}
          aria-current={isActive ? 'page' : undefined}
          className={`relative flex items-center gap-2 rounded-full font-medium text-sm transition-all duration-150 ${
            compact ? '!p-[7px]' : '!px-3 !py-[7px]'
          } ${
            isActive
              ? 'torii-btn-primary text-white'
              : 'text-white/75 hover:text-white hover:bg-white/[0.08] border border-transparent'
          }`}
        >
          <span
            className={`h-6 w-6 rounded-full flex items-center justify-center border transition-transform duration-150 ${
              isActive
                ? 'border-white/30 bg-white/20'
                : 'border-white/15 bg-white/5'
            }`}
          >
            {IconComponent && <IconComponent size={14} />}
          </span>

          {!compact && <span className="whitespace-nowrap">{item.title}</span>}
        </Link>

        {compact && (
          <span
            role="tooltip"
            className="pointer-events-none opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0 transition-all duration-150 absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-[#0d122c]/95 px-2.5 py-1 text-xs font-medium text-white/90 shadow-elev-2"
          >
            {item.title}
          </span>
        )}
      </div>
    );
  }
);
NavItem.displayName = 'NavItem';
interface LanguageConfig {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: 'cn' },
  { code: 'en', name: 'English', nativeName: 'English', flag: 'us' },
];

const LanguageMenuSection = memo<{ i18n: I18nInstance; t: TFunction }>(({ i18n, t }) => {
  const [showLanguages, setShowLanguages] = useState(false);

  const currentLanguage =
    SUPPORTED_LANGUAGES.find(
      (lang) => lang.code === (i18n.resolvedLanguage ?? i18n.language)
    ) || SUPPORTED_LANGUAGES[0];

  const handleLanguageSelect = (languageCode: string) => {
    void i18n.changeLanguage(languageCode);
    setShowLanguages(false);
  };

  if (!showLanguages) {
    return (
      <button
        onClick={() => setShowLanguages(true)}
        className="w-full flex items-center px-4 py-3 text-sm font-medium text-white/80 hover:bg-white/5 hover:text-white transition-all duration-200"
      >
        <FiGlobe size={16} className="mr-3" />
        <span>
          {t('common.language.label')}: {currentLanguage.nativeName}
        </span>
      </button>
    );
  }

  return (
    <div className="px-2 py-1">
      <button
        type="button" onClick={() => setShowLanguages(false)}
        className="w-full flex items-center px-2 py-2 text-xs font-medium text-white/60 hover:text-white transition-all duration-200"
      ><FiArrowLeft size={13} className="mr-1.5" aria-hidden="true" /> {t('common.back')}
      </button>
      <div className="mt-1">
        {SUPPORTED_LANGUAGES.map((lang) => {
          const isActive = lang.code === currentLanguage.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleLanguageSelect(lang.code)}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-xl transition-colors duration-150 ${
                isActive ? 'text-torii bg-torii/15' : 'text-white/85 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center">
                <CountryFlag
                  code={lang.flag}
                  name={lang.name}
                  className="h-4 mr-3"
                  rounded="rounded-sm"
                />
                <span>{lang.nativeName}</span>
              </div>
              {isActive && <FiCheck size={16} />}
            </button>
          );
        })}
      </div>
    </div>
  );
});
LanguageMenuSection.displayName = 'LanguageMenuSection';
const MobileMenuDropdown = memo<{
  items: NavItemType[];
  isAuthenticated: boolean;
  unreadTotal: number;
  onLogout: () => void;
}>(({ items, isAuthenticated, unreadTotal, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const { t, i18n } = useTranslation();

  const handleClose = useCallback(() => setIsOpen(false), []);
  const handleToggle = useCallback(() => setIsOpen((prev) => !prev), []);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        toggleBtnRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={toggleBtnRef}
        type="button"
        onClick={handleToggle}
        className="h-10 w-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/90 transition-colors inline-flex items-center justify-center"
        aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={isOpen}
        aria-controls="mobile-nav-menu"
        aria-haspopup="true"
      >
        <span className={`inline-flex transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`}>
          {isOpen ? <FiX size={18} /> : <FiMenu size={18} />}
        </span>
      </button>

      {isOpen && (
        <div
          id="mobile-nav-menu"
          className="absolute right-0 mt-3 w-64 torii-max-h-drawer overflow-y-auto overscroll-contain z-50 rounded-3xl border border-white/10 bg-[#0d122c]/95 backdrop-blur-xl shadow-elev-4"
        >
          <div className="relative z-10 py-2">
            {items.map((item) => {
              const IconComponent = item.icon;
              const active = isRouteActive(location.pathname, item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={handleClose}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center px-4 py-3 text-sm font-medium transition-colors duration-150 ${
                    active ? 'text-torii bg-torii/15' : 'text-white/85 hover:bg-white/5'
                  }`}
                >
                  {IconComponent && <IconComponent size={16} className="mr-3" />}
                  <span>{item.title}</span>
                </Link>
              );
            })}

            {isAuthenticated && (
              <>
                <div className="h-px bg-white/10 my-1" />
                <Link
                  to="/settings"
                  onClick={handleClose}
                  aria-current={isRouteActive(location.pathname, '/settings') ? 'page' : undefined}
                  className={`flex items-center px-4 py-3 text-sm font-medium transition-colors duration-150 ${
                    isRouteActive(location.pathname, '/settings')
                      ? 'text-torii bg-torii/15'
                      : 'text-white/85 hover:bg-white/5'
                  }`}
                >
                  <FiSettings size={16} className="mr-3" />
                  <span>{t('nav.settings')}</span>
                </Link>
              </>
            )}

            <div className="h-px bg-white/10 my-1" />

            {isAuthenticated && (
              <Link
                to="/messages"
                onClick={handleClose}
                aria-current={isRouteActive(location.pathname, '/messages') ? 'page' : undefined}
                className="flex items-center justify-between px-4 py-3 text-sm font-medium text-white/85 hover:bg-white/5 transition-colors duration-150"
              >
                <div className="flex items-center">
                  <FiBell size={16} className="mr-3" />
                  <span>{t('nav.messages')}</span>
                </div>
                {unreadTotal > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full h-5 min-w-5 px-1 flex items-center justify-center font-medium">
                    {unreadTotal > 9 ? '9+' : unreadTotal}
                  </span>
                )}
              </Link>
            )}

            <LanguageMenuSection i18n={i18n} t={t} />

            {isAuthenticated && (
              <>
                <div className="h-px bg-white/10 my-1" />
                <button
                  type="button"
                  onClick={() => {
                    onLogout();
                    handleClose();
                  }}
                  className="w-full flex items-center px-4 py-3 text-sm font-medium text-red-600 dark:text-red-300 hover:bg-red-500/10 transition-colors duration-150"
                >
                  <FiLogOut size={16} className="mr-3" />
                  <span>{t('nav.logout')}</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
MobileMenuDropdown.displayName = 'MobileMenuDropdown';

const BrandMark = memo<{ size?: number }>(({ size = 36 }) => {
  const inner = Math.max(18, Math.round(size * 0.78));

  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full border border-white/15 bg-gradient-to-br from-torii/25 via-sky-400/15 to-torii/15 shadow-[0_0_16px_rgba(79,143,255,0.22)] flex items-center justify-center"
    >
      <img
        src="/image/logos/logo.png"
        srcSet="/image/logos/logo.png 1x, /image/logos/logo@2x.png 2x"
        alt="Torii"
        style={{ width: inner, height: inner }}
        className="object-contain"
        draggable={false}
      />
    </div>
  );
});
BrandMark.displayName = 'BrandMark';

const Navbar: React.FC = () => {
  const { isAero, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const { t } = useTranslation();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const location = useLocation();
  const desktopHeaderRef = useRef<HTMLElement>(null);
  const mobileHeaderRef = useRef<HTMLElement>(null);

  const lastPathRef = useRef<string>(location.pathname + location.search);
  useEffect(() => {
    const currentPath = location.pathname + location.search;
    if (currentPath !== lastPathRef.current) {
      lastPathRef.current = currentPath;
      setIsSearchOpen(false);
    }
  }, [location.pathname, location.search]);

  const notificationCtx = useNotificationContext();
  const unreadTotal = notificationCtx?.unreadCount?.total ?? 0;
  const isFullyConnected = (notificationCtx?.isConnected ?? false) && (notificationCtx?.chatConnected ?? false);

  const navItems: NavItemType[] = React.useMemo(
    () => [
      { path: '/rankings', title: t('nav.rankings'), icon: BarChart3, requireAuth: true },
      { path: '/beatmaps', title: t('nav.beatmaps'), icon: Disc3, requireAuth: true },
      { path: '/teams', title: t('nav.teams'), icon: Users2, requireAuth: true },
      { path: '/admin', title: 'Admin', icon: Shield, requireAuth: true, requireAdmin: true },
      { path: '/how-to-join', title: t('nav.join'), icon: Wrench },
    ],
    [t]
  );

  const filteredNavItems = React.useMemo(
    () =>
      navItems.filter((item) => {
        if (item.requireAuth && !isAuthenticated) return false;
        if (item.requireAdmin && !user?.is_admin) return false;
        return true;
      }),
    [navItems, isAuthenticated, user?.is_admin]
  );

  const handleLogout = useCallback(() => logout(), [logout]);
  const openSearch = useCallback(() => setIsSearchOpen(true), []);
  const closeSearch = useCallback(() => setIsSearchOpen(false), []);

  // Publish exact occupied navbar height so Layout never clips under desktop pill or mobile bar.
  useLayoutEffect(() => {
    const updateNavbarHeight = () => {
      const desktopH = desktopHeaderRef.current?.offsetHeight || 0;
      const mobileH = mobileHeaderRef.current?.offsetHeight || 0;
      const activeH = desktopH > 0 ? desktopH + 16 : mobileH;
      if (activeH > 0) {
        document.documentElement.style.setProperty('--navbar-h', `${activeH}px`);
      }
    };
    updateNavbarHeight();
    const ro = new ResizeObserver(updateNavbarHeight);
    if (desktopHeaderRef.current) ro.observe(desktopHeaderRef.current);
    if (mobileHeaderRef.current) ro.observe(mobileHeaderRef.current);
    return () => ro.disconnect();
  }, []);

  const gridRef = useRef<HTMLDivElement>(null);
  const brandRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const navMirrorRef = useRef<HTMLDivElement>(null);
  const [compactNav, setCompactNav] = useState(false);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const contentWidth = (el: HTMLElement | null) => {
      if (!el) return 0;
      const kids = el.children;
      let w = 0;
      for (let i = 0; i < kids.length; i++) w += (kids[i] as HTMLElement).offsetWidth;
      if (kids.length > 1) {
        const gap = parseFloat(getComputedStyle(el).columnGap || '0') || 0;
        w += gap * (kids.length - 1);
      }
      return w;
    };

    const evaluate = () => {
      const available = grid.clientWidth;
      const brand = contentWidth(brandRef.current);
      const center = navMirrorRef.current?.scrollWidth ?? 0;
      const right = contentWidth(rightRef.current);
      const needed = center + 2 * Math.max(brand, right) + 32 + 16;
      setCompactNav(needed > available);
    };

    let rafId = 0;
    const scheduleEvaluate = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        evaluate();
      });
    };

    evaluate();
    const ro = new ResizeObserver(scheduleEvaluate);
    ro.observe(grid);
    if (brandRef.current) ro.observe(brandRef.current);
    if (rightRef.current) ro.observe(rightRef.current);
    document.fonts?.ready?.then(scheduleEvaluate).catch(() => {});
    return () => {
      ro.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [filteredNavItems, isAuthenticated, user?.username, user?.is_admin]);

  return (
    <>
      <header
        ref={desktopHeaderRef}
        className="hidden lg:flex fixed left-0 right-0 z-50 justify-center px-4"
        style={{ top: 'calc(var(--restriction-banner-h, 0px) + var(--maintenance-banner-h, 0px) + 16px)' }}
      >
        <div className="w-full max-w-7xl">
          <div className="rounded-full torii-nav-liquid px-5 py-3">
            <div ref={gridRef} className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4">
              <div ref={brandRef} className="flex items-center justify-start">
                <Link to="/" title={t('nav.home')} className="group flex items-center gap-3">
                  <BrandMark size={36} />
                  <div className="leading-tight">
                    <span className="block text-white font-semibold tracking-wide group-hover:text-white/90 transition">Torii</span>
                    <span className="hidden xl:block text-white/55 text-xs -mt-0.5">forged in Shikke's Dojo</span>
                  </div>
                </Link>
              </div>

              <div className="flex items-center justify-center">
                <nav aria-label="Primary navigation" className="flex items-center gap-1">
                  {filteredNavItems.map((item) => (
                    <NavItem
                      key={item.path}
                      item={item}
                      isActive={isRouteActive(location.pathname, item.path)}
                      compact={compactNav}
                    />
                  ))}
                </nav>

                {/* Hidden full-label mirror used only to measure how wide the
                    nav wants to be. It is never shown and never collapses, so
                    the compact decision stays stable. */}
                <div
                  ref={navMirrorRef}
                  aria-hidden
                  className="pointer-events-none invisible absolute -z-10 flex items-center gap-1"
                  style={{ left: -99999, top: 0 }}
                >
                  {filteredNavItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <span key={item.path} className="flex items-center gap-2 text-sm font-medium" style={{ padding: '7px 12px' }}>
                        <span className="flex h-6 w-6 items-center justify-center rounded-full border">
                          {Icon && <Icon size={14} />}
                        </span>
                        <span className="whitespace-nowrap">{item.title}</span>
                      </span>
                    );
                  })}
                </div>
              </div>

              <div ref={rightRef} className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={toggleTheme}
                  title={isAero ? 'Switch to Torii Night' : 'Switch to Frutiger Aero'}
                  aria-label={isAero ? 'Switch to Torii Night' : 'Switch to Frutiger Aero'}
                  className="relative h-10 w-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 active:scale-95 transition inline-flex items-center justify-center text-white/90"
                >
                  {isAero ? <FiMoon size={18} /> : <FiSun size={18} />}
                </button>

                <button
                  type="button"
                  onClick={openSearch}
                  className="relative h-10 w-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 active:scale-95 transition inline-flex items-center justify-center text-white/90"
                  aria-label={t('common.search')}
                >
                  <FiSearch size={18} />
                </button>

                <Link
                  to="/wiki"
                  title="Torii Wiki & Rules"
                  aria-label="Torii Wiki & Rules"
                  className="relative h-10 w-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 active:scale-95 transition inline-flex items-center justify-center text-white/90"
                >
                  <FiBookOpen size={18} />
                </Link>

                <Link
                  to="/about"
                  title="About Torii"
                  aria-label="About Torii"
                  className="relative h-10 w-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 active:scale-95 transition inline-flex items-center justify-center text-white/90"
                >
                  <FiInfo size={18} />
                </Link>

                {isAuthenticated && (
                  <Link
                    to="/messages"
                    aria-label={t('nav.messages')}
                    className={`relative h-10 w-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 active:scale-95 transition inline-flex items-center justify-center ${
                      isFullyConnected ? 'text-white/90' : 'text-white/40'
                    }`}
                  >
                    <FiBell size={18} />
                    {unreadTotal > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 min-w-5 px-1 flex items-center justify-center font-medium">
                        {unreadTotal > 99 ? '99+' : unreadTotal}
                      </span>
                    )}
                  </Link>
                )}

                {isAuthenticated && user ? (
                  <UserDropdown user={user} onLogout={handleLogout} />
                ) : (
                  <div className="flex items-center gap-2">
                    <Link
                      to="/login"
                      className="text-white/75 hover:text-white text-sm font-semibold px-3 py-2 rounded-full transition"
                    >
                      {t('nav.login')}
                    </Link>
                    <Link
                      to="/register"
                      className="torii-btn-primary text-sm !px-4 !py-2 rounded-full"
                    >
                      {t('nav.register')}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <header
        ref={mobileHeaderRef}
        className="lg:hidden fixed left-0 right-0 z-50 px-3 pt-3"
        style={{ top: 'calc(var(--restriction-banner-h, 0px) + var(--maintenance-banner-h, 0px))' }}
      >
        <div className="rounded-3xl torii-nav-liquid">
          <div className="flex items-center justify-between px-4 py-3">
            <Link to="/" title={t('nav.home')} className="group flex shrink-0 items-center gap-2">
              <BrandMark size={36} />
              <div className="hidden min-[360px]:block leading-tight">
                <span className="block text-white font-semibold group-hover:text-white/90 transition">Torii</span>
                <span className="text-white/55 text-xs -mt-0.5 hidden min-[600px]:block">forged in Shikke's Dojo</span>
              </div>
            </Link>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={toggleTheme}
                title={isAero ? 'Switch to Torii Night' : 'Switch to Frutiger Aero'}
                aria-label={isAero ? 'Switch to Torii Night' : 'Switch to Frutiger Aero'}
                className="h-10 w-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 active:scale-95 text-white/90 transition inline-flex items-center justify-center"
              >
                {isAero ? <FiMoon size={18} /> : <FiSun size={18} />}
              </button>

              <button
                type="button"
                onClick={openSearch}
                className="h-10 w-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 active:scale-95 text-white/90 transition inline-flex items-center justify-center"
                aria-label={t('common.search')}
              >
                <FiSearch size={18} />
              </button>

              <Link
                to="/wiki"
                title="Torii Wiki & Rules"
                aria-label="Torii Wiki & Rules"
                className="h-10 w-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 active:scale-95 text-white/90 transition inline-flex items-center justify-center"
              >
                <FiBookOpen size={18} />
              </Link>

              <Link
                to="/about"
                title="About Torii"
                aria-label="About Torii"
                className="h-10 w-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 active:scale-95 text-white/90 transition inline-flex items-center justify-center"
              >
                <FiInfo size={18} />
              </Link>

              {isAuthenticated && user ? (
                <Link
                  to="/profile"
                  aria-label={user.username}
                  className="flex items-center p-1.5 rounded-full hover:bg-white/5 transition-colors duration-150"
                >
                  <Avatar
                    userId={user.id}
                    username={user.username}
                    avatarUrl={user.avatar_url}
                    size="sm"
                  />
                </Link>
              ) : (
                <Link
                  to="/login"
                  title={t('nav.login')}
                  aria-label={t('nav.login')}
                  className="torii-btn-primary h-10 w-10 min-[480px]:w-auto !p-0 min-[480px]:!px-4 rounded-full text-sm whitespace-nowrap"
                >
                  <FiLogIn size={18} className="min-[480px]:hidden" aria-hidden="true" />
                  <span className="hidden min-[480px]:inline">{t('nav.login')}</span>
                </Link>
              )}

              <MobileMenuDropdown
                items={filteredNavItems}
                isAuthenticated={isAuthenticated}
                unreadTotal={unreadTotal}
                onLogout={handleLogout}
              />
            </div>
          </div>
        </div>
      </header>

      <NavbarSearchOverlay isOpen={isSearchOpen} onClose={closeSearch} />
    </>
  );
};

export default Navbar;


