import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { isUnauthorized } from '../../api/client';
import type { AdminIdentity } from '../../api/types';
import { adminEnrolConfirm, adminEnrolStart, adminMe, adminSignIn, adminSignOut, adminVerify, type AdminMfaState } from '../../auth/admin';
import { ErrorNotice, Field, Loading, Notice } from '../../components/ui';
import { useI18n } from '../../i18n';
import { Dashboard } from './Dashboard';
import { Pending } from './Pending';
import { Businesses } from './Businesses';
import { NewBusiness } from './NewBusiness';
import { Business } from './Business';
import { SeatRequests } from './SeatRequests';
import { Audit } from './Audit';
import { Grace } from './Grace';
import { Messages } from './Messages';
import { TrialClaims } from './TrialClaims';
import { Plans } from './Plans';
import { Promoters } from './Promoters';
import { Promoter } from './Promoter';
import { RegistrationSources } from './RegistrationSources';

type Session =
  | { kind: 'checking' }
  | { kind: 'anonymous' }
  /** A password was accepted; the session is pending until its second factor (0094). */
  | { kind: 'second'; mfa: AdminMfaState }
  | { kind: 'signed'; admin: AdminIdentity };

/**
 * The platform administrators' console (docs/68 §4). A separate realm: the
 * session is an HttpOnly cookie the API set, a password opens nothing without a
 * code from the administrator's authenticator (0094), every decision re-asks for
 * the password and a code, and nothing here reads a shop's sales, stock or
 * customers.
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
  if (session.kind === 'anonymous') return <SignIn onSigned={(mfa) => setSession({ kind: 'second', mfa })} />;
  if (session.kind === 'second') {
    const abandon = async () => {
      await adminSignOut().catch(() => undefined);
      setSession({ kind: 'anonymous' });
    };
    return session.mfa === 'required' ? <SecondFactor onDone={check} onCancel={abandon} /> : <Enrol onDone={check} onCancel={abandon} />;
  }

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
          <NavLink to="/admin/trials">{t('admin.trial.nav')}</NavLink>
          <NavLink to="/admin/grace">{t('admin.nav.grace')}</NavLink>
          <NavLink to="/admin/messages">{t('admin.nav.messages')}</NavLink>
          <NavLink to="/admin/audit">{t('admin.nav.audit')}</NavLink>
          <NavLink to="/admin/plans">{t('admin.nav.plans')}</NavLink>
          <NavLink to="/admin/promoters">{t('admin.nav.promoters')}</NavLink>
          <NavLink to="/admin/sources">{t('admin.nav.sources')}</NavLink>
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
        <Route path="businesses/new" element={<NewBusiness />} />
        <Route path="businesses/:id" element={<Business />} />
        <Route path="seat-requests" element={<SeatRequests />} />
        <Route path="trials" element={<TrialClaims />} />
        <Route path="grace" element={<Grace />} />
        <Route path="messages" element={<Messages />} />
        <Route path="audit" element={<Audit />} />
        <Route path="plans" element={<Plans />} />
        <Route path="promoters" element={<Promoters />} />
        <Route path="promoters/:id" element={<Promoter />} />
        <Route path="sources" element={<RegistrationSources />} />
      </Routes>
    </div>
  );
}

function SignIn({ onSigned }: { onSigned: (mfa: AdminMfaState) => void }) {
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
      const { mfa } = await adminSignIn(email.trim(), password);
      onSigned(mfa);
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

/** Six digits from the authenticator — or, with the phone lost, one recovery code. */
function SecondFactor({ onDone, onCancel }: { onDone: () => Promise<void>; onCancel: () => Promise<void> }) {
  const { t } = useI18n();
  const [recovery, setRecovery] = useState(false);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await adminVerify(recovery ? { recoveryCode: value.trim() } : { code: value });
      await onDone();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="stack">
      <section className="hero">
        <h1>{t('admin.mfa.title')}</h1>
        <p className="lead">{recovery ? t('admin.mfa.recovery.lead') : t('admin.mfa.lead')}</p>
      </section>
      <form className="card stack" onSubmit={submit}>
        <Field label={recovery ? t('admin.mfa.recoveryCode') : t('admin.mfa.code')}>
          {recovery ? (
            <input required autoComplete="off" value={value} onChange={(e) => setValue(e.target.value)} dir="ltr" autoFocus />
          ) : (
            <input
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              value={value}
              onChange={(e) => setValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
              dir="ltr"
              autoFocus
            />
          )}
        </Field>
        <ErrorNotice error={error} />
        <div className="row">
          <button type="submit" className="btn btn-primary" disabled={busy || (!recovery && value.length !== 6)}>
            {t('admin.mfa.verify')}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setRecovery(!recovery);
              setValue('');
              setError(null);
            }}
          >
            {recovery ? t('admin.mfa.useCode') : t('admin.mfa.useRecovery')}
          </button>
          <button type="button" className="btn" onClick={() => void onCancel()}>
            {t('action.signOut')}
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * First enrolment, or after a reset on the server: the one-time token from the server → the key for the
 * authenticator (typed, or opened as an otpauth link) → its first code → the recovery codes, shown once.
 */
function Enrol({ onDone, onCancel }: { onDone: () => Promise<void>; onCancel: () => Promise<void> }) {
  const { t } = useI18n();
  const [token, setToken] = useState('');
  const [key, setKey] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [code, setCode] = useState('');
  const [codes, setCodes] = useState<string[] | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const run = async (step: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await step();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };
  const start = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => setKey(await adminEnrolStart(token.trim())));
  };
  const confirm = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => setCodes((await adminEnrolConfirm(code)).recoveryCodes));
  };

  if (codes) {
    return (
      <div className="stack">
        <section className="hero">
          <h1>{t('admin.mfa.recovery.title')}</h1>
          <p className="lead">{t('admin.mfa.recovery.saveLead')}</p>
        </section>
        <div className="card stack">
          <ol className="stack" dir="ltr" aria-label={t('admin.mfa.recovery.title')}>
            {codes.map((c) => (
              <li key={c}>
                <code>{c}</code>
              </li>
            ))}
          </ol>
          <label className="row">
            <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
            {t('admin.mfa.recovery.saved')}
          </label>
          <button type="button" className="btn btn-primary" disabled={!saved} onClick={() => void onDone()}>
            {t('admin.mfa.continue')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <section className="hero">
        <h1>{t('admin.mfa.enrol.title')}</h1>
        <p className="lead">{t('admin.mfa.enrol.lead')}</p>
      </section>
      {!key ? (
        <form className="card stack" onSubmit={start}>
          <Field label={t('admin.mfa.enrol.token')}>
            <input required autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} dir="ltr" autoFocus />
          </Field>
          <p className="muted small">{t('admin.mfa.enrol.tokenHint')}</p>
          <ErrorNotice error={error} />
          <div className="row">
            <button type="submit" className="btn btn-primary" disabled={busy || token.trim().length < 16}>
              {t('admin.mfa.enrol.start')}
            </button>
            <button type="button" className="btn" onClick={() => void onCancel()}>
              {t('action.signOut')}
            </button>
          </div>
        </form>
      ) : (
        <form className="card stack" onSubmit={confirm}>
          <p>{t('admin.mfa.enrol.keyLead')}</p>
          <p dir="ltr">
            <code aria-label={t('admin.mfa.enrol.key')}>{key.secret.replace(/(.{4})/g, '$1 ').trim()}</code>
          </p>
          <p>
            <a href={key.otpauthUri}>{t('admin.mfa.enrol.open')}</a>
          </p>
          <Field label={t('admin.mfa.code')}>
            <input
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              dir="ltr"
            />
          </Field>
          <ErrorNotice error={error} />
          <button type="submit" className="btn btn-primary" disabled={busy || code.length !== 6}>
            {t('admin.mfa.enrol.confirm')}
          </button>
        </form>
      )}
    </div>
  );
}
