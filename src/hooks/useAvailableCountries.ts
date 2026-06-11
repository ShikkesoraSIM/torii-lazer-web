import { useState, useEffect, useRef } from 'react';
import { rankingsAPI } from '../utils/api';
import type { GameMode } from '../types';

interface Country {
  code: string;
  name: string;
}

// Global cache, keyed by game mode
const countryCache: Record<string, Country[]> = {};

export const useAvailableCountries = (mode: GameMode) => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const fetchCountries = async () => {
      // Use the cache if available
      if (countryCache[mode]) {
        setCountries(countryCache[mode]);
        return;
      }

      // Cancel any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setIsLoading(true);

      try {
        // Fetch the first page of country rankings, which usually covers every country with data
        const response = await rankingsAPI.getCountryRankings(mode, 1);

        if (!abortController.signal.aborted && response.ranking) {
          const availableCountries: Country[] = response.ranking.map((ranking: any) => ({
            code: ranking.code,
            name: ranking.name,
          }));

          // Store in cache
          countryCache[mode] = availableCountries;
          setCountries(availableCountries);
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error('Failed to load available countries:', error);
          // On failure, return an empty list
          setCountries([]);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchCountries();

    // Cleanup
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [mode]);

  return { countries, isLoading };
};

