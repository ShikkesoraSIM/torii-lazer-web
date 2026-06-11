/**
 * Get the translated name of a country
 * @param t - the i18next translation function
 * @param countryCode - the country code
 * @param fallbackName - fallback name (the name returned by the API)
 * @returns the translated country name
 */
export const getCountryName = (
  t: (key: string) => string, 
  countryCode: string, 
  fallbackName?: string
): string => {
  const translationKey = `countries.${countryCode}`;
  const translated = t(translationKey);
  
  // If no translation exists (the key is returned), use the fallback name or country code
  if (translated === translationKey) {
    return fallbackName || countryCode;
  }
  
  return translated;
};

