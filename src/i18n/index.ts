import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources, type AppLanguages } from './resources';

const defaultLanguage: AppLanguages = 'en';

// List of supported languages
const supportedLanguages: AppLanguages[] = ['en', 'zh'];

// Get the browser's preferred language
const getBrowserLanguage = (): AppLanguages => {
  if (typeof window === 'undefined') return defaultLanguage;

  const browserLang = navigator.language || (navigator as any).userLanguage;
  const langCode = browserLang.split('-')[0].toLowerCase();

  // Check whether it's a supported language
  if (supportedLanguages.includes(langCode as AppLanguages)) {
    return langCode as AppLanguages;
  }

  // Check whether it's a Chinese variant
  if (browserLang.startsWith('zh')) {
    return 'zh';
  }

  return defaultLanguage;
};

// Get the stored language, or fall back to the browser language
const getInitialLanguage = (): AppLanguages => {
  if (typeof window === 'undefined') return defaultLanguage;

  const storedLanguage = localStorage.getItem('app-language') as AppLanguages | null;
  
  if (storedLanguage && supportedLanguages.includes(storedLanguage)) {
    return storedLanguage;
  }
  
  return getBrowserLanguage();
};

const initialLanguage = getInitialLanguage();

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLanguage,
    fallbackLng: {
      default: [defaultLanguage],
      'zh-CN': ['zh'],
      'zh-TW': ['zh'],
      'zh-HK': ['zh'],
      'en-US': ['en'],
      'en-GB': ['en'],
    },
    supportedLngs: supportedLanguages,
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

// Language-change listener
i18n.on('languageChanged', (lng) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('app-language', lng);
    // Update the HTML lang attribute
    document.documentElement.lang = lng;
  }
});

// Set the HTML lang attribute on init
if (typeof window !== 'undefined') {
  document.documentElement.lang = initialLanguage;
}

export default i18n;
