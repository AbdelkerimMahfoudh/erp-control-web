import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PortalChrome } from './components/PortalChrome';
import { RouteScroll } from './components/RouteScroll';
import { SITE } from './config/site';
import { useI18n } from './i18n';
import { PROTECTED_AREAS_BUILT, ProtectedRoutes } from './protected-areas';
import { PublicAreas } from './public-areas';
import { applyProtectedHead } from './site/head';
import { isProtectedPath, JOIN_PATH } from './site/routes';

/**
 * Two areas, structurally apart (docs/38, docs/74 §2, docs/101): the company site's public pages (`public-areas.tsx`)
 * and the protected areas — `/subscription`, the Dukan ERP portal's page for a business Owner on their own portal
 * session, and `/admin` for a platform administrator on a separate realm — never prerendered and never indexed. An
 * Owner arriving at `/admin` carries nothing the administrator guard will even look at. A public page starts where
 * `RouteScroll` puts it.
 *
 * Each build publishes what its surface holds (`vite.config.ts`): a public build no protected area, a portal build no
 * public page.
 */
export function App() {
  return (
    <>
      <RouteScroll />
      <Areas />
    </>
  );
}

function Areas() {
  const { pathname } = useLocation();
  // A public build has no protected area: those addresses are unknown pages here (`protected-areas.public.tsx`).
  if (PROTECTED_AREAS_BUILT && isProtectedPath(pathname)) return <ProtectedArea />;
  return <PublicAreas />;
}

function ProtectedArea() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const admin = pathname.startsWith('/admin');
  const join = pathname === JOIN_PATH;
  useEffect(() => {
    applyProtectedHead(admin ? t('page.protected.admin', { name: SITE.displayName }) : join ? t('page.join.title') : t('page.protected.subscription'));
  }, [admin, join, t]);
  return (
    <PortalChrome>
      <ProtectedRoutes />
    </PortalChrome>
  );
}
