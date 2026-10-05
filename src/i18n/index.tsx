import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { en, type Catalogue, type Key } from './en';
import { fr } from './fr';
import { ar } from './ar';

export type Language = 'en' | 'fr' | 'ar';
export const LANGUAGES: readonly Language[] = ['en', 'fr', 'ar'];
/** Each language named in its own words, never translated. */
export const LANGUAGE_LABELS: Record<Language, string> = { en: 'English', fr: 'Français', ar: 'العربية' };
export const LANGUAGE_STORAGE_KEY = 'erp.web.language';
const CATALOGUES: Record<Language, Catalogue> = { en, fr, ar };
const RTL: ReadonlySet<Language> = new Set<Language>(['ar']);

export function isRtl(lang: Language): boolean {
  return RTL.has(lang);
}

export function translate(lang: Language, key: Key, values?: Record<string, string | number>): string {
  const template = CATALOGUES[lang][key] ?? en[key] ?? key;
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (m, name: string) => (name in values ? String(values[name]) : m));
}

function readStored(): Language | null {
  try {
    const v = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return v === 'en' || v === 'fr' || v === 'ar' ? v : null;
  } catch {
    return null;
  }
}

function deviceLanguage(): Language {
  const tags = typeof navigator !== 'undefined' ? navigator.languages ?? [navigator.language] : [];
  for (const tag of tags) {
    const code = tag.toLowerCase().slice(0, 2);
    if (code === 'ar' || code === 'fr' || code === 'en') return code;
  }
  return 'en';
}

/**
 * Direction is set on the document, so every row, margin and scrollbar flips
 * at once — the browser does this properly and without a reload.
 */
export function applyDocumentLanguage(lang: Language): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = lang;
  document.documentElement.dir = isRtl(lang) ? 'rtl' : 'ltr';
}

interface I18n {
  lang: Language;
  rtl: boolean;
  t: (key: Key, values?: Record<string, string | number>) => string;
  setLanguage: (lang: Language) => void;
}

const Ctx = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>(() => readStored() ?? deviceLanguage());
  useEffect(() => applyDocumentLanguage(lang), [lang]);
  const setLanguage = useCallback((next: Language) => {
    setLang(next);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    } catch {
      /* a private window may refuse; the choice simply lasts the visit */
    }
  }, []);
  const value = useMemo<I18n>(
    () => ({ lang, rtl: isRtl(lang), t: (key, values) => translate(lang, key, values), setLanguage }),
    [lang, setLanguage],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const v = useContext(Ctx);
  if (!v) throw new Error('useI18n outside I18nProvider');
  return v;
}

export type { Key };
