import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiSun,
  FiMoon,
  FiBell,
  FiSearch,
  FiInfo,
  FiBookOpen,
  FiMenu,
  FiX,
  FiSettings,
  FiGlobe,
  FiCheck,
  FiLogOut,
} from 'react-icons/fi';
import {
  BarChart3,
  Disc3,
  Users2,
  Shield,
  Wrench,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { useNotificationContext } from '../../contexts/NotificationContext';
import UserDropdown from '../UI/UserDropdown';
import Avatar from '../UI/Avatar';
import NavbarSearchOverlay from './NavbarSearchOverlay';
import SupportButton from './SupportButton';
import CountryFlag from '../UI/CountryFlag';
import type { NavItem as NavItemType } from '../../types';
const NavItem = memo<{ item: NavItemType; compact?: boolean }>(({ item, compact = false }) => {
  const [isHovered, setIsHovered] = useState(false);
  const location = useLocation();
  const IconComponent = item.icon;
  const isActive = location.pathname === item.path;

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);

  return (
    <motion.div
      animate={{ scale: isActive ? 1 : 0.98, opacity: isActive ? 1 : 0.8 }}
      whileHover={{
        y: -1,
        opacity: 1,
        scale: 1,
        transition: { duration: 0.16 },
      }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
      onHoverStart={handleMouseEnter}
      onHoverEnd={handleMouseLeave}
      className="relative flex-shrink-0"
    >
      <Link
        to={item.path}
        title={compact ? item.title : undefined}
        aria-label={compact ? item.title : undefined}
        className={`relative flex items-center gap-2 rounded-full font-medium text-sm transition-all duration-200 group ${
          isActive
            ? 'text-white bg-gradient-to-r from-[#ff5bbd] via-[#ff7eb8] to-[#fda4af] shadow-lg shadow-[#ff5bbd]/25'
            : 'text-white/75 hover:text-white hover:bg-white/8'
        }`}
        style={{ padding: compact ? '7px' : '7px 12px' }}
      >
        <motion.div
          className={`h-6 w-6 rounded-full flex items-center justify-center border ${
            isActive
              ? 'border-white/35 bg-white/20'
              : 'border-white/12 bg-white/5'
          }`}
          animate={{
            rotate: isHovered && !isActive ? -8 : 0,
            scale: isActive ? 1.05 : 1,
          }}
          transition={{ type: 'spring', stiffness: 280, damping: 16 }}
        >
          {IconComponent && <IconComponent size={14} />}
        </motion.div>

        {!compact && <span className="whitespace-nowrap">{item.title}</span>}

        {isActive && (
          <motion.div
            className="absolute inset-0 rounded-full border border-white/30 pointer-events-none"
            layoutId="activeTabIndicator"
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        )}

        {!isActive && (
          <motion.div
            className="absolute inset-0 rounded-full bg-white/5"
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </Link>

      {/* In icon-only mode the label moves to a hover tooltip so the row stops
          overflowing while each item is still identifiable. */}
      <AnimatePresence>
        {compact && isHovered && (
          <motion.span
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-[rgba(10,10,25,0.96)] px-2.5 py-1 text-xs font-medium text-white/90 shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
          >
            {item.title}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
NavItem.displayName = 'NavItem';
interface LanguageConfig {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  { code: 'zh', name: 'Chinese', nativeName: 'Chinese', flag: 'cn' },
  { code: 'en', name: 'English', nativeName: 'English', flag: 'us' },
];

const LanguageMenuSection = memo<{ i18n: any; t: any }>(({ i18n, t }) => {
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
        onClick={() => setShowLanguages(false)}
        className="w-full flex items-center px-2 py-2 text-xs font-medium text-white/60 hover:text-white transition-all duration-200"
      >
        â† {t('common.back')}
      </button>
      <div className="mt-1">
        {SUPPORTED_LANGUAGES.map((lang) => {
          const isActive = lang.code === currentLanguage.code;
          return (
            <button
              key={lang.code}
              onClick={() => handleLanguageSelect(lang.code)}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-lg transition-all duration-200 ${
                isActive ? 'text-osu-pink bg-osu-pink/10' : 'text-white/85 hover:bg-white/5'
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
  unreadCount: any;
  isDark: boolean;
  onThemeToggle: () => void;
  onLogout: () => void;
}>(({ items, isAuthenticated, unreadCount, isDark, onThemeToggle, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { t, i18n } = useTranslation();

  const handleClose = useCallback(() => setIsOpen(false), []);
  const handleToggle = useCallback(() => setIsOpen((prev) => !prev), []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleToggle}
        className={[
          'h-10 w-10 rounded-full',
          'border border-white/10 bg-white/5 hover:bg-white/10',
          'text-white/90 transition',
          'inline-flex items-center justify-center',
        ].join(' ')}
        aria-label="Toggle menu"
      >
        <motion.div animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
          {isOpen ? <FiX size={18} /> : <FiMenu size={18} />}
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -8 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className={[
              'absolute right-0 mt-3 w-60 overflow-hidden z-50',
              'rounded-3xl border border-white/10',
              'bg-[rgba(10,10,25,0.95)] backdrop-blur-xl',
              'shadow-[0_18px_60px_rgba(0,0,0,0.45)]',
            ].join(' ')}
          >
            <div className="py-2">
              {items.map((item) => {
                const IconComponent = item.icon;
                const active = location.pathname === item.path;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={handleClose}
                    className={`flex items-center px-4 py-3 text-sm font-medium transition-all duration-200 ${
                      active ? 'text-osu-pink bg-osu-pink/10' : 'text-white/85 hover:bg-white/5'
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
                    className={`flex items-center px-4 py-3 text-sm font-medium transition-all duration-200 ${
                      location.pathname === '/settings'
                        ? 'text-osu-pink bg-osu-pink/10'
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
                  className="flex items-center justify-between px-4 py-3 text-sm font-medium text-white/85 hover:bg-white/5 transition-all duration-200"
                >
                  <div className="flex items-center">
                    <FiBell size={16} className="mr-3" />
                    <span>{t('nav.messages')}</span>
                  </div>
                  {unreadCount.total > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                      {unreadCount.total > 9 ? '9+' : unreadCount.total}
                    </span>
                  )}
                </Link>
              )}

              <button
                onClick={() => {
                  onThemeToggle();
                  handleClose();
                }}
                className="w-full flex items-center px-4 py-3 text-sm font-medium text-white/85 hover:bg-white/5 transition-all duration-200"
              >
                {isDark ? <FiSun size={16} className="mr-3" /> : <FiMoon size={16} className="mr-3" />}
                <span>{isDark ? t('common.theme.light') : t('common.theme.dark')}</span>
              </button>

              <LanguageMenuSection i18n={i18n} t={t} />

              {isAuthenticated && (
                <>
                  <div className="h-px bg-white/10 my-1" />
                  <button
                    onClick={() => {
                      onLogout();
                      handleClose();
                    }}
                    className="w-full flex items-center px-4 py-3 text-sm font-medium text-red-300 hover:bg-red-500/10 transition-all duration-200"
                  >
                    <FiLogOut size={16} className="mr-3" />
                    <span>{t('nav.logout')}</span>
                  </button>
                </>
              )}
            </div>

            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-osu-pink/5 via-transparent to-osu-blue/5 pointer-events-none" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
MobileMenuDropdown.displayName = 'MobileMenuDropdown';
const BrandMark = memo<{ size?: number }>(({ size = 36 }) => {
  const inner = Math.max(18, Math.round(size * 0.78));

  return (
    <div
      style={{ width: size, height: size }}
      className={[
        'rounded-full border border-white/10',
        'bg-gradient-to-br from-[#c084fc]/25 via-[#ff5bbd]/12 to-[#ff7a18]/10',
        'shadow-[0_0_18px_rgba(255,90,180,0.16)]',
        'flex items-center justify-center',
      ].join(' ')}
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
  const { isDark, toggleTheme } = useTheme();
  const { user, restriction, isAuthenticated, logout } = useAuth();
  const { t } = useTranslation();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const location = useLocation();

  // Parent-level guarantee that the search overlay closes whenever the
  // route changes. The overlay component itself has an equivalent
  // useEffect, but it lives inside a framer-motion AnimatePresence
  // tree — we kept hitting a "click result -> overlay stays visible,
  // Close button also unresponsive" failure mode where the overlay's
  // internal state machinery was in a partially-exited state and
  // setIsSearchOpen(false) inside it didn't propagate. Owning the
  // close from the parent (which holds the canonical isSearchOpen
  // state) sidesteps that entirely: a navigation happens -> location
  // changes -> this effect fires -> setIsSearchOpen(false) goes
  // straight to the source of truth, no closure / mount / animation
  // dance involved. The lastPathRef ensures we only fire on actual
  // path changes, not on every re-render.
  const lastPathRef = useRef<string>(location.pathname + location.search);
  useEffect(() => {
    const currentPath = location.pathname + location.search;
    if (currentPath !== lastPathRef.current) {
      lastPathRef.current = currentPath;
      setIsSearchOpen(false);
    }
  }, [location.pathname, location.search]);

  let unreadCount = { total: 0, team_requests: 0, private_messages: 0, friend_requests: 0 } as any;
  let isConnected = false;
  let chatConnected = false;

  try {
    const ctx = useNotificationContext();
    unreadCount = ctx.unreadCount;
    isConnected = ctx.isConnected;
    chatConnected = ctx.chatConnected;
  } catch {
    // NotificationContext isn't mounted (e.g. the logged-out shell) — keep defaults.
  }

  const isFullyConnected = isConnected && chatConnected;

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

  const handleThemeToggle = useCallback(() => toggleTheme(), [toggleTheme]);
  const handleLogout = useCallback(() => logout(), [logout]);
  const openSearch = useCallback(() => setIsSearchOpen(true), []);
  const closeSearch = useCallback(() => setIsSearchOpen(false), []);

  // --- Responsive nav density -------------------------------------------
  // Logging in adds the rankings/beatmaps/teams (and admin) tabs plus the
  // messages bell, and a long username widens the user dropdown, so on a
  // narrower desktop the row runs out of room and overflows. Rather than let
  // that happen we collapse the centre nav to icon-only pills (labels move to
  // a hover tooltip). The decision is made by measuring the brand, a hidden
  // full-label mirror of the nav, and the right cluster against the available
  // width. Measuring the mirror (always full) instead of the live nav means
  // the result never depends on whether we are currently collapsed, so it
  // cannot flip-flop.
  const gridRef = useRef<HTMLDivElement>(null);
  const brandRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const navMirrorRef = useRef<HTMLDivElement>(null);
  const [compactNav, setCompactNav] = useState(false);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    // The brand and the right cluster sit in 1fr grid columns, so the cells
    // themselves stretch to the column width. We want the width of their
    // CONTENT, so sum the children (each hugs its own content) plus the gaps.
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
      const center = navMirrorRef.current?.scrollWidth ?? 0; // absolute, already hugs content
      const right = contentWidth(rightRef.current);
      // two column gaps (gap-4 = 16px each) plus a small safety buffer.
      const needed = brand + center + right + 32 + 12;
      setCompactNav(needed > available);
    };

    evaluate();
    const ro = new ResizeObserver(evaluate);
    ro.observe(grid);
    if (brandRef.current) ro.observe(brandRef.current);
    if (rightRef.current) ro.observe(rightRef.current);
    // Backstop the observer with a plain resize listener, and re-measure once
    // webfonts have loaded since that shifts the label widths.
    window.addEventListener('resize', evaluate);
    document.fonts?.ready?.then(evaluate).catch(() => {});
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', evaluate);
    };
  }, [filteredNavItems, isAuthenticated, user?.username, user?.is_admin]);

  return (
    <>
      <header
        className={`hidden md:flex fixed ${restriction?.is_restricted ? '' : 'top-4'} left-0 right-0 z-50 justify-center px-4`}
        style={restriction?.is_restricted ? { top: 'calc(var(--restriction-banner-h, 0px) + 0.25rem)' } : undefined}
      >
        <div className="w-full max-w-7xl">
          <div
            className={[
              'rounded-full torii-nav-liquid',
              'px-5 py-3',
            ].join(' ')}
          >
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
                <div className="flex items-center gap-1">
                  {filteredNavItems.map((item) => (
                    <NavItem key={item.path} item={item} compact={compactNav} />
                  ))}
                </div>

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
                <motion.button
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={openSearch}
                  className={[
                    'relative h-10 w-10 rounded-full',
                    'border border-white/10 bg-white/5 hover:bg-white/10',
                    'transition inline-flex items-center justify-center text-white/90',
                  ].join(' ')}
                  aria-label={t('common.search')}
                >
                  <FiSearch size={18} />
                </motion.button>

                {/* Wiki / rules hub, reachable from any page. Sits next to the
                    About "i" so the pair reads "help + about" without touching
                    the center nav row. */}
                <Link to="/wiki" title="Torii Wiki & Rules" aria-label="Torii Wiki & Rules">
                  <motion.div
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative h-10 w-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition inline-flex items-center justify-center text-white/90"
                  >
                    <FiBookOpen size={18} />
                  </motion.div>
                </Link>

                {/* Small About / transparency entry, reachable from any page. */}
                <Link to="/about" title="About Torii" aria-label="About Torii">
                  <motion.div
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative h-10 w-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition inline-flex items-center justify-center text-white/90"
                  >
                    <FiInfo size={18} />
                  </motion.div>
                </Link>

                {/* Heart button — same shape as the other nav pills but
                    in supporter pink so it reads as "support the game"
                    without needing the label osu! has. Mirrors the
                    pattern users already know from osu.ppy.sh. */}
                <SupportButton variant="desktop" />

                {isAuthenticated && (
                  <Link to="/messages">
                    <motion.button
                      whileHover={{ scale: 1.06 }}
                      whileTap={{ scale: 0.95 }}
                      className={[
                        'relative h-10 w-10 rounded-full',
                        'border border-white/10 bg-white/5 hover:bg-white/10',
                        'transition inline-flex items-center justify-center',
                        isFullyConnected ? 'text-white/90' : 'text-white/40',
                      ].join(' ')}
                    >
                      <FiBell size={18} />
                      {unreadCount.total > 0 && (
                        <motion.div
                          className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 min-w-5 px-1 flex items-center justify-center font-medium"
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          {unreadCount.total > 99 ? '99+' : unreadCount.total}
                        </motion.div>
                      )}
                    </motion.button>
                  </Link>
                )}

                {isAuthenticated && user ? (
                  <UserDropdown user={user} onLogout={handleLogout} />
                ) : (
                  <div className="flex items-center gap-2">
                    <Link
                      to="/login"
                      className="text-white/70 hover:text-white text-sm font-semibold px-3 py-2 rounded-full transition"
                    >
                      {t('nav.login')}
                    </Link>
                    <Link
                      to="/register"
                      className="text-white text-sm font-semibold px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 transition"
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
        className={`md:hidden fixed ${restriction?.is_restricted ? '' : 'top-0'} left-0 right-0 z-50 px-3 pt-3`}
        style={restriction?.is_restricted ? { top: 'calc(var(--restriction-banner-h, 0px) + 0.25rem)' } : undefined}
      >
        <div className="rounded-3xl torii-nav-liquid">
          <div className="flex items-center justify-between px-4 py-3">
            <Link to="/" title={t('nav.home')} className="group flex items-center gap-3">
              <BrandMark size={36} />
              <div className="leading-tight">
                <span className="block text-white font-semibold group-hover:text-white/90 transition">Torii</span>
                <span className="text-white/55 text-xs -mt-0.5 hidden min-[420px]:block">forged in Shikke's Dojo</span>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.95 }}
                onClick={openSearch}
                className={[
                  'h-10 w-10 rounded-full',
                  'border border-white/10 bg-white/5 hover:bg-white/10',
                  'text-white/90 transition inline-flex items-center justify-center',
                ].join(' ')}
                aria-label={t('common.search')}
              >
                <FiSearch size={18} />
              </motion.button>

              {/* Wiki / rules, reachable from the mobile bar too. */}
              <Link to="/wiki" title="Torii Wiki & Rules" aria-label="Torii Wiki & Rules">
                <motion.div
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.95 }}
                  className="h-10 w-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/90 transition inline-flex items-center justify-center"
                >
                  <FiBookOpen size={18} />
                </motion.div>
              </Link>

              {/* About / transparency, reachable from the mobile bar too. */}
              <Link to="/about" title="About Torii" aria-label="About Torii">
                <motion.div
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.95 }}
                  className="h-10 w-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/90 transition inline-flex items-center justify-center"
                >
                  <FiInfo size={18} />
                </motion.div>
              </Link>

              {/* Compact heart for the mobile bar — same popover, just
                  pinned next to the search button so it's reachable
                  without opening the hamburger menu. */}
              <SupportButton variant="icon" />

              {isAuthenticated && user ? (
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    to="/profile"
                    className="flex items-center p-1.5 rounded-2xl hover:bg-white/5 transition-all duration-200"
                  >
                    <Avatar
                      userId={user.id}
                      username={user.username}
                      avatarUrl={user.avatar_url}
                      size="sm"
                    />
                  </Link>
                </motion.div>
              ) : (
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    to="/login"
                    className="px-4 py-2 text-sm font-semibold text-white bg-white/10 hover:bg-white/15 rounded-2xl transition-all duration-200 border border-white/10"
                  >
                    {t('nav.login')}
                  </Link>
                </motion.div>
              )}

              <MobileMenuDropdown
                items={filteredNavItems}
                isAuthenticated={isAuthenticated}
                unreadCount={unreadCount}
                isDark={isDark}
                onThemeToggle={handleThemeToggle}
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


