import { en } from './locales/en';

export const resources = {
  en,
} as const;

export type AppLanguages = 'en' | 'zh';

export async function loadLanguageBundle(lng: AppLanguages) {
  if (lng === 'zh') {
    const mod = await import('./locales/zh');
    return mod.zh;
  }
  return en;
}
