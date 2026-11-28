import React, { createContext, useContext, useEffect, useState } from 'react';
import { hexToRgb } from '../utils/color';
import type { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { preferencesAPI } from '../utils/api';

interface ProfileColorContextType {
	profileColor: string;
	setProfileColor: (color: string) => Promise<void>;
	// Set a temporary color (front-end only, not persisted to the server)
	setProfileColorLocal: (color: string) => void;
	// Reset to the saved color (loaded from the server or the last successful save)
	resetProfileColor: () => void;
	isLoading: boolean;
}

const ProfileColorContext = createContext<ProfileColorContextType | undefined>(undefined);

interface ProfileColorProviderProps {
  children: ReactNode;
}

export const getDefaultProfileColor = (): string =>
  typeof document !== 'undefined' && document.documentElement.classList.contains('theme-aero')
    ? '#0EA5E9'
    : '#4F8FFF';

export const DEFAULT_PROFILE_COLOR = '#4F8FFF';
const LOCAL_STORAGE_KEY = 'user_profile_color'; // localStorage key

const readStoredProfileColor = (): string | null => {
  try {
    return localStorage.getItem(LOCAL_STORAGE_KEY);
  } catch {
    return null;
  }
};

/**
 * ProfileColorProvider - globally manages the personal color setting
 * and applies it across the whole app via CSS variables.
 *
 * Color priority:
 * 1. Color returned by the server (highest priority)
 * 2. User color stored in localStorage
 * 3. Theme-aware default color
 */
export const ProfileColorProvider: React.FC<ProfileColorProviderProps> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [profileColor, setProfileColorState] = useState<string>(
    () => readStoredProfileColor() || getDefaultProfileColor(),
  );
  // Keep the server-loaded or successfully-saved color, used for resets
  const [savedProfileColor, setSavedProfileColor] = useState<string>(
    () => readStoredProfileColor() || getDefaultProfileColor(),
  );
  const [isLoading, setIsLoading] = useState(true);

  // Load the user's personal color setting
  useEffect(() => {
    const loadProfileColor = async () => {
      const themeDefault = getDefaultProfileColor();
      const storedColor = readStoredProfileColor();
      const initialColor = storedColor || themeDefault;

      setProfileColorState(initialColor);
      setSavedProfileColor(initialColor);
      applyColorToDOM(initialColor);
      setIsLoading(false);

      if (!isAuthenticated) {
        return;
      }

      try {
        // Fetch the user's saved color from the server in the background
        const preferences = await preferencesAPI.getPreferences();
        let serverColor = preferences.profile_colour || '';

        // Ensure the color value starts with #
        if (serverColor && !serverColor.startsWith('#')) {
          serverColor = `#${serverColor}`;
        }

        const resolvedColor = serverColor || getDefaultProfileColor();

        // Only update when the server color differs from what's currently applied
        if (resolvedColor !== initialColor) {
          setProfileColorState(resolvedColor);
          setSavedProfileColor(resolvedColor);
          if (serverColor) {
            localStorage.setItem(LOCAL_STORAGE_KEY, resolvedColor);
          }
          applyColorToDOM(resolvedColor);
        }
      } catch (error) {
        console.error('Failed to load profile color:', error);
        // On failure the stored color is already applied; nothing else to do
      }
    };

    loadProfileColor();
  }, [isAuthenticated, user]);

  // Keep default profile color synced when theme-aero class is toggled
  useEffect(() => {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;

    const observer = new MutationObserver(() => {
      if (readStoredProfileColor()) return;
      const nextDefault = getDefaultProfileColor();
      setProfileColorState(nextDefault);
      setSavedProfileColor(nextDefault);
      applyColorToDOM(nextDefault);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  // Apply the color to the DOM CSS variables
  const applyColorToDOM = (color: string) => {
    document.documentElement.style.setProperty('--profile-color', color);
    document.documentElement.style.setProperty('--osu-pink', color);

    // Convert the HEX color to RGB for background opacity

    
    // Convert the HEX color to a Hue value
    const hexToHue = (hex: string): number => {
      const cleanHex = hex.replace('#', '');
      const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
      const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
      const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const delta = max - min;
      
      let h = 0;
      if (delta !== 0) {
        if (max === r) {
          h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
        } else if (max === g) {
          h = ((b - r) / delta + 2) / 6;
        } else {
          h = ((r - g) / delta + 4) / 6;
        }
      }
      return Math.round(h * 360);
    };
    
    const rgb = hexToRgb(color);
    const hue = hexToHue(color);

    // Set the hue value used for OKLCH-space background colors
    document.documentElement.style.setProperty('--hue', String(hue));

    // Update background-related CSS variables (used by both light and dark modes)
    document.documentElement.style.setProperty('--bg-accent-light', `rgba(${rgb}, 0.05)`);
    document.documentElement.style.setProperty('--bg-accent-medium', `rgba(${rgb}, 0.1)`);
  };

  // Set the personal color and persist it to the server and localStorage
  const setProfileColor = async (color: string) => {
    try {
      // Ensure the color value starts with #
      let normalizedColor = color;
      if (normalizedColor && !normalizedColor.startsWith('#')) {
        normalizedColor = `#${normalizedColor}`;
      }

      setProfileColorState(normalizedColor);
      applyColorToDOM(normalizedColor);

      // Save to the server if logged in
      if (isAuthenticated) {
        await preferencesAPI.updatePreferences({ profile_colour: normalizedColor });
      }

      // Save to localStorage
      localStorage.setItem(LOCAL_STORAGE_KEY, normalizedColor);

      // Update the saved color on success
      setSavedProfileColor(normalizedColor);
    } catch (error) {
      console.error('Failed to save profile color:', error);
      throw error;
    }
  };

	// Set a temporary color (not persisted)
	const setProfileColorLocal = (color: string) => {
		// Ensure the color value starts with #
		let normalizedColor = color;
		if (normalizedColor && !normalizedColor.startsWith('#')) {
			normalizedColor = `#${normalizedColor}`;
		}
		setProfileColorState(normalizedColor);
		applyColorToDOM(normalizedColor);
	};

	// Reset to the saved color
	const resetProfileColor = () => {
		setProfileColorState(savedProfileColor);
		applyColorToDOM(savedProfileColor);
	};

  const value: ProfileColorContextType = {
    profileColor,
    setProfileColor,
    setProfileColorLocal,
    resetProfileColor,
    isLoading,
  };

  return (
    <ProfileColorContext.Provider value={value}>
      {children}
    </ProfileColorContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useProfileColor = (): ProfileColorContextType => {
  const context = useContext(ProfileColorContext);
  if (context === undefined) {
    throw new Error('useProfileColor must be used within a ProfileColorProvider');
  }
  return context;
};
