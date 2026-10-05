import { Navigate, Route, Routes } from 'react-router-dom';
import { Chrome } from './components/Chrome';
import { Home } from './pages/public/Home';
import { Apply } from './pages/public/Apply';
import { AccountDeletion, Privacy, Support, Terms } from './pages/public/Legal';
import { Account } from './pages/account/Account';
import { Admin } from './pages/admin/Admin';

/**
 * Three areas, structurally apart (docs/38): `/` for anybody, `/account` for a
 * business Owner on their tenant session, `/admin` for a platform administrator
 * on a separate realm. An Owner arriving at `/admin` carries nothing the
 * administrator guard will even look at.
 */
export function App() {
  return (
    <Chrome>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/apply" element={<Apply />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/support" element={<Support />} />
        <Route path="/account-deletion" element={<AccountDeletion />} />
        <Route path="/account/*" element={<Account />} />
        <Route path="/admin/*" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Chrome>
  );
}
