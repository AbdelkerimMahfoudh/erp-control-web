import { useEffect, useRef, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { SITE, SURFACE } from '../config/site';
import { LANGUAGE_LABELS, LANGUAGES, storeLanguage, useI18n, type Language } from '../i18n';
import { inAppPathOf, pathOf, publicRouteAt, type PublicRouteId } from '../site/routes';
import { useTheme } from '../theme/theme';
import { InAppContext, LegalLinks, OrgMark, PreviewBanner, ProductMark } from './public/blocks';
import { AccountLink, accountHref, linkable } from './AccountLink';

/**
 * The frame around every page (docs/74 §4): the organization's identity, the public navigation, the languages and the
 * footer with the policies and the company details TSX-MR supplied. The administration area is never linked from a
 * public page (it is reached at its own address until it moves to its own origin, docs/74 §8). On a phone the
 * navigation is a disclosure that works before any script has run, so a prerendered page is navigable on its own.
 */
export function Chrome({ children, area }: { children: ReactNode; area: 'public' | 'protected' }) {
  const { t, lang } = useI18n();
  const { pathname } = useLocation();
  const menu = useRef<HTMLDetailsElement>(null);
  const to = (id: PublicRouteId) => pathOf(id, lang);

  // A navigation closes the phone menu.
  useEffect(() => {
    if (menu.current) menu.current.open = false;
  }, [pathname]);

  const links: [PublicRouteId, string][] = [
    ['dukanErp', t('nav.dukanErp')],
    ['products', t('nav.products')],
    ['about', t('nav.about')],
    ['support', t('nav.support')],
    ['contact', t('nav.contact')],
  ];
  const navList = (
    <ul>
      {links.map(([id, label]) => (
        <li key={id}>
          <NavLink to={to(id)} end>
            {label}
          </NavLink>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <a className="skip-link" href="#main">
        {t('skip.toMain')}
      </a>
      <PreviewBanner />
      <header className="chrome-header">
        <div className="container chrome-bar">
          <Link to={to('home')} className="brand" aria-label={t('brand.home', { name: SITE.displayName })}>
            <OrgMark />
          </Link>
          <nav className="nav nav-wide" aria-label={t('nav.main')}>
            {navList}
          </nav>
          <div className="controls">
            <Languages area={area} className="languages-wide" />
            {area === 'public' ? (
              <AccountLink id="login" lang={lang} className="btn btn-sm btn-primary">
                {t('nav.signIn')}
              </AccountLink>
            ) : (
              <Link className="btn btn-sm btn-primary" to="/account">
                {t('nav.signIn')}
              </Link>
            )}
            {/* On a phone: the navigation and the languages in one disclosure, so the bar stays one row. */}
            <details className="menu" ref={menu}>
              <summary className="btn btn-sm">{t('nav.menu')}</summary>
              <div className="nav-narrow">
                <nav className="nav" aria-label={t('nav.main')}>
                  {navList}
                </nav>
                <Languages area={area} className="languages-narrow" />
              </div>
            </details>
          </div>
        </div>
      </header>
      <main id="main" className="container" tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </>
  );
}

/** The current page in each language (a link, so it works without a script); the protected areas switch in place. */
function Languages({ area, className }: { area: 'public' | 'protected'; className: string }) {
  const { t, lang, setLanguage } = useI18n();
  const { pathname } = useLocation();
  const here = publicRouteAt(pathname);
  return (
    <ul className={`languages ${className}`} aria-label={t('nav.languages')}>
      {LANGUAGES.map((l: Language) => (
        <li key={l}>
          {area === 'public' ? (
            <Link
              to={pathOf(here?.route.id ?? 'home', l)}
              lang={l}
              hrefLang={l}
              aria-current={l === lang ? 'true' : undefined}
              onClick={() => storeLanguage(l)}
            >
              {LANGUAGE_LABELS[l]}
            </Link>
          ) : (
            <button type="button" className="link-button" lang={l} aria-pressed={l === lang} onClick={() => setLanguage(l)}>
              {LANGUAGE_LABELS[l]}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

function Footer() {
  const { t, lang } = useI18n();
  const { theme, setTheme } = useTheme();
  const to = (id: PublicRouteId) => pathOf(id, lang);
  const columns: [string, [PublicRouteId, string][]][] = [
    [t('footer.company'), [['about', t('nav.about')], ['contact', t('nav.contact')]]],
    [t('footer.product'), [['dukanErp', t('nav.dukanErp')], ['products', t('nav.products')], ['apply', t('nav.apply')]]],
    [t('footer.help'), [['support', t('nav.support')], ['applicationStatus', t('footer.applicationStatus')], ['accountDeletion', t('footer.deletion')]]],
    [
      t('footer.legal'),
      [
        ['privacy', t('footer.privacy')],
        ['privacyChoices', t('footer.privacyChoices')],
        ['terms', t('footer.terms')],
        ['security', t('footer.security')],
        ['legalNotice', t('footer.legalNotice')],
      ],
    ],
  ];
  const identity = [SITE.legalName, SITE.legalForm, SITE.registrationNumber].filter(Boolean).join(' · ');
  return (
    <footer className="chrome-footer">
      <div className="container footer-grid">
        <div className="footer-org">
          <OrgMark />
          <p>{t(SURFACE === 'public' ? 'footer.relationshipPrelaunch' : 'footer.relationship', { name: SITE.displayName })}</p>
          {identity ? (
            <p className="small">
              <bdi>{identity}</bdi>
            </p>
          ) : null}
          <p className="small muted">{t('footer.note')}</p>
        </div>
        {columns.map(([title, items]) => (
          <nav key={title} className="footer-col" aria-label={title}>
            <h2 className="footer-title">{title}</h2>
            <ul>
              {items
                .filter(([id]) => linkable(id, lang))
                .map(([id, label]) => {
                  const account = id === 'apply' || id === 'login' || id === 'applicationStatus' ? accountHref(id, lang) : null;
                  return (
                    <li key={id}>{account && 'href' in account ? <a href={account.href}>{label}</a> : <Link to={to(id)}>{label}</Link>}</li>
                  );
                })}
            </ul>
          </nav>
        ))}
      </div>
      <div className="container footer-bottom">
        <span>{t('footer.rights', { year: String(new Date().getFullYear()), name: SITE.displayName })}</span>
        <label className="theme-choice">
          <span>{t('theme.label')}</span>
          <select className="compact" value={theme} onChange={(e) => setTheme(e.target.value === 'dark' ? 'dark' : 'light')}>
            <option value="light">{t('theme.light')}</option>
            <option value="dark">{t('theme.dark')}</option>
          </select>
        </label>
      </div>
    </footer>
  );
}

/**
 * The frame of the pages the mobile app opens (`/in-app/…`): the product, the page in the three languages, the text,
 * and the other legal pages — no navigation, no sign-in, no product, pricing or application link, so nothing reached
 * from the app leads to buying access. Its links stay among the same pages.
 */
export function InAppChrome({ id, children }: { id: PublicRouteId; children: ReactNode }) {
  const { t, lang } = useI18n();
  return (
    <InAppContext.Provider value={true}>
      <a className="skip-link" href="#main">
        {t('skip.toMain')}
      </a>
      <PreviewBanner />
      <header className="chrome-header in-app-header">
        <div className="container chrome-bar">
          <ProductMark />
          <ul className="languages" aria-label={t('nav.languages')}>
            {LANGUAGES.map((l) => (
              <li key={l}>
                <Link to={inAppPathOf(id, l)} lang={l} hrefLang={l} aria-current={l === lang ? 'true' : undefined} onClick={() => storeLanguage(l)}>
                  {LANGUAGE_LABELS[l]}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </header>
      <main id="main" className="container">
        {children}
      </main>
      <footer className="chrome-footer in-app-footer">
        <div className="container">
          <LegalLinks />
          <p className="small">{t('footer.rights', { year: String(new Date().getFullYear()), name: SITE.displayName })}</p>
        </div>
      </footer>
    </InAppContext.Provider>
  );
}
