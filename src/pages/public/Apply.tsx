import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, request } from '../../api/client';
import { ErrorNotice, Field, Notice } from '../../components/ui';
import { LANGUAGES, LANGUAGE_LABELS, useI18n, type Language } from '../../i18n';

interface RegisterResponse {
  status: string;
  created: boolean;
  publicStoreId: string;
  verification: { destination: string; channel: 'email' | 'phone' } | null;
  continuation: { token: string; expiresAt: string; expiresInSeconds: number } | null;
  next: 'verify_contact' | 'sign_in';
}

type Step = { kind: 'form' } | { kind: 'verify'; response: RegisterResponse } | { kind: 'done'; response: RegisterResponse };

/**
 * The business application (docs/68 §2). Registration creates a PENDING
 * business and a continuation; the Owner proves the contact with the code that
 * went to it, and only then holds a session. Nothing is activated here — the
 * platform reviews every application.
 *
 * When the server cannot send a code it refuses before saving anything, and
 * this page says so instead of showing a code field no code would fill.
 */
export function Apply() {
  const { t, lang } = useI18n();
  const [step, setStep] = useState<Step>({ kind: 'form' });

  if (step.kind === 'verify') return <Verify response={step.response} onDone={(r) => setStep({ kind: 'done', response: r })} />;
  if (step.kind === 'done') return <Done response={step.response} />;

  return <ApplyForm lang={lang} t={t} onRegistered={(r) => setStep(r.next === 'verify_contact' && r.continuation ? { kind: 'verify', response: r } : { kind: 'done', response: r })} />;
}

function ApplyForm({ lang, t, onRegistered }: { lang: Language; t: ReturnType<typeof useI18n>['t']; onRegistered: (r: RegisterResponse) => void }) {
  const [form, setForm] = useState({ ownerName: '', businessName: '', branchName: '', city: '', email: '', phone: '', password: '', language: lang });
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [unavailable, setUnavailable] = useState(false);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.email.trim() && !form.phone.trim()) {
      setError(new ApiError(t('apply.error.contact'), 400, 'contact_required', null));
      return;
    }
    setBusy(true);
    try {
      const body = {
        idempotencyKey,
        ownerName: form.ownerName.trim(),
        businessName: form.businessName.trim(),
        branchName: form.branchName.trim(),
        ...(form.city.trim() ? { city: form.city.trim() } : {}),
        ...(form.email.trim() ? { email: form.email.trim() } : {}),
        ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
        password: form.password,
        language: form.language,
      };
      onRegistered(await request<RegisterResponse>('platform/register', { method: 'POST', body }));
    } catch (err) {
      if (err instanceof ApiError && err.status === 503 && err.code === 'registration_unavailable') setUnavailable(true);
      else setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack">
      <section className="hero">
        <h1>{t('apply.title')}</h1>
        <p className="lead">{t('apply.lead')}</p>
      </section>
      {unavailable ? (
        <Notice tone="warn" title={t('apply.unavailable.title')}>
          {t('apply.unavailable.body')}
        </Notice>
      ) : null}
      <form className="card stack" onSubmit={submit} noValidate>
        <Field label={t('apply.owner')}>
          <input required maxLength={160} autoComplete="name" value={form.ownerName} onChange={set('ownerName')} />
        </Field>
        <Field label={t('apply.business')}>
          <input required maxLength={160} autoComplete="organization" value={form.businessName} onChange={set('businessName')} />
        </Field>
        <div className="grid">
          <Field label={t('apply.branch')}>
            <input required maxLength={160} value={form.branchName} onChange={set('branchName')} />
          </Field>
          <Field label={t('apply.city')}>
            <input maxLength={120} autoComplete="address-level2" value={form.city} onChange={set('city')} />
          </Field>
        </div>
        <p className="muted small">{t('apply.contact.hint')}</p>
        <div className="grid">
          <Field label={t('apply.email')}>
            <input type="email" maxLength={160} autoComplete="email" value={form.email} onChange={set('email')} dir="ltr" />
          </Field>
          <Field label={t('apply.phone')} hint={t('apply.phone.hint')}>
            <input type="tel" maxLength={24} autoComplete="tel" value={form.phone} onChange={set('phone')} dir="ltr" />
          </Field>
        </div>
        <Field label={t('apply.password')} hint={t('apply.password.hint')}>
          <input type="password" required minLength={8} maxLength={200} autoComplete="new-password" value={form.password} onChange={set('password')} />
        </Field>
        <Field label={t('apply.language')}>
          <select value={form.language} onChange={set('language')}>
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {LANGUAGE_LABELS[l]}
              </option>
            ))}
          </select>
        </Field>
        <ErrorNotice error={error} />
        <div className="row">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? t('apply.sending') : t('apply.submit')}
          </button>
        </div>
      </form>
    </div>
  );
}

function Verify({ response, onDone }: { response: RegisterResponse; onDone: (r: RegisterResponse) => void }) {
  const { t, lang } = useI18n();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [sent, setSent] = useState<string | null>(null);
  const continuation = response.continuation!.token;

  const start = async () => {
    setError(null);
    try {
      await request('platform/register/verify/start', { method: 'POST', body: { continuation, language: lang } });
      setSent(t('apply.verify.sent'));
    } catch (e) {
      setError(e);
    }
  };

  const confirm = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await request('platform/register/verify/confirm', { method: 'POST', body: { continuation, code: code.trim() } });
      onDone(response);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 400 ? new ApiError(t('apply.verify.wrong'), 400, 'code_mismatch', null) : err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack">
      <section className="hero">
        <h1>{t('apply.verify.title')}</h1>
        <p className="lead">{t('apply.verify.body', { destination: response.verification?.destination ?? '…' })}</p>
      </section>
      <form className="card stack" onSubmit={confirm}>
        <Field label={t('apply.verify.code')}>
          <input inputMode="numeric" autoComplete="one-time-code" maxLength={12} value={code} onChange={(e) => setCode(e.target.value)} dir="ltr" />
        </Field>
        {sent ? <Notice tone="ok">{sent}</Notice> : null}
        <ErrorNotice error={error} />
        <div className="row">
          <button type="submit" className="btn btn-primary" disabled={busy || !code.trim()}>
            {t('apply.verify.submit')}
          </button>
          <button type="button" className="btn" onClick={() => void start()}>
            {t('apply.verify.resend')}
          </button>
        </div>
      </form>
    </div>
  );
}

function Done({ response }: { response: RegisterResponse }) {
  const { t } = useI18n();
  return (
    <div className="stack">
      <section className="hero">
        <h1>{t('apply.done.title')}</h1>
        <p className="lead">{t('apply.done.body')}</p>
      </section>
      <div className="card stack">
        <p>
          <strong className="ltr">{t('apply.done.storeId', { id: response.publicStoreId })}</strong>
        </p>
        <Link className="btn btn-primary" to="/account">
          {t('home.cta.account')}
        </Link>
      </div>
    </div>
  );
}
