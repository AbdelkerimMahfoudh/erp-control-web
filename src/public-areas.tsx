/**
 * The company site's pages (docs/74 §2): every public page in three languages, the language in the address, and the
 * legal and support pages as the mobile app opens them (`/in-app/…`). Its own module so a portal build
 * (`VITE_SITE_SURFACE=portal`, docs/101) can replace it with `public-areas.portal.tsx` at build time
 * (`vite.config.ts`): none of these pages, and no link into them, then reaches the portal's bundle.
 */
import { useEffect, useRef, type ComponentType } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Chrome, InAppChrome } from './components/Chrome';
import { type ArrivalState } from './components/RouteScroll';
import { PageHead } from './components/public/blocks';
import { SURFACE } from './config/site';
import { I18nProvider, readStoredLanguage, useI18n } from './i18n';
import { LANGUAGES } from './i18n/languages';
import { Home } from './pages/public/Home';
import { Services } from './pages/public/Services';
import { DukanErp } from './pages/public/DukanErp';
import { Apply } from './pages/public/Apply';
import { About, AccountDeletion, ApplicationStatus, Contact, LegalNotice, Login, Privacy, PrivacyChoices, Products, Security, Support, Terms } from './pages/public/Legal';
import { NotFound } from './pages/public/NotFound';
import { metaFor } from './site/meta';
import { inAppRouteAt, isInAppPath, localizedPath, publicRoutesFor, splitLanguage, type PublicRouteId } from './site/routes';

/** The public pages this build publishes: a public build (docs/95) has none that needs the API. */
const ROUTES = publicRoutesFor(SURFACE);

const PAGES: Record<PublicRouteId, ComponentType> = {
  home: Home,
  services: Services,
  about: About,
  products: Products,
  dukanErp: DukanErp,
  contact: Contact,
  support: Support,
  privacy: Privacy,
  terms: Terms,
  accountDeletion: AccountDeletion,
  privacyChoices: PrivacyChoices,
  legalNotice: LegalNotice,
  security: Security,
  apply: Apply,
  applicationStatus: ApplicationStatus,
  login: Login,
};

export function PublicAreas() {
  const { pathname } = useLocation();
  const { lang } = splitLanguage(pathname);
  const inApp = inAppRouteAt(pathname);
  if (inApp) {
    return (
      <I18nProvider fixed={lang}>
        <InAppChrome id={inApp.route.id}>
          <PublicPage id={inApp.route.id} />
        </InAppChrome>
      </I18nProvider>
    );
  }
  // An unknown address among the app's pages keeps their frame: the help and legal pages, nothing that leads to buying.
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
    <I18nProvider fixed={lang}>
      <PreferredLanguage />
      <Chrome>
        <Routes>
          {LANGUAGES.flatMap((l) =>
            ROUTES.map((r) => <Route key={`${l}${r.path}`} path={localizedPath(l, r.path)} element={<PublicPage id={r.id} />} />),
          )}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Chrome>
    </I18nProvider>
  );
}

function PublicPage({ id }: { id: PublicRouteId }) {
  const { lang } = useI18n();
  const Page = PAGES[id];
  const meta = metaFor(id, lang);
  return (
    <>
      <PageHead id={id} title={meta.title} description={meta.description} />
      <Page />
    </>
  );
}

/**
 * Someone who chose French or Arabic before, landing on an English address, is taken to the same page in their
 * language — once, on arrival; a crawler has no stored choice and always reads the address it asked for.
 */
function PreferredLanguage() {
  const { pathname, search, hash } = useLocation();
  const navigate = useNavigate();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const { lang, path } = splitLanguage(pathname);
    const stored = readStoredLanguage();
    if (lang === 'en' && stored && stored !== 'en' && ROUTES.some((r) => r.path === path)) {
      // The section and query asked for come along; the page stays where the reader arrived (`RouteScroll`).
      const arrival: ArrivalState = { arrival: true };
      navigate(localizedPath(stored, path) + search + hash, { replace: true, state: arrival });
    }
  }, [pathname, search, hash, navigate]);
  return null;
}
