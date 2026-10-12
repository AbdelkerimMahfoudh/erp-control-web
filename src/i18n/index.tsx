import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { en, type Catalogue, type Key } from './en';
import { fr } from './fr';
import { ar } from './ar';
import { isLanguage, isRtl, LANGUAGE_LABELS, LANGUAGES, type Language } from './languages';

export { isRtl, LANGUAGE_LABELS, LANGUAGES, type Language };
export const LANGUAGE_STORAGE_KEY = 'erp.web.language';
const CATALOGUES: Record<Language, Catalogue> = { en, fr, ar };

export function translate(lang: Language, key: Key, values?: Record<string, string | number>): string {
  const template = CATALOGUES[lang][key] ?? en[key] ?? key;
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (m, name: string) => (name in values ? String(values[name]) : m));
}

export function readStoredLanguage(): Language | null {
  try {
    const v = typeof localStorage === 'undefined' ? null : localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isLanguage(v) ? v : null;
  } catch {
    return null;
  }
}

export function storeLanguage(lang: Language): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    /* a private window may refuse; the choice simply lasts the visit */
  }
}

function deviceLanguage(): Language {
  const tags = typeof navigator !== 'undefined' ? navigator.languages ?? [navigator.language] : [];
  for (const tag of tags) {
    const code = tag.toLowerCase().slice(0, 2);
    if (isLanguage(code)) return code;
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
  /** The remembered choice — a public page also moves to the address of that language (Chrome). */
  setLanguage: (lang: Language) => void;
  /** A nested page fixed by its address tells the provider around it, so both set the same document language. */
  follow: (lang: Language) => void;
}

const Ctx = createContext<I18n | null>(null);

/**
 * `fixed` is the language of the address (a public page under `/fr` is French whatever was chosen before); without
 * it — the account and console areas — the remembered choice, then the device's, applies. A fixed provider inside
 * another makes the outer one follow it: React runs the outer provider's effects last, and both write the document.
 */
export function I18nProvider({ children, fixed }: { children: ReactNode; fixed?: Language }) {
  const parent = useContext(Ctx);
  const [chosen, setChosen] = useState<Language>(() => fixed ?? readStoredLanguage() ?? deviceLanguage());
  const [followed, setFollowed] = useState<Language | null>(null);
  const lang = fixed ?? followed ?? chosen;
  const parentFollow = parent?.follow;
  useEffect(() => {
    if (fixed && parentFollow) parentFollow(fixed);
  }, [fixed, parentFollow]);
  useEffect(() => applyDocumentLanguage(lang), [lang]);
  const setLanguage = useCallback((next: Language) => {
    setFollowed(null);
    setChosen(next);
    storeLanguage(next);
  }, []);
  const follow = useCallback((next: Language) => setFollowed(next), []);
  const value = useMemo<I18n>(
    () => ({ lang, rtl: isRtl(lang), t: (key, values) => translate(lang, key, values), setLanguage, follow }),
    [lang, setLanguage, follow],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const v = useContext(Ctx);
  if (!v) throw new Error('useI18n outside I18nProvider');
  return v;
}

export type { Key };
