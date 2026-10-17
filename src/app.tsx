import { useEffect, useRef, type ComponentType } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Chrome, InAppChrome } from './components/Chrome';
import { PageHead } from './components/public/blocks';
import { SITE } from './config/site';
import { I18nProvider, readStoredLanguage, useI18n } from './i18n';
import { LANGUAGES } from './i18n/languages';
import { Home } from './pages/public/Home';
import { DukanErp } from './pages/public/DukanErp';
import { Apply } from './pages/public/Apply';
import { About, AccountDeletion, ApplicationStatus, Contact, LegalNotice, Login, Privacy, PrivacyChoices, Products, Security, Support, Terms } from './pages/public/Legal';
import { NotFound } from './pages/public/NotFound';
import { PROTECTED_AREAS_BUILT, ProtectedRoutes } from './protected-areas';
import { metaFor } from './site/meta';
import { applyProtectedHead } from './site/head';
import { inAppRouteAt, isInAppPath, isProtectedPath, localizedPath, publicRoutesFor, splitLanguage, type PublicRouteId } from './site/routes';

/** The public pages this build publishes: a public build (docs/95) has none that needs the API. */
const ROUTES = publicRoutesFor(SITE.siteSurface === 'public' ? 'public' : 'full');

const PAGES: Record<PublicRouteId, ComponentType> = {
  home: Home,
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

/**
 * Two areas, structurally apart (docs/38, docs/74 §2): the public site — every page in three languages, the language
 * in the address — and the protected areas, `/account` for a business Owner on their tenant session and `/admin` for
 * a platform administrator on a separate realm, never prerendered and never indexed. An Owner arriving at `/admin`
 * carries nothing the administrator guard will even look at.
 */
export function App() {
  const { pathname } = useLocation();
  // A public build has no protected area: those addresses are unknown pages here (`protected-areas.public.tsx`).
  if (PROTECTED_AREAS_BUILT && isProtectedPath(pathname)) return <ProtectedArea />;
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
      <Chrome area="public">
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
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const { lang, path } = splitLanguage(pathname);
    const stored = readStoredLanguage();
    if (lang === 'en' && stored && stored !== 'en' && ROUTES.some((r) => r.path === path)) {
      navigate(localizedPath(stored, path), { replace: true });
    }
  }, [pathname, navigate]);
  return null;
}

function ProtectedArea() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const admin = pathname.startsWith('/admin');
  useEffect(() => {
    applyProtectedHead(t(admin ? 'page.protected.admin' : 'page.protected.account', { name: SITE.displayName }));
  }, [admin, t]);
  return (
    <Chrome area="protected">
      <ProtectedRoutes />
    </Chrome>
  );
}
