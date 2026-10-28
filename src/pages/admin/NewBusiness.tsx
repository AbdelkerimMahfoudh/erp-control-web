import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { Activity, CreatedBusiness } from '../../api/types';
import { adminRequest } from '../../auth/admin';
import { Field, Notice } from '../../components/ui';
import { useI18n, type Key } from '../../i18n';
import { ACTIVITY_CHOICES, ProvisioningRefusal, SetupCode, TestBadge } from './provisioning';
import { useStepUp } from './useStepUp';
import { PersonSetupCode, REQUIRED, VerificationChoice, useDeferralAvailable, verificationBody, verificationReady, type VerificationValue } from './deferral';

const EMPTY = { businessName: '', ownerName: '', phone: '', email: '', city: '', branchName: '', activity: 'electronics' as Activity, language: 'fr' as 'en' | 'fr' | 'ar', isTest: true, reason: '' };

/**
 * A business and its Owner, created by a platform administrator (D217).
 *
 * The Owner's password is nobody's but the Owner's: the business is created with one nobody knows, and the answer
 * carries a one-time setup code, shown here once, that the administrator hands over privately. The Owner's number stays
 * unverified and no consent is recorded — nothing is sent to it.
 *
 * Safe to retry: the request carries a key made once for these answers, so a second send — a double tap, a lost answer —
 * finds the business the first one made and makes no second, and no second code. Changing an answer makes a new key.
 */
export function NewBusiness() {
  const { t } = useI18n();
  const { ask, dialog } = useStepUp();
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [result, setResult] = useState<CreatedBusiness | null>(null);
  const [codeShown, setCodeShown] = useState(true);
  const [verification, setVerification] = useState<VerificationValue>(REQUIRED);
  const deferralAvailable = useDeferralAvailable();
  // Only a test business may defer (the server decides; the console offers it only where it can be asked).
  const offerDeferral = deferralAvailable && form.isTest;
  const attempt = useRef<{ key: string; payload: string } | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const payload = {
      businessName: form.businessName.trim(),
      ownerName: form.ownerName.trim(),
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      city: form.city.trim() || undefined,
      branchName: form.branchName.trim() || undefined,
      activity: form.activity,
      language: form.language,
      isTest: form.isTest,
      reason: form.reason.trim(),
      ...(offerDeferral ? verificationBody(verification) : {}),
    };
    const sent = JSON.stringify(payload);
    if (attempt.current?.payload !== sent) attempt.current = { key: crypto.randomUUID(), payload: sent };
    const confirmPassword = await ask();
    if (!confirmPassword) return;
    setBusy(true);
    try {
      const r = await adminRequest<CreatedBusiness>('platform/businesses', { method: 'POST', body: { idempotencyKey: attempt.current.key, ...payload, confirmPassword } });
      setResult(r);
      setCodeShown(true);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const again = () => {
    attempt.current = null;
    setResult(null);
    setForm(EMPTY);
    setVerification(REQUIRED);
  };

  if (result) {
    return (
      <div className="stack">
        {dialog}
        <h1>{t('admin.new.title')}</h1>
        <Notice tone={result.invitationFailed ? 'warn' : 'ok'}>
          {result.created ? t('admin.new.created') : t('admin.new.existing')}
          {result.invitationFailed ? <div>{t('admin.new.invitationFailed')}</div> : null}
        </Notice>
        {result.invitation && codeShown ? <SetupCode invitation={result.invitation} onDone={() => setCodeShown(false)} /> : null}
        {result.setupCode && codeShown ? <PersonSetupCode code={result.setupCode} name={form.ownerName.trim()} onDone={() => setCodeShown(false)} /> : null}
        <div className="row">
          <Link className="btn btn-primary" to={`/admin/businesses/${result.companyId}`}>
            {t('admin.new.open')}
          </Link>
          <button type="button" className="btn" onClick={again}>
            {t('admin.new.another')}
          </button>
        </div>
      </div>
    );
  }

  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="stack">
      {dialog}
      <h1>{t('admin.new.title')}</h1>
      <p className="lead">{t('admin.new.lead')}</p>
      <form className="card stack" onSubmit={submit}>
        <label className="row">
          <input type="checkbox" className="checkbox-inline" checked={form.isTest} onChange={(e) => setForm({ ...form, isTest: e.target.checked })} />
          <TestBadge /> {t('admin.new.test')}
        </label>
        <p className="muted small">{t('admin.new.test.hint')}</p>
        <div className="grid">
          <Field label={t('admin.new.business')}>
            <input required maxLength={160} value={form.businessName} onChange={set('businessName')} />
          </Field>
          <Field label={t('admin.new.owner')}>
            <input required maxLength={160} value={form.ownerName} onChange={set('ownerName')} />
          </Field>
          <Field label={t('admin.new.phone')} hint={t('admin.new.phone.hint')}>
            <input required inputMode="tel" maxLength={24} dir="ltr" value={form.phone} onChange={set('phone')} />
          </Field>
          <Field label={t('admin.new.email')}>
            <input type="email" maxLength={160} dir="ltr" value={form.email} onChange={set('email')} />
          </Field>
          <Field label={t('admin.new.city')}>
            <input maxLength={120} value={form.city} onChange={set('city')} />
          </Field>
          <Field label={t('admin.new.store')}>
            <input maxLength={160} value={form.branchName} onChange={set('branchName')} />
          </Field>
          <Field label={t('admin.new.activity')}>
            <select value={form.activity} onChange={set('activity')}>
              {ACTIVITY_CHOICES.map((a) => (
                <option key={a} value={a}>
                  {t(`activity.${a}` as Key)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('admin.new.language')}>
            <select value={form.language} onChange={set('language')}>
              <option value="fr">Français</option>
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
          </Field>
        </div>
        <Field label={t('admin.action.reason')} hint={t('admin.action.reason.required')}>
          <input required maxLength={500} value={form.reason} onChange={set('reason')} />
        </Field>
        {offerDeferral ? <VerificationChoice name="owner-verification" value={verification} onChange={setVerification} /> : null}
        <ProvisioningRefusal error={error} />
        <div className="row">
          <button type="submit" className="btn btn-primary" disabled={busy || (offerDeferral && !verificationReady(verification))}>
            {t('admin.new.submit')}
          </button>
          <Link className="btn" to="/admin/businesses">
            {t('action.cancel')}
          </Link>
        </div>
      </form>
    </div>
  );
}
