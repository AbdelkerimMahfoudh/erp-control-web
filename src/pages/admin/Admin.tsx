import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import type { AdminIdentity } from '../../api/types';
import { adminMe, adminSignIn, adminSignOut } from '../../auth/admin';
import { isUnauthorized } from '../../auth/owner';
import { ErrorNotice, Field, Loading, Notice } from '../../components/ui';
import { useI18n } from '../../i18n';
import { Dashboard } from './Dashboard';
import { Pending } from './Pending';
import { Businesses } from './Businesses';
import { Business } from './Business';
import { SeatRequests } from './SeatRequests';
import { Audit } from './Audit';
import { Plans } from './Plans';

type Session = { kind: 'checking' } | { kind: 'anonymous' } | { kind: 'signed'; admin: AdminIdentity };

/**
 * The platform administrators' console (docs/68 §4). A separate realm: the
 * session is an HttpOnly cookie the API set, every decision re-asks for the
 * password, and nothing here reads a shop's sales, stock or customers.
 */
export function Admin() {
  const { t } = useI18n();
  const [session, setSession] = useState<Session>({ kind: 'checking' });

  const check = useCallback(async () => {
    try {
      setSession({ kind: 'signed', admin: await adminMe() });
    } catch (e) {
      if (isUnauthorized(e)) setSession({ kind: 'anonymous' });
      else setSession({ kind: 'anonymous' });
    }
  }, []);
  useEffect(() => {
    void check();
  }, [check]);

  if (session.kind === 'checking') return <Loading />;
  if (session.kind === 'anonymous') return <SignIn onSigned={check} />;

  return (
    <div className="stack">
      <div className="row spread">
        <nav className="nav" aria-label="platform">
          <NavLink to="/admin" end>
            {t('admin.nav.dashboard')}
          </NavLink>
          <NavLink to="/admin/pending">{t('admin.nav.pending')}</NavLink>
          <NavLink to="/admin/businesses">{t('admin.nav.businesses')}</NavLink>
          <NavLink to="/admin/seat-requests">{t('admin.nav.seats')}</NavLink>
          <NavLink to="/admin/audit">{t('admin.nav.audit')}</NavLink>
          <NavLink to="/admin/plans">{t('admin.nav.plans')}</NavLink>
        </nav>
        <div className="row">
          <span className="muted small">{session.admin.email}</span>
          <button
            type="button"
            className="btn btn-sm"
            onClick={async () => {
              await adminSignOut();
              setSession({ kind: 'anonymous' });
            }}
          >
            {t('action.signOut')}
          </button>
        </div>
      </div>
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="pending" element={<Pending />} />
        <Route path="businesses" element={<Businesses />} />
        <Route path="businesses/:id" element={<Business />} />
        <Route path="seat-requests" element={<SeatRequests />} />
        <Route path="audit" element={<Audit />} />
        <Route path="plans" element={<Plans />} />
      </Routes>
    </div>
  );
}

function SignIn({ onSigned }: { onSigned: () => Promise<void> }) {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFailed(false);
    setError(null);
    try {
      await adminSignIn(email.trim(), password);
      await onSigned();
    } catch (err) {
      if (isUnauthorized(err)) setFailed(true);
      else setError(err);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="stack">
      <section className="hero">
        <h1>{t('admin.title')}</h1>
        <p className="lead">{t('admin.signin.lead')}</p>
      </section>
      <form className="card stack" onSubmit={submit}>
        <Field label={t('admin.email')}>
          <input required type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
        </Field>
        <Field label={t('admin.password')}>
          <input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {failed ? <Notice tone="danger">{t('admin.signin.failed')}</Notice> : null}
        <ErrorNotice error={error} />
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {t('action.signIn')}
        </button>
      </form>
    </div>
  );
}
