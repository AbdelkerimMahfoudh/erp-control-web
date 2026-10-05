import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { LANGUAGES, LANGUAGE_LABELS, useI18n, type Language } from '../i18n';
import { useTheme } from '../theme/theme';

/** The frame around every page: brand, navigation, language and theme, footer links. */
export function Chrome({ children }: { children: ReactNode }) {
  const { t, lang, setLanguage } = useI18n();
  const { theme, setTheme } = useTheme();
  return (
    <>
      <header className="chrome-header">
        <div className="container chrome-bar">
          <Link to="/" className="brand">
            <span className="brand-mark" aria-hidden="true">
              E
            </span>
            {t('brand.name')}
          </Link>
          <nav className="nav" aria-label="main">
            <NavLink to="/" end>
              {t('nav.home')}
            </NavLink>
            <NavLink to="/apply">{t('nav.apply')}</NavLink>
            <NavLink to="/account">{t('nav.account')}</NavLink>
            <NavLink to="/admin">{t('nav.admin')}</NavLink>
          </nav>
          <div className="controls">
            <label className="sr-only" htmlFor="lang">
              {t('language.label')}
            </label>
            <select id="lang" className="compact" value={lang} onChange={(e) => setLanguage(e.target.value as Language)}>
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {LANGUAGE_LABELS[l]}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="theme">
              {t('theme.label')}
            </label>
            <select id="theme" className="compact" value={theme} onChange={(e) => setTheme(e.target.value === 'dark' ? 'dark' : 'light')}>
              <option value="light">{t('theme.light')}</option>
              <option value="dark">{t('theme.dark')}</option>
            </select>
          </div>
        </div>
      </header>
      <main className="container">{children}</main>
      <footer className="chrome-footer">
        <div className="container">
          <div className="links">
            <Link to="/privacy">{t('footer.privacy')}</Link>
            <Link to="/terms">{t('footer.terms')}</Link>
            <Link to="/support">{t('footer.support')}</Link>
            <Link to="/account-deletion">{t('footer.deletion')}</Link>
          </div>
          <div>{t('footer.note')}</div>
        </div>
      </footer>
    </>
  );
}
