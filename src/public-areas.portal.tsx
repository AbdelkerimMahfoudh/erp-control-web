/**
 * `public-areas.tsx` as a portal build has it (`VITE_SITE_SURFACE=portal`, `vite.config.ts`, docs/101): the Dukan ERP
 * portal publishes none of the company site's pages. Its root is the Owner's page, and any other address it does not
 * know is the portal's own "Page not found", in the portal's frame and the reader's language. Nothing here imports a
 * public page.
 */
import { Navigate, useLocation } from 'react-router-dom';
import { PortalChrome } from './components/PortalChrome';
import { PortalNotFound } from './pages/portal/PortalNotFound';
import { PORTAL_HOME } from './site/routes';

export function PublicAreas() {
  const { pathname } = useLocation();
  if (pathname === '/') return <Navigate to={PORTAL_HOME} replace />;
  return (
    <PortalChrome>
      <PortalNotFound />
    </PortalChrome>
  );
}
