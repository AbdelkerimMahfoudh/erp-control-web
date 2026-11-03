/**
 * `public-areas.tsx` as an admin build has it (`VITE_SITE_SURFACE=admin`, `vite.config.ts`): no page of the company site.
 * The root is the console, and any other address is the console's own "Page not found".
 */
import { Navigate, useLocation } from 'react-router-dom';
import { PortalChrome } from './components/PortalChrome';
import { AdminNotFound } from './pages/admin/AdminNotFound';

export function PublicAreas() {
  const { pathname } = useLocation();
  if (pathname === '/') return <Navigate to="/admin" replace />;
  return (
    <PortalChrome>
      <AdminNotFound />
    </PortalChrome>
  );
}
