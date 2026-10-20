import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import FrontendChoiceOverlay from '../components/Layout/FrontendChoiceOverlay';
import { useAuth } from '../hooks/useAuth';
import {
  getClassicPath,
  getToriiWebPath,
  readFrontendPreference,
  readReturnPath,
  TORII_WEB_ORIGIN,
  writeFrontendPreference,
  type FrontendExperience,
} from '../utils/frontendExperience';

type FrontendExperienceContextValue = {
  openChooser: () => void;
  preference: FrontendExperience | null;
};

const FrontendExperienceContext = createContext<FrontendExperienceContextValue | null>(null);

export const FrontendExperienceProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, isBootstrapping, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [preference, setPreference] = useState<FrontendExperience | null>(() => readFrontendPreference());
  const [manuallyOpen, setManuallyOpen] = useState(false);

  const isChoicePage = location.pathname === '/frontend-choice';
  const isLocalPreview = import.meta.env.DEV && isChoicePage && new URLSearchParams(location.search).has('preview');
  const needsFirstChoice = !isBootstrapping && isAuthenticated && preference === null;
  const chooserOpen = isChoicePage || needsFirstChoice || manuallyOpen;
  const source = `${location.pathname}${location.search}${location.hash}`;

  useEffect(() => {
    if (
      isBootstrapping ||
      !isAuthenticated ||
      preference !== 'torii-web' ||
      chooserOpen ||
      new URLSearchParams(location.search).has('frontend-fallback')
    ) return;

    const targetPath = getToriiWebPath(source, user?.id);
    if (targetPath) window.location.replace(`${TORII_WEB_ORIGIN}${targetPath}`);
  }, [chooserOpen, isAuthenticated, isBootstrapping, location.search, preference, source, user?.id]);

  const openChooser = useCallback(() => setManuallyOpen(true), []);
  const closeChooser = useCallback(() => setManuallyOpen(false), []);

  const selectFrontend = useCallback((next: FrontendExperience, remember: boolean) => {
    writeFrontendPreference(next, remember);
    setPreference(next);
    setManuallyOpen(false);

    if (isLocalPreview) {
      window.location.reload();
      return;
    }

    const returnPath = isChoicePage ? readReturnPath(location.search) : null;
    const cameFromToriiWeb = isChoicePage && new URLSearchParams(location.search).get('from') === 'torii-web';

    if (next === 'classic') {
      if (isChoicePage) {
        navigate(cameFromToriiWeb && returnPath ? getClassicPath(returnPath) : (returnPath ?? '/'), { replace: true });
      }
      return;
    }

    if (cameFromToriiWeb && returnPath) {
      window.location.assign(`${TORII_WEB_ORIGIN}${returnPath}`);
      return;
    }

    const targetPath = getToriiWebPath(returnPath ?? source, user?.id) ?? '/';
    window.location.assign(`${TORII_WEB_ORIGIN}${targetPath}`);
  }, [isChoicePage, isLocalPreview, location.search, navigate, source, user?.id]);

  const value = useMemo(() => ({ openChooser, preference }), [openChooser, preference]);
  const canDismiss = !needsFirstChoice && !isChoicePage;

  return (
    <FrontendExperienceContext.Provider value={value}>
      {children}
      {chooserOpen && (
        <FrontendChoiceOverlay
          canDismiss={canDismiss}
          currentPreference={preference}
          onDismiss={closeChooser}
          onSelect={selectFrontend}
        />
      )}
    </FrontendExperienceContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useFrontendExperience = (): FrontendExperienceContextValue => {
  const context = useContext(FrontendExperienceContext);
  if (!context) throw new Error('useFrontendExperience must be used inside FrontendExperienceProvider');
  return context;
};
