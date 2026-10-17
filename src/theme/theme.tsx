import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Theme = 'light' | 'dark';
export const THEME_STORAGE_KEY = 'erp.web.theme';

const DARK_QUERY = '(prefers-color-scheme: dark)';

/** The visitor's own choice, if one was made on this site. */
function readStored(): Theme | null {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return v === 'dark' || v === 'light' ? v : null;
  } catch {
    return null;
  }
}

/** What the device asks for, until the visitor chooses (the 2026-10-17 refinement). */
function systemTheme(): Theme {
  try {
    return window.matchMedia?.(DARK_QUERY).matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

interface ThemeCtx {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}
const Ctx = createContext<ThemeCtx | null>(null);

/**
 * The appearance: the visitor's stored choice, otherwise the device's `prefers-color-scheme`, followed live until a
 * choice is made. The first render is always light, so the prerendered page and its hydration agree; the real value is
 * read right after. `public/theme-boot.js` applies the same rule to `data-theme` before the first paint, so neither a
 * stored nor a system dark appearance flashes light. Only an explicit choice is written to storage.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme | null>(null);
  useEffect(() => {
    setThemeState(readStored() ?? systemTheme());
    if (readStored() || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia(DARK_QUERY);
    const follow = (e: MediaQueryListEvent) => {
      if (!readStored()) setThemeState(e.matches ? 'dark' : 'light');
    };
    media.addEventListener?.('change', follow);
    return () => media.removeEventListener?.('change', follow);
  }, []);
  useEffect(() => {
    if (theme) document.documentElement.dataset.theme = theme;
  }, [theme]);
  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
  }, []);
  const current = theme ?? 'light';
  const toggleTheme = useCallback(() => setTheme(current === 'dark' ? 'light' : 'dark'), [current, setTheme]);
  const value = useMemo(() => ({ theme: current, setTheme, toggleTheme }), [current, setTheme, toggleTheme]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTheme outside ThemeProvider');
  return v;
}
