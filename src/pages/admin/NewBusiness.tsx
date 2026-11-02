import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { Activity, CreatedBusiness } from '../../api/types';
import { adminRequest } from '../../auth/admin';
import { Field, Notice } from '../../components/ui';
import { useI18n, type Key } from '../../i18n';
import { ACTIVITY_CHOICES, ProvisioningRefusal, SetupCode, TestBadge } from './provisioning';
import { useStepUp } from './useStepUp';
import { PersonSetupCode, REQUIRED, VerificationChoice, useDeferralAvailable, verificationBody, verificationReady, type VerificationValue } from './deferral';
import { arabicNameProblem, latinNameProblem, nameProblemKey, normalizeName } from '../../lib/names';

type Form = typeof EMPTY;
type FieldErrors = Partial<Record<keyof Form, Key>>;

const EMPTY = { businessName: '', businessNameAr: '', ownerName: '', ownerNameAr: '', branchNameAr: '', phone: '', email: '', city: '', branchName: '', activity: 'electronics' as Activity, language: 'fr' as 'en' | 'fr' | 'ar', isTest: true, reason: '', accessKind: 'grant' as 'payment' | 'grant', amount: '', paidAt: '', reference: '', months: '1', days: '30', grantReason: '' };

/**
 * What the API would refuse, said beside each field before anything is sent (D225, 2026-10-31). The rules are the API's
 * own (D227): the Owner's and the first store's names; any trading name and Arabic name are optional; a WhatsApp number,
 * a reason, and why the account has access. The server enforces all of it again.
 */
export function newBusinessErrors(form: Form): FieldErrors {
  const errors: FieldErrors = {};
  const latin = (k: keyof Form, v: string) => {
    const p = latinNameProblem(v);
    if (p) errors[k] = nameProblemKey(p);
  };
  const arabic = (k: keyof Form, v: string) => {
    const p = arabicNameProblem(v);
    if (p) errors[k] = nameProblemKey(p);
  };
  if (normalizeName(form.businessName)) latin('businessName', form.businessName);
  arabic('businessNameAr', form.businessNameAr);
  latin('ownerName', form.ownerName);
  arabic('ownerNameAr', form.ownerNameAr);
  if (normalizeName(form.branchName)) latin('branchName', form.branchName);
  else errors.branchName = 'admin.store.needed';
  arabic('branchNameAr', form.branchNameAr);
  const kind = form.isTest ? 'grant' : form.accessKind;
  const whole = (v: string) => /^[1-9]\d*$/.test(v.trim());
  if (kind === 'grant') {
    if (!whole(form.days)) errors.days = 'form.required';
    if (form.grantReason.trim().length < 3) errors.grantReason = 'form.required';
  } else {
    if (!(Number(form.amount) > 0)) errors.amount = 'form.required';
    if (!form.paidAt) errors.paidAt = 'form.required';
    if (form.reference.trim().length < 3) errors.reference = 'form.required';
    if (!whole(form.months)) errors.months = 'form.required';
  }
  if (!form.phone.trim()) errors.phone = 'form.required';
  if (!form.reason.trim()) errors.reason = 'form.required';
  return errors;
}

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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [result, setResult] = useState<CreatedBusiness | null>(null);
  const [codeShown, setCodeShown] = useState(true);
  const [verification, setVerification] = useState<VerificationValue>(REQUIRED);
  const deferralAvailable = useDeferralAvailable();
  // Per account, for any business, while the server's switch is on (the server decides every condition).
  const offerDeferral = deferralAvailable;
  const attempt = useRef<{ key: string; payload: string } | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    // Checked here first: the API's refusal would name fields in English. What was typed stays as typed.
    const problems = newBusinessErrors(form);
    setFieldErrors(problems);
    if (Object.keys(problems).length > 0) return;
    const payload = {
      ...(form.businessName.trim() ? { businessName: form.businessName.trim(), businessNameAr: form.businessNameAr.trim() } : {}),
      ownerName: form.ownerName.trim(),
      ownerNameAr: form.ownerNameAr.trim(),
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      city: form.city.trim() || undefined,
      branchName: form.branchName.trim(),
      branchNameAr: form.branchNameAr.trim(),
      // Never a silent trial or free access: the server refuses without this.
      access:
        form.isTest || form.accessKind === 'grant'
          ? { kind: 'grant' as const, days: Number(form.days), reason: form.grantReason.trim() }
          : { kind: 'payment' as const, amount: form.amount.trim(), paidAt: new Date(form.paidAt).toISOString(), reference: form.reference.trim(), months: Number(form.months) },
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
        <Notice tone={result.invitationFailed || result.provisioningDraft ? 'warn' : 'ok'}>
          {result.created ? t('admin.new.created') : t('admin.new.existing')}
          {result.invitationFailed ? <div>{t('admin.new.invitationFailed')}</div> : null}
          {result.provisioningDraft ? <div>{t('admin.draft.body')}</div> : null}
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

  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) => {
    setForm({ ...form, [k]: e.target.value });
    if (fieldErrors[k]) setFieldErrors({ ...fieldErrors, [k]: undefined });
  };
  const err = (k: keyof Form) => (fieldErrors[k] ? t(fieldErrors[k]!) : null);
  const invalid = (k: keyof Form) => (fieldErrors[k] ? { 'aria-invalid': true as const } : {});

  return (
    <div className="stack">
      {dialog}
      <h1>{t('admin.new.title')}</h1>
      <p className="lead">{t('admin.new.lead')}</p>
      <form className="card stack" onSubmit={submit} noValidate>
        <label className="row">
          <input type="checkbox" className="checkbox-inline" checked={form.isTest} onChange={(e) => setForm({ ...form, isTest: e.target.checked })} />
          <TestBadge /> {t('admin.new.test')}
        </label>
        <p className="muted small">{t('admin.new.test.hint')}</p>
        <div className="grid">
          <Field label={t('admin.new.business')} error={err('businessName')}>
            <input maxLength={160} dir="ltr" value={form.businessName} onChange={set('businessName')} {...invalid('businessName')} />
          </Field>
          <Field label={t('admin.new.businessAr')} error={err('businessNameAr')}>
            <input maxLength={160} dir="rtl" lang="ar" value={form.businessNameAr} onChange={set('businessNameAr')} {...invalid('businessNameAr')} />
          </Field>
          <Field label={t('admin.new.owner')} error={err('ownerName')}>
            <input required maxLength={160} dir="ltr" value={form.ownerName} onChange={set('ownerName')} {...invalid('ownerName')} />
          </Field>
          <Field label={t('admin.new.ownerAr')} error={err('ownerNameAr')}>
            <input maxLength={160} dir="rtl" lang="ar" value={form.ownerNameAr} onChange={set('ownerNameAr')} {...invalid('ownerNameAr')} />
          </Field>
          <Field label={t('admin.new.phone')} hint={t('admin.new.phone.hint')} error={err('phone')}>
            <input required inputMode="tel" maxLength={24} dir="ltr" value={form.phone} onChange={set('phone')} {...invalid('phone')} />
          </Field>
          <Field label={t('admin.new.email')}>
            <input type="email" maxLength={160} dir="ltr" value={form.email} onChange={set('email')} />
          </Field>
          <Field label={t('admin.new.city')}>
            <input maxLength={120} value={form.city} onChange={set('city')} />
          </Field>
          <Field label={t('admin.new.store')} error={err('branchName')}>
            <input required maxLength={160} dir="ltr" value={form.branchName} onChange={set('branchName')} {...invalid('branchName')} />
          </Field>
          <Field label={t('admin.new.storeAr')} error={err('branchNameAr')}>
            <input maxLength={160} dir="rtl" lang="ar" value={form.branchNameAr} onChange={set('branchNameAr')} {...invalid('branchNameAr')} />
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
        <Field label={t('admin.action.reason')} hint={t('admin.action.reason.required')} error={err('reason')}>
          <input required maxLength={500} value={form.reason} onChange={set('reason')} {...invalid('reason')} />
        </Field>
        <fieldset className="stack">
          <legend>{t('admin.access.title')}</legend>
          {!form.isTest ? (
            <div className="row">
              {(['payment', 'grant'] as const).map((kind) => (
                <label key={kind} className="row">
                  <input type="radio" name="access-kind" className="checkbox-inline" checked={form.accessKind === kind} onChange={() => setForm({ ...form, accessKind: kind })} />
                  {t(`admin.access.${kind}`)}
                </label>
              ))}
            </div>
          ) : null}
          {form.isTest || form.accessKind === 'grant' ? (
            <div className="grid">
              <Field label={t('admin.access.days')} error={err('days')}>
                <input inputMode="numeric" dir="ltr" value={form.days} onChange={set('days')} {...invalid('days')} />
              </Field>
              <Field label={t('admin.access.grantReason')} error={err('grantReason')}>
                <input maxLength={255} value={form.grantReason} onChange={set('grantReason')} {...invalid('grantReason')} />
              </Field>
            </div>
          ) : (
            <div className="grid">
              <Field label={t('admin.access.amount')} error={err('amount')}>
                <input inputMode="decimal" dir="ltr" value={form.amount} onChange={set('amount')} {...invalid('amount')} />
              </Field>
              <Field label={t('admin.access.paidAt')} error={err('paidAt')}>
                <input type="date" dir="ltr" value={form.paidAt} onChange={set('paidAt')} {...invalid('paidAt')} />
              </Field>
              <Field label={t('admin.access.reference')} error={err('reference')}>
                <input maxLength={120} dir="ltr" value={form.reference} onChange={set('reference')} {...invalid('reference')} />
              </Field>
              <Field label={t('admin.access.months')} error={err('months')}>
                <input inputMode="numeric" dir="ltr" value={form.months} onChange={set('months')} {...invalid('months')} />
              </Field>
            </div>
          )}
        </fieldset>
        {offerDeferral ? <VerificationChoice name="owner-verification" value={verification} onChange={setVerification} /> : null}
        {Object.values(fieldErrors).some(Boolean) ? <Notice tone="danger">{t('form.fix')}</Notice> : null}
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
