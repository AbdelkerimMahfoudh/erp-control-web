import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SITE, SURFACE } from '../config/site';
import { useI18n } from '../i18n';
import { inAppPathOf, pathOf, PORTAL_HOME, type PublicRouteId } from '../site/routes';
import { LanguageSwitch, ThemeToggle } from './controls';
import { PreviewBanner, ProductMark } from './public/blocks';

/**
 * A help or legal page, from the portal's or the console's footer. A portal build has the approved Dukan ERP texts on its
 * own origin, at the in-app addresses (owner, 2026-11-05) — never the company site's pre-launch texts; the console links
 * to the company site's pages; a full build to its own.
 */
export function PublicLink({ id, children }: { id: PublicRouteId; children: ReactNode }) {
  const { lang } = useI18n();
  const path = pathOf(id, lang);
  if (SURFACE === 'portal') {
    return (
      <Link className="related-link" to={inAppPathOf(id, lang)}>
        {children}
      </Link>
    );
  }
  if (SURFACE !== 'admin') {
    return (
      <Link className="related-link" to={path}>
        {children}
      </Link>
    );
  }
  return SITE.publicSiteOrigin ? (
    <a className="related-link" href={`${SITE.publicSiteOrigin}${path}`}>
      {children}
    </a>
  ) : null;
}

/**
 * The frame of the signed-in areas — the Dukan ERP portal's `/subscription` and the console's `/admin` (docs/101): the
 * product, the languages and the appearance; no navigation into the company site, nothing to buy. Its footer leads to
 * the help and legal pages, on this origin for the portal (the approved texts), on the company site for the console.
 */
export function PortalChrome({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const pathname = useLocation().pathname;
  const admin = SURFACE === 'admin' || pathname.startsWith('/admin');
  return (
    <>
      <a className="skip-link" href="#main">
        {t('skip.toMain')}
      </a>
      <PreviewBanner />
      <header className="chrome-header in-app-header portal-header">
        <div className="container chrome-bar">
          <Link to={admin ? '/admin' : PORTAL_HOME} className="brand" aria-label={t(admin ? 'portal.home.admin' : 'portal.home')}>
            <ProductMark />
          </Link>
          <div className="controls">
            <LanguageSwitch />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main id="main" className="container" tabIndex={-1}>
        {children}
      </main>
      <footer className="chrome-footer in-app-footer">
        <div className="container">
          <nav aria-label={t('legal.related')}>
            <ul className="legal-links" role="list">
              {(
                [
                  ['support', t('footer.support')],
                  ['privacy', t('footer.privacy')],
                  ['privacyChoices', t('footer.privacyChoices')],
                  ['terms', t('footer.terms')],
                  ['accountDeletion', t('footer.deletion')],
                  ['security', t('footer.security')],
                  ['legalNotice', t('footer.legalNotice')],
                ] as [PublicRouteId, string][]
              ).map(([id, label]) => (
                <li key={id}>
                  <PublicLink id={id}>{label}</PublicLink>
                </li>
              ))}
            </ul>
          </nav>
          <p className="small">{t('portal.footer.operator', { name: SITE.displayName })}</p>
          <p className="small">{t('footer.rights', { year: String(new Date().getFullYear()), name: SITE.displayName })}</p>
        </div>
      </footer>
    </>
  );
}
