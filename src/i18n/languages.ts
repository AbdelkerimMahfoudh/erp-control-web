/** The three languages, and which one reads right to left — React-free, for the routes, the build and the tests. */
export type Language = 'en' | 'fr' | 'ar';
export const LANGUAGES: readonly Language[] = ['en', 'fr', 'ar'];
/** Each language named in its own words, never translated. */
export const LANGUAGE_LABELS: Record<Language, string> = { en: 'English', fr: 'Français', ar: 'العربية' };
/** The `hreflang` / Open Graph locale of each. */
export const LANGUAGE_LOCALE: Record<Language, string> = { en: 'en', fr: 'fr', ar: 'ar' };
export const OG_LOCALE: Record<Language, string> = { en: 'en_US', fr: 'fr_FR', ar: 'ar_AR' };

const RTL: ReadonlySet<Language> = new Set<Language>(['ar']);

export function isRtl(lang: Language): boolean {
  return RTL.has(lang);
}

export function isLanguage(v: unknown): v is Language {
  return v === 'en' || v === 'fr' || v === 'ar';
}
