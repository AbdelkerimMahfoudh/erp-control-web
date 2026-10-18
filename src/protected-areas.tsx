/**
 * The protected areas' routes: `/subscription` for a business Owner on the Dukan ERP portal, `/admin` for a platform
 * administrator (docs/38, docs/74 §2, docs/101). The Owner's page's old address (`/account`, `/account/trial`) leads to
 * `/subscription`. Its own module so a public build (`VITE_SITE_SURFACE=public`, docs/95) can replace it with
 * `protected-areas.public.tsx` at build time (`vite.config.ts`): neither area's code then reaches that bundle.
 */
import { Navigate, Route, Routes } from 'react-router-dom';
import { Subscription } from './pages/portal/Subscription';
import { Admin } from './pages/admin/Admin';
import { PORTAL_HOME } from './site/routes';

export const PROTECTED_AREAS_BUILT = true;

export function ProtectedRoutes() {
  return (
    <Routes>
      <Route path={`${PORTAL_HOME}/*`} element={<Subscription />} />
      <Route path="/account/*" element={<Navigate to={PORTAL_HOME} replace />} />
      <Route path="/admin/*" element={<Admin />} />
    </Routes>
  );
}
