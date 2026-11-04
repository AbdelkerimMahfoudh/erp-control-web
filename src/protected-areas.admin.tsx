/**
 * `protected-areas.tsx` as an admin build has it (`VITE_SITE_SURFACE=admin`, `vite.config.ts`, https://admin.tsxmr.com):
 * the console and nothing of the customers'. `/subscription` and the invitation are unknown pages here, and nothing here
 * imports them, so their code never reaches this bundle.
 */
import { Route, Routes } from 'react-router-dom';
import { AdminNotFound } from './pages/admin/AdminNotFound';
import { Admin } from './pages/admin/Admin';

export const PROTECTED_AREAS_BUILT = true;
/** Whether this build holds the platform console (post-Build-4): a portal without it routes no /admin. */
export const CONSOLE_BUILT = true;

export function ProtectedRoutes() {
  return (
    <Routes>
      <Route path="/admin/*" element={<Admin />} />
      <Route path="*" element={<AdminNotFound />} />
    </Routes>
  );
}
