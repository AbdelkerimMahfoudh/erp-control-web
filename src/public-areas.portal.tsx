/**
 * `public-areas.tsx` as a portal build has it (`VITE_SITE_SURFACE=portal`, `vite.config.ts`, docs/101): the Dukan ERP
 * portal publishes none of the company site's pages. Its root is the Owner's page, and any other address it does not
 * know is the portal's own "Page not found", in the portal's frame and the reader's language.
 *
 * Except the Dukan ERP legal and support texts (owner, 2026-11-05): the approved versions live here, at the same
 * addresses the mobile app opens them (`/in-app/<page>`, `/fr/in-app/…`, `/ar/in-app/…`), in the app's frame — no
 * navigation into the company site, nothing to buy, every link among these pages. The portal's footer leads to them,
 * never to the company site's pre-launch texts.
 */
import type { ComponentType } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { InAppChrome } from './components/Chrome';
import { PortalChrome } from './components/PortalChrome';
import { PageHead } from './components/public/blocks';
import { I18nProvider, useI18n } from './i18n';
import { AccountDeletion, LegalNotice, Privacy, PrivacyChoices, Security, Support, Terms } from './pages/public/Legal';
import { NotFound } from './pages/public/NotFound';
import { PortalNotFound } from './pages/portal/PortalNotFound';
import { metaFor } from './site/meta';
import { inAppRouteAt, isInAppPath, PORTAL_HOME, splitLanguage, type PublicRouteId } from './site/routes';

const LEGAL_PAGES: Partial<Record<PublicRouteId, ComponentType>> = {
  support: Support,
  privacy: Privacy,
  privacyChoices: PrivacyChoices,
  terms: Terms,
  accountDeletion: AccountDeletion,
  security: Security,
  legalNotice: LegalNotice,
};

export function PublicAreas() {
  const { pathname } = useLocation();
  if (pathname === '/') return <Navigate to={PORTAL_HOME} replace />;
  const { lang } = splitLanguage(pathname);
  const inApp = inAppRouteAt(pathname);
  const Page = inApp ? LEGAL_PAGES[inApp.route.id] : undefined;
  if (inApp && Page) {
    return (
      <I18nProvider fixed={lang}>
        <InAppChrome id={inApp.route.id}>
          <LegalPage id={inApp.route.id} Page={Page} />
        </InAppChrome>
      </I18nProvider>
    );
  }
  if (isInAppPath(pathname)) {
    return (
      <I18nProvider fixed={lang}>
        <InAppChrome>
          <NotFound />
        </InAppChrome>
      </I18nProvider>
    );
  }
  return (
    <PortalChrome>
      <PortalNotFound />
    </PortalChrome>
  );
}

function LegalPage({ id, Page }: { id: PublicRouteId; Page: ComponentType }) {
  const { lang } = useI18n();
  const meta = metaFor(id, lang);
  return (
    <>
      <PageHead id={id} title={meta.title} description={meta.description} />
      <Page />
    </>
  );
}
