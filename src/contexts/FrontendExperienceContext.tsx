import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  clearToriiWebPreferenceIfSet,
  getClassicPath,
  readReturnPath,
  type FrontendExperience,
} from '../utils/frontendExperience';

type FrontendExperienceContextValue = {
  openChooser: () => void;
  preference: FrontendExperience | null;
};

const FrontendExperienceContext = createContext<FrontendExperienceContextValue | null>(null);

// torii-web (osu-web fork) is disabled for now; force all users cleanly onto the main Torii frontend.
export const FrontendExperienceProvider = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const isChoicePage = location.pathname === '/frontend-choice';

  useEffect(() => {
    clearToriiWebPreferenceIfSet();
  }, []);

  useEffect(() => {
    if (!isChoicePage) return;
    const returnPath = readReturnPath(location.search);
    const cameFromToriiWeb = new URLSearchParams(location.search).get('from') === 'torii-web';
    const target = cameFromToriiWeb && returnPath ? getClassicPath(returnPath) : (returnPath ?? '/');
    navigate(target, { replace: true });
  }, [isChoicePage, location.search, navigate]);

  const openChooser = useCallback(() => {}, []);
  const value = useMemo<FrontendExperienceContextValue>(
    () => ({ openChooser, preference: 'classic' }),
    [openChooser],
  );

  return (
    <FrontendExperienceContext.Provider value={value}>
      {children}
    </FrontendExperienceContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useFrontendExperience = (): FrontendExperienceContextValue => {
  const context = useContext(FrontendExperienceContext);
  if (!context) throw new Error('useFrontendExperience must be used inside FrontendExperienceProvider');
  return context;
};
