/**
 * The protected areas' routes: `/account` for a business Owner, `/admin` for a platform administrator (docs/38,
 * docs/74 §2). Its own module so a public build (`VITE_SITE_SURFACE=public`, docs/95) can replace it with
 * `protected-areas.public.tsx` at build time (`vite.config.ts`): neither area's code then reaches that bundle.
 */
import { Route, Routes } from 'react-router-dom';
import { Account } from './pages/account/Account';
import { Admin } from './pages/admin/Admin';

export const PROTECTED_AREAS_BUILT = true;

export function ProtectedRoutes() {
  return (
    <Routes>
      <Route path="/account/*" element={<Account />} />
      <Route path="/admin/*" element={<Admin />} />
    </Routes>
  );
}
