/**
 * `protected-areas.tsx` as a production portal build has it (D227, https://dukan.tsxmr.com, `vite.config.ts`): the Owner's
 * page and the invitation, and no console. `/admin` is an unknown page here, and nothing here imports the console, so
 * its code never reaches this bundle. The password-protected test site is a preview build and keeps the console.
 */
import { Navigate, Route, Routes } from 'react-router-dom';
import { Subscription } from './pages/portal/Subscription';
import { PortalChrome } from './components/PortalChrome';
import { PortalNotFound } from './pages/portal/PortalNotFound';
import { Join } from './pages/join/Join';
import { Claim } from './pages/portal/Claim';
import { CLAIM_PATH, JOIN_PATH, PORTAL_HOME } from './site/routes';

export const PROTECTED_AREAS_BUILT = true;

export function ProtectedRoutes() {
  return (
    <Routes>
      <Route path={`${PORTAL_HOME}/*`} element={<Subscription />} />
      <Route path="/account/*" element={<Navigate to={PORTAL_HOME} replace />} />
      <Route path={JOIN_PATH} element={<Join />} />
      <Route path={`${CLAIM_PATH}/:token`} element={<Claim />} />
      <Route
        path="*"
        element={
          <PortalChrome>
            <PortalNotFound />
          </PortalChrome>
        }
      />
    </Routes>
  );
}
