import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { rankingsAPI, handleApiError } from '../utils/api';
import CountrySelect from '../components/UI/CountrySelect';
import RankingTypeSelector from '../components/UI/RankingTypeSelector';
import UserRankingsList from '../components/Rankings/UserRankingsList';
import CountryRankingsList from '../components/Rankings/CountryRankingsList';
import PaginationControls from '../components/Rankings/PaginationControls';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import EmptyState from '../components/UI/EmptyState';
import GameModeSelector from '../components/UI/GameModeSelector';
import { useAvailableCountries } from '../hooks/useAvailableCountries';
import type {
  GameMode,
  TopUsersResponse,
  CountryResponse,
  TabType,
  RankingType
} from '../types';

const RankingsPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  // osuap has no separate leaderboard — excluded from rankings
  const allowedModes: GameMode[] = ['osu', 'taiko', 'fruits', 'mania', 'osurx', 'taikorx', 'fruitsrx'];
  const allowedTabs: TabType[] = ['users', 'countries'];
  const allowedRankingTypes: RankingType[] = ['performance', 'score'];

  const initialMode = searchParams.get('mode') as GameMode | null;
  const initialTab = searchParams.get('tab') as TabType | null;
  const initialRankingType = searchParams.get('type') as RankingType | null;
  const initialCountry = searchParams.get('country') || '';
  const initialPageRaw = Number(searchParams.get('page'));
  const initialPage = Number.isFinite(initialPageRaw) && initialPageRaw > 0 ? Math.floor(initialPageRaw) : 1;

  const pageTitle = t('rankings.title');
  const pageSubtitle = t('nav.rankings');
  const showSubtitle = pageSubtitle.trim().toLowerCase() !== pageTitle.trim().toLowerCase();
  const [selectedMode, setSelectedMode] = useState<GameMode>(
    initialMode && allowedModes.includes(initialMode) ? initialMode : 'osu'
  );
  const [selectedTab, setSelectedTab] = useState<TabType>(
    initialTab && allowedTabs.includes(initialTab) ? initialTab : 'users'
  );
  const [rankingType, setRankingType] = useState<RankingType>(
    initialRankingType && allowedRankingTypes.includes(initialRankingType) ? initialRankingType : 'performance'
  );
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [selectedCountry, setSelectedCountry] = useState<string>(initialCountry.toUpperCase());
  
  const [userRankings, setUserRankings] = useState<TopUsersResponse | null>(null);
  const [countryRankings, setCountryRankings] = useState<CountryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasMountedRef = useRef(false);
  
  const { countries: availableCountries, isLoading: isLoadingCountries } = useAvailableCountries(selectedMode);
  
  // Load user rankings with request cancellation
  const loadUserRankings = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await rankingsAPI.getUserRankings(
        selectedMode, 
        rankingType, 
        selectedCountry || undefined, 
        currentPage
      );
      
      if (!abortController.signal.aborted) {
        setUserRankings(response);
      }
    } catch (error) {
      if (!abortController.signal.aborted) {
        handleApiError(error);
        setLoadError(t('rankings.errors.loadFailed', { defaultValue: 'Failed to load rankings.' }));
        console.error(t('rankings.errors.loadFailed'), error);
      }
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [selectedMode, rankingType, selectedCountry, currentPage, t]);

  // Load country rankings with request cancellation
  const loadCountryRankings = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await rankingsAPI.getCountryRankings(selectedMode, currentPage);
      
      if (!abortController.signal.aborted) {
        setCountryRankings(response);
      }
    } catch (error) {
      if (!abortController.signal.aborted) {
        handleApiError(error);
        setLoadError(t('rankings.errors.loadFailed', { defaultValue: 'Failed to load rankings.' }));
        console.error(t('rankings.errors.loadFailed'), error);
      }
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [selectedMode, currentPage, t]);

  // Reset pagination only on subsequent filter changes so deep links (?page=N) work on initial mount
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    setCurrentPage(1);
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  }, [selectedMode, selectedTab, rankingType, selectedCountry]);

  // Load data when dependencies change
  useEffect(() => {
    if (selectedTab === 'users') {
      loadUserRankings();
    } else {
      loadCountryRankings();
    }
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [selectedTab, loadUserRankings, loadCountryRankings]);

  useEffect(() => {
    const handleNsfwPreferenceChanged = () => {
      if (selectedTab === 'users') {
        loadUserRankings();
      }
    };
    window.addEventListener('torii:profile-media-nsfw-changed', handleNsfwPreferenceChanged);
    return () => {
      window.removeEventListener('torii:profile-media-nsfw-changed', handleNsfwPreferenceChanged);
    };
  }, [selectedTab, loadUserRankings]);

  useEffect(() => {
    const next: Record<string, string> = {
      tab: selectedTab,
      mode: selectedMode,
      page: String(currentPage),
    };

    if (selectedTab === 'users') {
      next.type = rankingType;
      if (selectedCountry) {
        next.country = selectedCountry.toUpperCase();
      }
    }

    setSearchParams(next, { replace: true });
  }, [selectedTab, selectedMode, rankingType, selectedCountry, currentPage, setSearchParams]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="min-h-screen torii-page-stage">
      <div className="max-w-7xl 3xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Page title */}
        <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary mb-1.5">
              {pageTitle}
            </h1>
            {showSubtitle && (
              <p className="text-sm sm:text-base text-text-secondary">
                {pageSubtitle}
              </p>
            )}
          </div>
          <Link
            to="/rankings/matchmaking"
            className="torii-btn-glass group text-sm self-start md:self-auto"
          >
            <span>
              {t('rankings.matchmakingLadder', { defaultValue: 'Matchmaking ladder' })}
            </span>
            <span className="text-xs text-text-muted group-hover:text-torii transition-colors" aria-hidden="true">
              &rarr;
            </span>
          </Link>
        </div>

        <div className="relative z-30 flex flex-col xl:flex-row xl:items-center gap-4 sm:gap-6 mb-4 sm:mb-6">
          <div className="torii-liquid-soft rounded-2xl p-2 relative z-[20]">
            <GameModeSelector
              selectedMode={selectedMode}
              onModeChange={setSelectedMode}
              variant="compact"
              excludeModes={['osuap']}
              className=""
            />
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center gap-3 sm:gap-4 xl:flex-1">
          <div className="flex-1">
            <div className="inline-flex torii-liquid-soft rounded-2xl p-1.5 sm:p-2 min-h-[44px] sm:min-h-[48px] items-center gap-1.5" role="tablist">
              {allowedTabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={selectedTab === tab}
                  onClick={() => setSelectedTab(tab)}
                  className={`text-sm sm:text-base ${
                    selectedTab === tab ? 'torii-btn-primary' : 'torii-btn-glass'
                  }`}
                >
                  {t(`rankings.tabs.${tab}`)}
                </button>
              ))}
            </div>
          </div>

          {selectedTab === 'users' && (
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="w-full sm:w-48">
                <RankingTypeSelector
                  value={rankingType}
                  onChange={setRankingType}
                />
              </div>

              <div className="w-full sm:w-64">
                <CountrySelect
                  value={selectedCountry}
                  onChange={setSelectedCountry}
                  placeholder={t('rankings.filters.country')}
                  countries={availableCountries}
                  isLoading={isLoadingCountries}
                />
              </div>
            </div>
          )}
          </div>
        </div>

        <div className="relative z-10 torii-liquid rounded-3xl p-3 sm:p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 sm:px-0">
              <LoadingSpinner size="lg" className="mb-4" />
              <p className="text-text-muted font-medium">{t('common.loading')}</p>
            </div>
          ) : loadError ? (
            <EmptyState
              tone="error"
              title={loadError}
              retryLabel={t('common.retry', { defaultValue: 'Retry' })}
              onRetry={() => {
                if (selectedTab === 'users') {
                  void loadUserRankings();
                } else {
                  void loadCountryRankings();
                }
              }}
            />
          ) : selectedTab === 'users' ? (
            <UserRankingsList
              rankings={userRankings}
              currentPage={currentPage}
              selectedMode={selectedMode}
              rankingType={rankingType}
            />
          ) : (
            <CountryRankingsList
              rankings={countryRankings}
              currentPage={currentPage}
              selectedMode={selectedMode}
            />
          )}

          {/* Pagination */}
          {!isLoading && (
            <PaginationControls
              total={selectedTab === 'users' ? userRankings?.total || 0 : countryRankings?.total || 0}
              currentPage={currentPage}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default RankingsPage;
