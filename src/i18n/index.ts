import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { loadLanguageBundle, resources, type AppLanguages } from './resources';

const defaultLanguage: AppLanguages = 'en';

// List of supported languages
const supportedLanguages: AppLanguages[] = ['en', 'zh'];

// Get the browser's preferred language
const getBrowserLanguage = (): AppLanguages => {
  if (typeof window === 'undefined') return defaultLanguage;

  const browserLang = navigator.language || (navigator as unknown as { userLanguage?: string }).userLanguage || '';
  const langCode = browserLang.split('-')[0].toLowerCase();

  // Check whether it's a supported language
  if (supportedLanguages.includes(langCode as AppLanguages)) {
    return langCode as AppLanguages;
  }

  // Check whether it's a Chinese variant
  if (browserLang.toLowerCase().startsWith('zh')) {
    return 'zh';
  }

  return defaultLanguage;
};

// Get the stored language, or fall back to the browser language
const getInitialLanguage = (): AppLanguages => {
  if (typeof window === 'undefined') return defaultLanguage;

  try {
    const storedLanguage = localStorage.getItem('app-language') as AppLanguages | null;
    if (storedLanguage && supportedLanguages.includes(storedLanguage)) {
      return storedLanguage;
    }
  } catch {
    // Ignore storage read errors in restricted environments
  }

  return getBrowserLanguage();
};

const initialLanguage = getInitialLanguage();

const ensureLanguageLoaded = async (lng: string) => {
  const normalized = (lng || '').split('-')[0].toLowerCase() as AppLanguages;
  if (normalized === 'zh' && !i18n.hasResourceBundle('zh', 'translation')) {
    const bundle = await loadLanguageBundle('zh');
    i18n.addResourceBundle('zh', 'translation', bundle.translation, true, true);
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources: { en: resources.en },
    lng: 'en',
    fallbackLng: {
      default: [defaultLanguage],
      'zh-CN': ['zh', defaultLanguage],
      'zh-TW': ['zh', defaultLanguage],
      'zh-HK': ['zh', defaultLanguage],
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
  });

const originalChangeLanguage = i18n.changeLanguage.bind(i18n);
i18n.changeLanguage = async (lng, callback) => {
  if (typeof lng === 'string') {
    await ensureLanguageLoaded(lng);
  }
  return originalChangeLanguage(lng, callback);
};

// Language-change listener
i18n.on('languageChanged', (lng) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('app-language', lng);
    } catch {
      // Ignore storage write errors
    }
    // Update the HTML lang attribute
    document.documentElement.lang = lng;
  }
});

// Set the HTML lang attribute on init and dynamically hydrate non-default locales
if (typeof window !== 'undefined') {
  document.documentElement.lang = initialLanguage;
  if (initialLanguage !== 'en') {
    void i18n.changeLanguage(initialLanguage);
  }
}

export default i18n;
