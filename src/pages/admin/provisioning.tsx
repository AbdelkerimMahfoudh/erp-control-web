import { useState, type FormEvent } from 'react';
import { ApiError } from '../../api/client';
import type { Activity, BusinessDetail, ConsoleStoreResult, IssuedInvitation } from '../../api/types';
import { adminRequest } from '../../auth/admin';
import { Badge, ErrorNotice, Field, Notice, Phrase } from '../../components/ui';
import { useI18n, type Key } from '../../i18n';
import { formatDateTime } from '../../lib/format';
import { PhoneVerificationBadge } from './deferral';

/** The activities a store can have (D154), in the order the console offers them. */
export const ACTIVITY_CHOICES: Activity[] = ['electronics', 'money_agent', 'both'];

/** The refusals provisioning gives with a code of its own (D217), said in the console's language. */
const CODED = [
  'customer_activation_closed',
  'test_business_no_payment',
  'test_status_connected',
  'test_status_paid',
  'test_status_in_use',
  'test_business_only',
  'grant_required',
  'store_name_in_use',
  'deferral_disabled',
  'deferral_mfa_required',
  'deferral_reason_required',
  'deferral_confirmation_required',
  'deferral_review_date',
] as const;

/** A provisioning refusal in words, or any other error as every page says one. */
export function ProvisioningRefusal({ error }: { error: unknown }) {
  const { t } = useI18n();
  if (error instanceof ApiError && (CODED as readonly string[]).includes(error.code ?? '')) {
    return <Notice tone="danger">{t(`admin.provisioning.error.${error.code}` as Key)}</Notice>;
  }
  return <ErrorNotice error={error} />;
}

/** A persistent test business, unmistakably (D217): a badge in lists, a banner on its page. */
export function TestBadge() {
  const { t } = useI18n();
  return <Badge tone="warn">{t('admin.test.badge')}</Badge>;
}

export function TestBanner() {
  const { t } = useI18n();
  return (
    <Notice tone="warn" title={t('admin.test.bannerTitle')}>
      {t('admin.test.banner')}
    </Notice>
  );
}

/**
 * The Owner's setup code, in the one answer that carries it. It lives in this component's state only — never stored,
 * never in the address — and goes when the administrator says it was handed over or leaves the page.
 */
export function SetupCode({ invitation, onDone }: { invitation: IssuedInvitation; onDone: () => void }) {
  const { t, lang } = useI18n();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(invitation.token);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <section className="card stack" aria-labelledby="setup-code-title">
      <h2 id="setup-code-title">{t('admin.setup.code.title')}</h2>
      <p className="ltr setup-code" data-testid="setup-code">
        <code>{invitation.token}</code>
      </p>
      <div className="row">
        <button type="button" className="btn btn-sm" onClick={() => void copy()}>
          {copied ? t('admin.setup.code.copied') : t('admin.setup.code.copy')}
        </button>
      </div>
      <Notice tone="warn">
        <Phrase text={t('admin.setup.code.once')} values={{ name: invitation.owner.name, date: formatDateTime(invitation.expiresAt, lang) }} />
      </Notice>
      <p className="muted small">{t('admin.setup.code.how')}</p>
      <div className="row">
        <button type="button" className="btn btn-primary" onClick={onDone}>
          {t('admin.setup.code.done')}
        </button>
      </div>
    </section>
  );
}

/** Where the business stands: its setup and its access, separately (D217), with the Owner's contacts as they are. */
export function SetupPanel({ business, ask, onDone }: { business: BusinessDetail; ask: () => Promise<string | null>; onDone: () => Promise<void> }) {
  const { t, lang } = useI18n();
  const setup = business.setup;
  const [issued, setIssued] = useState<IssuedInvitation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  if (!setup) return null;

  const issue = async () => {
    setError(null);
    const confirmPassword = await ask();
    if (!confirmPassword) return;
    setBusy(true);
    try {
      setIssued(await adminRequest<IssuedInvitation>(`platform/businesses/${business.id}/owner-invitation`, { method: 'POST', body: { reason: 'Owner setup', confirmPassword } }));
      await onDone();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  const inv = setup.invitation;
  const invitationLine = (() => {
    switch (inv.state) {
      case 'active':
        return t('admin.setup.invitation.active', { issued: formatDateTime(inv.issuedAt, lang), expires: formatDateTime(inv.expiresAt, lang) });
      case 'expired':
        return t('admin.setup.invitation.expired', { date: formatDateTime(inv.expiresAt, lang) });
      case 'accepted':
        return t('admin.setup.invitation.accepted', { date: formatDateTime(inv.acceptedAt, lang) });
      case 'revoked':
        return t('admin.setup.invitation.revoked', { date: formatDateTime(inv.revokedAt, lang) });
      default:
        return t('admin.setup.invitation.none');
    }
  })();
  const owner = setup.owner;
  const consent = owner?.phone.whatsappConsent;
  // A setup code is offered while the Owner has not chosen a password; a customer's only while activation is open.
  const mayIssue = setup.provisioning === 'awaiting_owner_setup' && (setup.isTest || setup.customerActivation === 'open');

  return (
    <section className="card stack">
      <h2>{t('admin.setup.title')}</h2>
      <dl className="facts">
        <dt>{t('admin.setup.provisioning')}</dt>
        <dd>
          <Badge tone={setup.provisioning === 'ready' ? 'ok' : 'info'}>{t(`admin.setup.provisioning.${setup.provisioning}` as Key)}</Badge>{' '}
          <span className="muted small">{t(`admin.setup.createdBy.${setup.createdBy}` as Key)}</span>
        </dd>
        <dt>{t('admin.setup.activation')}</dt>
        <dd>{setup.activation.status ? t(`admin.setup.activation.${setup.activation.status}` as Key) : '—'}</dd>
        <dt>{t('admin.setup.invitation')}</dt>
        <dd>{invitationLine}</dd>
        <dt>{t('admin.setup.phone')}</dt>
        <dd>
          {owner?.phone.present ? (
            <PhoneVerificationBadge state={owner.phone.verification} verified={owner.phone.verified} />
          ) : (
            t('admin.setup.noPhone')
          )}
        </dd>
        <dt>{t('admin.setup.consent')}</dt>
        <dd>{t(`admin.setup.consent.${consent ?? 'unknown'}` as Key)}</dd>
        <dt>{t('admin.setup.lastLogin')}</dt>
        <dd>{owner?.lastLoginAt ? formatDateTime(owner.lastLoginAt, lang) : t('admin.setup.never')}</dd>
      </dl>
      {setup.customerActivation === 'closed' && !setup.isTest ? <Notice tone="info">{t('admin.provisioning.error.customer_activation_closed')}</Notice> : null}
      {issued ? <SetupCode invitation={issued} onDone={() => setIssued(null)} /> : null}
      {mayIssue && !issued ? (
        <div className="stack">
          <div className="row">
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void issue()}>
              {inv.state === 'none' ? t('admin.setup.issue') : t('admin.setup.reissue')}
            </button>
          </div>
          {inv.state === 'active' ? <p className="muted small">{t('admin.setup.reissue.note')}</p> : null}
        </div>
      ) : null}
      <ProvisioningRefusal error={error} />
    </section>
  );
}

/** Set or clear the test status (D217): a decision with a reason and a step-up, refused where it would mix test and real. */
export function TestStatus({ business, ask, onDone }: { business: BusinessDetail; ask: () => Promise<string | null>; onDone: () => Promise<void> }) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const isTest = business.isTest === true;
  const setup = business.setup;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const confirmPassword = await ask();
    if (!confirmPassword) return;
    setBusy(true);
    try {
      await adminRequest(`platform/businesses/${business.id}/test-status`, { method: 'POST', body: { isTest: !isTest, reason: reason.trim(), confirmPassword } });
      setOpen(false);
      setReason('');
      await onDone();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card stack">
      <h2>{t('admin.test.title')}</h2>
      <p>
        {isTest ? <TestBadge /> : null}{' '}
        {isTest && setup?.testMarkedAt
          ? t('admin.test.marked', { date: formatDateTime(setup.testMarkedAt, lang), who: setup.testMarkedBy ?? '—' })
          : isTest
            ? t('admin.test.isTest')
            : t('admin.test.isCustomer')}
      </p>
      {!open ? (
        <div className="row">
          <button type="button" className="btn btn-sm" onClick={() => setOpen(true)}>
            {isTest ? t('admin.test.unmark') : t('admin.test.mark')}
          </button>
        </div>
      ) : (
        <form className="stack" onSubmit={submit}>
          <Field label={t('admin.action.reason')} hint={t('admin.action.reason.required')}>
            <input required maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <ProvisioningRefusal error={error} />
          <div className="row">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {t('action.confirm')}
            </button>
            <button type="button" className="btn" onClick={() => setOpen(false)}>
              {t('action.cancel')}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

/**
 * A store from the console (the owner's decision of 2026-10-20): a test business holding a grant gets it at once, at
 * no charge, under that grant; a customer's business gets the store request its Owner would file, at its price, opened
 * by a real payment. The server decides which; the form says which it will be. The same name again opens nothing new.
 */
export function ConsoleStore({ business, ask, onDone }: { business: BusinessDetail; ask: () => Promise<string | null>; onDone: () => Promise<void> }) {
  const { t } = useI18n();
  const [form, setForm] = useState({ name: '', nameAr: '', activity: 'electronics' as Activity, reason: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState<string | null>(null);
  const isTest = business.isTest === true;
  const granted = business.entitlement?.state === 'complimentary';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setDone(null);
    const confirmPassword = await ask();
    if (!confirmPassword) return;
    setBusy(true);
    try {
      const r = await adminRequest<ConsoleStoreResult>(`platform/businesses/${business.id}/stores`, {
        method: 'POST',
        body: { name: form.name.trim(), nameAr: form.nameAr.trim(), activity: form.activity, reason: form.reason.trim(), confirmPassword },
      });
      setDone(!r.created ? t('admin.store.same') : r.mode === 'granted' ? t('admin.store.granted', { name: form.name.trim() }) : t('admin.store.requested', { name: form.name.trim() }));
      setForm({ ...form, name: '', nameAr: '', reason: '' });
      await onDone();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card stack">
      <h2>{t('admin.store.title')}</h2>
      <p className="muted small">{isTest ? (granted ? t('admin.store.test') : t('admin.provisioning.error.grant_required')) : t('admin.store.customer')}</p>
      {done ? <Notice tone="ok">{done}</Notice> : null}
      <form className="stack" onSubmit={submit}>
        <div className="grid">
          <Field label={t('admin.store.name')}>
            <input required maxLength={160} dir="ltr" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label={t('admin.store.nameAr')}>
            <input required maxLength={160} dir="rtl" lang="ar" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />
          </Field>
          <Field label={t('admin.store.activity')}>
            <select value={form.activity} onChange={(e) => setForm({ ...form, activity: e.target.value as Activity })}>
              {ACTIVITY_CHOICES.map((a) => (
                <option key={a} value={a}>
                  {t(`activity.${a}` as Key)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label={t('admin.action.reason')} hint={t('admin.action.reason.required')}>
          <input required maxLength={500} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        </Field>
        <ProvisioningRefusal error={error} />
        <div className="row">
          <button type="submit" className="btn btn-primary" disabled={busy || (isTest && !granted)}>
            {t('admin.store.submit')}
          </button>
        </div>
      </form>
    </section>
  );
}
