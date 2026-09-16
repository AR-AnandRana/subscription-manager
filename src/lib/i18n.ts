/**
 * Translations, taken verbatim from the original Wallos.
 *
 * `src/lib/i18n/*.json` was generated from the upstream `includes/i18n/*.php`
 * files, so every label reads exactly as it does in the PHP app, in all 29
 * languages it ships. Dictionaries load on the server for the account's chosen
 * language and travel to the client with the rest of the app data, so no
 * language file past the active one reaches the browser.
 */

import languages from './i18n/languages.json';
import en from './i18n/en.json';

export type I18n = Record<string, string>;

export interface LanguageInfo {
  name: string;
  dir: 'ltr' | 'rtl';
}

export const LANGUAGES = languages as Record<string, LanguageInfo>;
export const DEFAULT_LANGUAGE = 'en';
export const EN: I18n = en;

/**
 * Load a language, falling back to English. Unknown or partly translated
 * languages fall back key by key, which is what upstream's `translate()` does
 * when a key is missing.
 */
export async function loadI18n(lang: string | null | undefined): Promise<I18n> {
  const code = lang && lang in LANGUAGES ? lang : DEFAULT_LANGUAGE;
  if (code === DEFAULT_LANGUAGE) return EN;

  try {
    const dictionary = (await import(`./i18n/${code}.json`)).default as I18n;
    return { ...EN, ...dictionary };
  } catch {
    return EN;
  }
}

/** Build a translate function over a dictionary. Mirrors upstream `translate()`. */
export function makeTranslator(dictionary: I18n) {
  return (key: string, fallback?: string): string => dictionary[key] ?? fallback ?? key;
}

export function textDirection(lang: string | null | undefined): 'ltr' | 'rtl' {
  return LANGUAGES[lang ?? DEFAULT_LANGUAGE]?.dir ?? 'ltr';
}
