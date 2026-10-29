import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ApiError } from '../../api/client';
import type { BusinessDetail, DeferredAccount, IssuedSetupCode, TestStaffResult, VerificationPolicy } from '../../api/types';
import { adminRequest } from '../../auth/admin';
import { Badge, ErrorNotice, Field, Notice, Phrase } from '../../components/ui';
import { useI18n, type Key } from '../../i18n';
import { formatDate, formatDateTime } from '../../lib/format';

/*
 * Deferred WhatsApp verification, per account, for accounts the platform provisions (D224, docs/109; the owner's
 * amendment of 2026-10-29: an ordinary business, its own seats).
 *
 * The server decides every condition — a superadmin with MFA, a fresh step-up, the server's switch — and
 * this console only offers what it says may be asked. "Deferred" is never "verified": nothing here can mark a number
 * verified, and every list says Deferred in words.
 */

/** The refusals a deferral or test provisioning gives with a code of its own, said in the console's language. */
const CODED = [
  'deferral_disabled',
  'deferral_mfa_required',
  'deferral_reason_required',
  'deferral_confirmation_required',
  'deferral_review_date',
  'seat_unavailable',
  'contact_in_use',
  'role_not_allowed',
  'not_deferred',
  'already_set_up',
  'owner_not_cancellable',
  'step_up_required',
] as const;

export function DeferralRefusal({ error }: { error: unknown }) {
  const { t } = useI18n();
  if (error instanceof ApiError && (CODED as readonly string[]).includes(error.code ?? '')) {
    return <Notice tone="danger">{t(`admin.deferral.error.${error.code}` as Key)}</Notice>;
  }
  return <ErrorNotice error={error} />;
}

/** Whether the server lets the console offer a deferral at all (the kill switch). Off until it says otherwise. */
export function useDeferralAvailable(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let live = true;
    adminRequest<{ phoneVerificationDeferral: boolean }>('platform/capabilities').then(
      (c) => live && setOn(c.phoneVerificationDeferral === true),
      () => live && setOn(false),
    );
    return () => {
      live = false;
    };
  }, []);
  return on;
}

export interface VerificationValue {
  policy: VerificationPolicy;
  reason: string;
  confirmed: boolean;
  reviewAt: string;
}

export const REQUIRED: VerificationValue = { policy: 'required', reason: '', confirmed: false, reviewAt: '' };

/** The request's verification fields; undefined for Required, so a Required request carries nothing new. */
export function verificationBody(v: VerificationValue) {
  if (v.policy !== 'deferred_by_platform') return { verification: 'required' as const };
  return {
    verification: 'deferred_by_platform' as const,
    deferral: { reason: v.reason.trim(), confirmUnverified: v.confirmed, ...(v.reviewAt ? { reviewAt: new Date(`${v.reviewAt}T23:59:00`).toISOString() } : {}) },
  };
}

/** A deferral is complete only with its written reason and the confirmation that the number stays unverified. */
export function verificationReady(v: VerificationValue): boolean {
  return v.policy === 'required' || (v.reason.trim().length > 0 && v.confirmed);
}

/** "WhatsApp verification": Required (the default) or Deferred for testing, with what a deferral needs. */
export function VerificationChoice({ value, onChange, name }: { value: VerificationValue; onChange: (v: VerificationValue) => void; name: string }) {
  const { t } = useI18n();
  const deferred = value.policy === 'deferred_by_platform';
  return (
    <fieldset className="stack" data-testid="verification-choice">
      <legend>
        <strong>{t('admin.deferral.field')}</strong>
      </legend>
      <label className="row">
        <input type="radio" name={name} checked={!deferred} onChange={() => onChange({ ...REQUIRED })} />
        {t('admin.deferral.required')}
      </label>
      <label className="row">
        <input type="radio" name={name} checked={deferred} onChange={() => onChange({ ...value, policy: 'deferred_by_platform' })} />
        {t('admin.deferral.deferred')}
      </label>
      {deferred ? (
        <div className="stack">
          <Notice tone="warn" title={t('admin.deferral.warning.title')}>
            {t('admin.deferral.warning')}
          </Notice>
          <Field label={t('admin.deferral.reason')} hint={t('admin.deferral.reason.hint')}>
            <textarea required maxLength={500} rows={2} value={value.reason} onChange={(e) => onChange({ ...value, reason: e.target.value })} />
          </Field>
          <Field label={t('admin.deferral.review')} hint={t('admin.deferral.review.hint')}>
            <input type="date" dir="ltr" value={value.reviewAt} onChange={(e) => onChange({ ...value, reviewAt: e.target.value })} />
          </Field>
          <label className="row">
            <input type="checkbox" className="checkbox-inline" checked={value.confirmed} onChange={(e) => onChange({ ...value, confirmed: e.target.checked })} />
            {t('admin.deferral.confirm')}
          </label>
        </div>
      ) : null}
    </fieldset>
  );
}

/** A provisioned person's setup code, in the one answer that carries it — never stored, never in the address. */
export function PersonSetupCode({ code, name, onDone }: { code: IssuedSetupCode; name: string; onDone: () => void }) {
  const { t, lang } = useI18n();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code.token);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <section className="card stack" aria-labelledby="person-setup-code-title">
      <h2 id="person-setup-code-title">{t('admin.setup.code.title')}</h2>
      <p className="ltr setup-code" data-testid="setup-code">
        <code>{code.token}</code>
      </p>
      <div className="row">
        <button type="button" className="btn btn-sm" onClick={() => void copy()}>
          {copied ? t('admin.setup.code.copied') : t('admin.setup.code.copy')}
        </button>
      </div>
      <Notice tone="warn">
        <Phrase text={t('admin.setup.code.once')} values={{ name, date: formatDateTime(code.expiresAt, lang) }} />
      </Notice>
      <p className="muted small">{t('admin.deferral.code.how')}</p>
      <div className="row">
        <button type="button" className="btn btn-primary" onClick={onDone}>
          {t('admin.setup.code.done')}
        </button>
      </div>
    </section>
  );
}

/** How a number's verification reads anywhere in the console: three states, in words, Deferred never as verified. */
export function PhoneVerificationBadge({ state, verified }: { state?: 'required' | 'deferred_by_platform' | 'verified'; verified: boolean }) {
  const { t } = useI18n();
  if (state === 'deferred_by_platform') return <Badge tone="warn">{t('admin.deferral.badge')}</Badge>;
  return <Badge tone={verified ? 'ok' : 'warn'}>{verified ? t('admin.business.verified') : t('admin.business.unverified')}</Badge>;
}

type Ask = () => Promise<string | null>;

/** Managers and Employees, provisioned by the administrator, each taking one of the business's own seats. */
export function ProvisionStaff({ business, ask, onDone }: { business: BusinessDetail; ask: Ask; onDone: () => Promise<void> }) {
  const { t } = useI18n();
  const available = useDeferralAvailable();
  const empty = { name: '', phone: '', email: '', role: 'store_employee' as 'store_manager' | 'store_employee', branchIds: [] as string[] };
  const [form, setForm] = useState(empty);
  const [verification, setVerification] = useState<VerificationValue>(REQUIRED);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [made, setMade] = useState<TestStaffResult | null>(null);
  const toggle = (id: string) => setForm({ ...form, branchIds: form.branchIds.includes(id) ? form.branchIds.filter((b) => b !== id) : [...form.branchIds, id] });
  const ready = form.name.trim() && form.phone.trim() && form.branchIds.length > 0 && verificationReady(verification);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const confirmPassword = await ask();
    if (!confirmPassword) return;
    setBusy(true);
    try {
      const r = await adminRequest<TestStaffResult>(`platform/businesses/${business.id}/provisioned-staff`, {
        method: 'POST',
        body: { name: form.name.trim(), phone: form.phone.trim(), ...(form.email.trim() ? { email: form.email.trim() } : {}), role: form.role, branchIds: form.branchIds, ...verificationBody(verification), confirmPassword },
      });
      setMade(r);
      setForm(empty);
      setVerification(REQUIRED);
      await onDone();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card stack" aria-labelledby="test-staff-title">
      <h2 id="test-staff-title">{t('admin.testStaff.title')}</h2>
      <p className="muted small">{t('admin.testStaff.lead')}</p>
      {made ? <PersonSetupCode code={made.setupCode} name={made.user.name} onDone={() => setMade(null)} /> : null}
      <form className="stack" onSubmit={submit}>
        <div className="grid">
          <Field label={t('admin.testStaff.name')}>
            <input required maxLength={160} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label={t('admin.testStaff.phone')} hint={t('admin.testStaff.phone.hint')}>
            <input required inputMode="tel" dir="ltr" maxLength={24} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label={t('admin.testStaff.email')}>
            <input type="email" dir="ltr" maxLength={160} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label={t('admin.testStaff.role')}>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as typeof form.role })}>
              <option value="store_manager">{t('admin.testStaff.role.store_manager')}</option>
              <option value="store_employee">{t('admin.testStaff.role.store_employee')}</option>
            </select>
          </Field>
        </div>
        <fieldset className="stack">
          <legend>{t('admin.testStaff.stores')}</legend>
          {business.branches.map((b) => (
            <label key={b.id} className="row">
              <input type="checkbox" className="checkbox-inline" checked={form.branchIds.includes(b.id)} onChange={() => toggle(b.id)} />
              {b.name}
            </label>
          ))}
        </fieldset>
        {available ? <VerificationChoice name="staff-verification" value={verification} onChange={setVerification} /> : <p className="muted small">{t('admin.deferral.off')}</p>}
        <DeferralRefusal error={error} />
        <div className="row">
          <button type="submit" className="btn btn-primary" disabled={busy || !ready}>
            {t('admin.testStaff.submit')}
          </button>
        </div>
      </form>
    </section>
  );
}

type Action = 'require' | 'update' | 'code' | 'revoke' | 'cancel';

/** Every account of this business whose verification is deferred: who granted it, when and why, and what can change. */
export function DeferredAccounts({ business, ask, onDone }: { business: BusinessDetail; ask: Ask; onDone: () => Promise<void> }) {
  const { t, lang } = useI18n();
  const [rows, setRows] = useState<DeferredAccount[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [open, setOpen] = useState<{ id: string; action: Action } | null>(null);
  const [reason, setReason] = useState('');
  const [reviewAt, setReviewAt] = useState('');
  const [code, setCode] = useState<{ code: IssuedSetupCode; name: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows((await adminRequest<{ accounts: DeferredAccount[] }>(`platform/phone-verification/deferred?businessId=${business.id}`)).accounts);
    } catch (e) {
      setError(e);
    }
  }, [business.id]);
  useEffect(() => {
    void load();
  }, [load]);

  if (!rows || (rows.length === 0 && !code)) return error ? <ErrorNotice error={error} /> : null;

  const run = async (row: DeferredAccount, action: Action) => {
    setError(null);
    const confirmPassword = await ask();
    if (!confirmPassword) return;
    setBusy(true);
    const base = `platform/businesses/${business.id}/accounts/${row.userId}`;
    try {
      if (action === 'require') await adminRequest(`${base}/require-verification`, { method: 'POST', body: { reason: reason.trim(), confirmPassword } });
      if (action === 'update')
        await adminRequest(`${base}/deferral`, { method: 'POST', body: { ...(reason.trim() ? { reason: reason.trim() } : {}), ...(reviewAt ? { reviewAt: new Date(`${reviewAt}T23:59:00`).toISOString() } : {}), confirmPassword } });
      if (action === 'code') {
        const r = await adminRequest<{ setupCode: IssuedSetupCode }>(`${base}/setup-code`, { method: 'POST', body: { confirmPassword } });
        setCode({ code: r.setupCode, name: row.name });
      }
      if (action === 'revoke') await adminRequest(`${base}/setup-code/revoke`, { method: 'POST', body: { confirmPassword } });
      if (action === 'cancel') await adminRequest(`${base}/cancel`, { method: 'POST', body: { reason: reason.trim(), confirmPassword } });
      setOpen(null);
      setReason('');
      setReviewAt('');
      await load();
      await onDone();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const needsReason = (a: Action) => a === 'require' || a === 'cancel';

  return (
    <section className="card stack" aria-labelledby="deferred-title">
      <h2 id="deferred-title">{t('admin.deferred.title')}</h2>
      <Notice tone="warn">{t('admin.deferred.lead')}</Notice>
      {code ? <PersonSetupCode code={code.code} name={code.name} onDone={() => setCode(null)} /> : null}
      <DeferralRefusal error={error} />
      {rows.map((r) => (
        <article key={r.userId} className="stack" data-testid="deferred-account">
          <p className="row">
            <strong>{r.name}</strong> <Badge tone="warn">{t('admin.deferral.badge')}</Badge>
            <span className="muted small">{r.role ? t(`admin.testStaff.role.${r.role}` as Key) : ''}</span>
            <span className="muted small">{r.stores.join(', ')}</span>
          </p>
          <dl className="facts">
            <dt>{t('admin.deferred.grantedBy')}</dt>
            <dd>
              <span className="ltr">{r.grantedBy}</span> · {formatDateTime(r.grantedAt, lang)}
            </dd>
            <dt>{t('admin.deferred.reason')}</dt>
            <dd>{r.reason}</dd>
            <dt>{t('admin.deferred.review')}</dt>
            <dd>{r.reviewAt ? formatDate(r.reviewAt.slice(0, 10), lang) : t('admin.deferred.noReview')}</dd>
            <dt>{t('admin.deferred.code')}</dt>
            <dd>{t(`admin.deferred.code.${r.setupCode}` as Key)}</dd>
            <dt>{t('admin.deferred.account')}</dt>
            <dd>{r.activated ? t('admin.business.people.active') : t('admin.business.people.pending')}</dd>
          </dl>
          {open?.id === r.userId ? (
            <form
              className="stack"
              onSubmit={(e) => {
                e.preventDefault();
                void run(r, open.action);
              }}
            >
              {open.action === 'require' ? <Notice tone="info">{t('admin.deferred.require.note')}</Notice> : null}
              {open.action !== 'code' && open.action !== 'revoke' ? (
                <Field label={t('admin.action.reason')} hint={needsReason(open.action) ? t('admin.action.reason.required') : undefined}>
                  <input required={needsReason(open.action)} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
                </Field>
              ) : null}
              {open.action === 'update' ? (
                <Field label={t('admin.deferral.review')}>
                  <input type="date" dir="ltr" value={reviewAt} onChange={(e) => setReviewAt(e.target.value)} />
                </Field>
              ) : null}
              <div className="row">
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {t('action.confirm')}
                </button>
                <button type="button" className="btn" onClick={() => setOpen(null)}>
                  {t('action.cancel')}
                </button>
              </div>
            </form>
          ) : (
            <div className="row">
              <button type="button" className="btn btn-sm" onClick={() => setOpen({ id: r.userId, action: 'require' })}>
                {t('admin.deferred.require')}
              </button>
              <button type="button" className="btn btn-sm" onClick={() => setOpen({ id: r.userId, action: 'update' })}>
                {t('admin.deferred.update')}
              </button>
              {r.setupCode !== 'used' ? (
                <>
                  <button type="button" className="btn btn-sm" onClick={() => setOpen({ id: r.userId, action: 'code' })}>
                    {t('admin.deferred.reissue')}
                  </button>
                  {r.setupCode === 'active' ? (
                    <button type="button" className="btn btn-sm" onClick={() => setOpen({ id: r.userId, action: 'revoke' })}>
                      {t('admin.deferred.revoke')}
                    </button>
                  ) : null}
                </>
              ) : null}
              {r.role !== 'owner' ? (
                <button type="button" className="btn btn-sm btn-danger" onClick={() => setOpen({ id: r.userId, action: 'cancel' })}>
                  {t('admin.deferred.cancel')}
                </button>
              ) : null}
            </div>
          )}
        </article>
      ))}
    </section>
  );
}
