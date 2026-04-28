import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiHeart, FiExternalLink } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';

/**
 * Public Ko-fi URL for the Torii donation page. Hard-coded on purpose:
 * it never changes per environment and we don't want to require an env
 * var just to render a heart icon. If the page slug ever changes, edit
 * here.
 */
const KOFI_URL = 'https://ko-fi.com/shikkesora';

/**
 * Small "Support Torii" affordance for the navbar.
 *
 * Mirrors the pattern osu! itself uses (pink heart in the global nav
 * with a "support the game" tooltip). Here it opens a tiny popover
 * with one sentence of context and a CTA out to Ko-fi — enough to
 * frame the donation as a thank-you (not a paywall) without nagging.
 *
 * Two variants:
 *   - "desktop": same circular pill as the search/bell buttons, with
 *     a hover tooltip and a popover anchored below the button.
 *   - "icon": just the heart, used by the mobile bar where space is
 *     tight; click still opens the popover.
 *
 * The popover deliberately avoids any "tier" language. The web client
 * doesn't need the long disclaimer block — that lives in the lazer
 * heart-click dialog where the supporter status is actually being
 * inspected. Out here we just say "donations help, no pay-to-win,
 * support osu! itself first" in the tightest form.
 */
interface SupportButtonProps {
  /**
   * Currently both variants render the same heart pill — kept as a
   * prop so the call sites in the desktop and mobile navbars can
   * differentiate later (e.g. tighter sizing on mobile, hover-only
   * tooltip on desktop) without a breaking signature change.
   */
  variant?: 'desktop' | 'icon';
}

const SupportButton: React.FC<SupportButtonProps> = memo(({ variant: _variant = 'desktop' }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleToggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const handleClose = useCallback(() => setIsOpen(false), []);

  // Close popover on outside click / Escape, same UX contract as the
  // mobile-menu dropdown above so users don't have to guess.
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // The heartbeat pulse only runs while the popover is closed — once
  // the user has acknowledged the affordance there's no point
  // continuing to draw their eye to it.
  const pulse = !isOpen;

  return (
    <div className="relative" ref={containerRef}>
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleToggle}
        aria-label={t('nav.support')}
        title={t('nav.support')}
        className={[
          'relative h-10 w-10 rounded-full',
          'border border-[#ff5bbd]/30 bg-[#ff5bbd]/10 hover:bg-[#ff5bbd]/20',
          'transition inline-flex items-center justify-center',
          'text-[#ff7eb8] hover:text-[#ffb3d9]',
          isOpen ? 'shadow-[0_0_18px_rgba(255,91,189,0.45)]' : '',
        ].join(' ')}
      >
        <motion.span
          animate={
            pulse
              ? { scale: [1, 1.15, 1, 1.08, 1] }
              : { scale: 1 }
          }
          transition={
            pulse
              ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.2 }
          }
          className="inline-flex"
        >
          <FiHeart size={18} fill="currentColor" />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className={[
              // Pin to the right edge for desktop variant so it doesn't
              // overflow the viewport; the mobile bar puts the button
              // further left so we still anchor right and let it grow
              // leftward.
              'absolute right-0 mt-3 z-50',
              'w-[300px] max-w-[88vw]',
              'rounded-3xl border border-white/10',
              'bg-[rgba(10,10,25,0.95)] backdrop-blur-xl',
              'shadow-[0_18px_60px_rgba(0,0,0,0.45)]',
              'overflow-hidden',
            ].join(' ')}
            role="dialog"
          >
            {/* Soft pink wash to tie the popover visually to the heart */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#ff5bbd]/12 via-transparent to-[#c084fc]/8 pointer-events-none" />

            <div className="relative p-4">
              <div className="flex items-center gap-2 text-white font-semibold">
                <FiHeart size={16} className="text-[#ff7eb8]" fill="currentColor" />
                <span>{t('support.title')}</span>
              </div>

              <p className="mt-2 text-sm text-white/75 leading-relaxed">
                {t('support.body')}
              </p>

              <p className="mt-2 text-xs text-white/50 leading-relaxed">
                {t('support.osu_note')}
              </p>

              <a
                href={KOFI_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleClose}
                className={[
                  'mt-4 w-full inline-flex items-center justify-center gap-2',
                  'rounded-full px-4 py-2.5',
                  'text-sm font-semibold text-white',
                  'bg-gradient-to-r from-[#ff5bbd] via-[#ff7eb8] to-[#fda4af]',
                  'shadow-lg shadow-[#ff5bbd]/30',
                  'hover:brightness-110 transition',
                ].join(' ')}
              >
                <span>{t('support.cta')}</span>
                <FiExternalLink size={14} />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

SupportButton.displayName = 'SupportButton';

export default SupportButton;
