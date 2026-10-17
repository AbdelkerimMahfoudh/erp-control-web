import { useEffect, useRef, useState, type FocusEvent, type MouseEvent, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { SITE } from '../config/site';
import { LANGUAGE_CODES, LANGUAGE_LABELS, LANGUAGES, storeLanguage, useI18n, type Language } from '../i18n';
import { inAppPathOf, pathOf, publicRouteAt, type PublicRouteId } from '../site/routes';
import { useTheme } from '../theme/theme';
import { useReveal } from '../lib/reveal';
import { INDIVIDUAL_OPERATOR, InAppContext, LegalLinks, OrgMark, PreviewBanner, ProductMark } from './public/blocks';
import { AccountLink, accountHref, linkable } from './AccountLink';
import { textValues } from './public/RichText';
import { Icon } from './public/icons';

/**
 * The frame around every page (docs/74 §4): the organization's identity, the public navigation, the languages and the
 * footer with the policies and the brand in one line. The administration area is never linked from a
 * public page (it is reached at its own address until it moves to its own origin, docs/74 §8). On a phone the
 * navigation sits behind a menu button (`PhoneMenu`), which works before any script has run.
 */
export function Chrome({ children, area }: { children: ReactNode; area: 'public' | 'protected' }) {
  const { t, lang } = useI18n();
  const { pathname } = useLocation();
  const to = (id: PublicRouteId) => pathOf(id, lang);
  // The public pages' sections rise into view as the reader reaches them (lib/reveal.ts).
  useReveal(pathname);

  // What TSX-MR does for clients first, then what it owns: Services and Products stay two separate destinations.
  const links: [PublicRouteId, string][] = [
    ['services', t('nav.services')],
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
            <ThemeToggle />
            {area === 'public' ? (
              <AccountLink id="login" lang={lang} className="btn btn-sm btn-primary">
                {t('nav.signIn')}
              </AccountLink>
            ) : (
              <Link className="btn btn-sm btn-primary" to="/account">
                {t('nav.signIn')}
              </Link>
            )}
            <PhoneMenu>
              <nav className="nav" aria-label={t('nav.main')}>
                {navList}
              </nav>
              <Languages area={area} className="languages-narrow" />
            </PhoneMenu>
          </div>
        </div>
      </header>
      {/* The public pages lay out their own bands edge to edge; the protected areas keep the plain column. */}
      <main id="main" className={area === 'public' ? 'site-main' : 'container'} tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </>
  );
}

/**
 * On a phone: the navigation and the languages behind one icon button, so the bar stays one row (the 2026-10-17
 * consistency pass; it replaces the "Menu" text button). The prerendered page carries a native disclosure, so the menu
 * opens before any script has run; once the script runs it becomes a button that names its action ("Open menu" /
 * "Close menu"), states `aria-expanded` and controls the panel. The panel is not a dialog, so it traps nothing: Escape
 * closes it and returns focus to the button, as does choosing the page already open; choosing another page closes it
 * and leaves focus to that page's heading (`RouteScroll`); a press outside it or Tab past its last link closes it where
 * the reader is. While closed its links are not rendered (`hidden`), so they take no focus.
 */
function PhoneMenu({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const [enhanced, setEnhanced] = useState(false);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => setEnhanced(true), []);
  // A navigation closes the menu.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      button.current?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);
  const icons = (
    <>
      <Icon name="menu" size={22} className="menu-icon-open" />
      <Icon name="close" size={22} className="menu-icon-close" />
    </>
  );
  if (!enhanced) {
    return (
      <details className="menu">
        <summary className="icon-button menu-button" aria-label={t('nav.openMenu')}>
          {icons}
        </summary>
        <div className="nav-narrow">{children}</div>
      </details>
    );
  }
  // Choosing a destination closes the menu. Another page takes focus to its own heading; the page already open (marked
  // current, so nothing moves) returns it to the button rather than to the hidden link.
  const onChoose = (e: MouseEvent<HTMLDivElement>) => {
    const chosen = (e.target as Element).closest('a, button');
    if (!chosen) return;
    setOpen(false);
    if (chosen.tagName !== 'A' || chosen.hasAttribute('aria-current')) button.current?.focus();
  };
  const onLeave = (e: FocusEvent<HTMLDivElement>) => {
    if (e.relatedTarget && !root.current?.contains(e.relatedTarget as Node)) setOpen(false);
  };
  return (
    <div className="menu" ref={root} onBlur={onLeave}>
      <button
        ref={button}
        type="button"
        className="icon-button menu-button"
        aria-expanded={open}
        aria-controls="site-menu"
        aria-label={t(open ? 'nav.closeMenu' : 'nav.openMenu')}
        onClick={() => setOpen((o) => !o)}
      >
        {icons}
      </button>
      <div id="site-menu" className="nav-narrow" hidden={!open} onClick={onChoose}>
        {children}
      </div>
    </div>
  );
}

/** "EN, English", "FR, Français", "AR, العربية". */
const languageName = (l: Language) => `${LANGUAGE_CODES[l]}, ${LANGUAGE_LABELS[l]}`;

/**
 * The current page in each language (a link, so it works without a script); the protected areas switch in place. Each
 * shows its short code (EN, FR, AR) and is named by the code and the language in full, in that language — the visible
 * label first, so a voice command that says what it sees reaches it. The control is three equal segments
 * (`public.css` `.languages`), the same in the header, the phone menu, the app's pages and the protected areas.
 * Switching keeps the page and stores the choice; the page in the other language starts at its top (`RouteScroll`).
 */
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
              aria-label={languageName(l)}
              onClick={() => storeLanguage(l)}
            >
              {LANGUAGE_CODES[l]}
            </Link>
          ) : (
            <button type="button" className="link-button" lang={l} aria-pressed={l === lang} aria-label={languageName(l)} onClick={() => setLanguage(l)}>
              {LANGUAGE_CODES[l]}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * The appearance, one tap from every page (the 2026-10-17 refinement; it replaces the footer's select). The icon shows
 * where a press leads — a moon while light, a sun while dark — and is chosen by CSS from `data-theme`, so it is right
 * before any script runs; the name says the action, in the reader's language.
 */
function ThemeToggle() {
  const { t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const label = t(theme === 'dark' ? 'theme.toLight' : 'theme.toDark');
  return (
    <button type="button" className="icon-button theme-toggle" onClick={toggleTheme} aria-label={label} title={label}>
      <Icon name="moon" size={20} className="theme-icon-moon" />
      <Icon name="sun" size={20} className="theme-icon-sun" />
    </button>
  );
}

function Footer() {
  const { t, lang } = useI18n();
  const to = (id: PublicRouteId) => pathOf(id, lang);
  const columns: [string, [PublicRouteId, string][]][] = [
    [INDIVIDUAL_OPERATOR ? SITE.displayName : t('footer.company'), [['services', t('nav.services')], ['about', t('nav.about')], ['contact', t('nav.contact')]]],
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
  // An individual operator: the brand in one line, with no name — the legal notice says who operates it (the owner's
  // brief of 2026-10-17, fourth). A company shows its registered details.
  const identity = INDIVIDUAL_OPERATOR ? '' : [SITE.legalName, SITE.legalForm, SITE.registrationNumber].filter(Boolean).join(' · ');
  const postal = textValues(lang).postalAddress;
  return (
    <footer className="chrome-footer">
      <div className="container footer-grid">
        <div className="footer-org">
          <OrgMark />
          {INDIVIDUAL_OPERATOR ? <p>{t('footer.brand')}</p> : identity ? <p className="small"><bdi>{identity}</bdi></p> : null}
          {postal ? (
            // In the reader's language (its Arabic line in Arabic), so a sentence, not an isolated value.
            <p className="small">{t('footer.address', { address: postal })}</p>
          ) : null}
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
      </div>
    </footer>
  );
}

/**
 * The frame of the pages the mobile app opens (`/in-app/…`): the product, the page in the three languages, the text,
 * and the other legal pages — no navigation, no sign-in, no product, pricing or application link, so nothing reached
 * from the app leads to buying access. Its links stay among the same pages. Without a page (an unknown address there),
 * the languages lead to the help page in each language.
 */
export function InAppChrome({ id = 'support', children }: { id?: PublicRouteId; children: ReactNode }) {
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
          <ul className="languages languages-app" aria-label={t('nav.languages')}>
            {LANGUAGES.map((l) => (
              <li key={l}>
                <Link
                  to={inAppPathOf(id, l)}
                  lang={l}
                  hrefLang={l}
                  aria-current={l === lang ? 'true' : undefined}
                  aria-label={languageName(l)}
                  onClick={() => storeLanguage(l)}
                >
                  {LANGUAGE_CODES[l]}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </header>
      <main id="main" className="site-main in-app">
        {children}
      </main>
      <footer className="chrome-footer in-app-footer">
        <div className="container">
          <nav aria-label={t('legal.related')}>
            <LegalLinks />
          </nav>
          <p className="small">{t('footer.rights', { year: String(new Date().getFullYear()), name: SITE.displayName })}</p>
        </div>
      </footer>
    </InAppContext.Provider>
  );
}
