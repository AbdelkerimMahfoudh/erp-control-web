import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { ApiError } from '../../api/client';
import type { BusinessDetail, SeatRequest } from '../../api/types';
import { adminRequest } from '../../auth/admin';
import { ActivityWithNext } from '../../components/activity';
import { GrantLine } from '../../components/grant';
import { RequestAmount, RequestStatus, RequestSummary } from '../../components/requests';
import { Timeline, type TimelineTrial } from '../../components/timeline';
import { Badge, DatedPhrase, Empty, ErrorNotice, Field, Loading, Money, Notice, Phrase, StateBadge, Table } from '../../components/ui';
import { useI18n, type Key } from '../../i18n';
import { formatDate, formatDateTime, formatInstant, formatInt } from '../../lib/format';
import { detailOf } from '../../lib/trial';
import { BusinessTrial } from './BusinessTrial';
import { BusinessGrace, BusinessMessages } from './BusinessLifecycle';
import { ConsoleStore, SetupPanel, TestBadge, TestBanner, TestStatus } from './provisioning';
import { DeferredAccounts, PhoneVerificationBadge, PilotStatus, TestStaff } from './deferral';
import { SeatRequestActions } from './SeatRequestActions';
import { useStepUp } from './useStepUp';

type Decision = 'approve' | 'reject' | 'period' | 'extend' | 'suspend' | 'reinstate' | 'cancel' | 'grant' | 'payment';

const ROUTE: Record<Decision, string> = {
  approve: 'approve',
  reject: 'reject',
  period: 'period',
  extend: 'extend',
  suspend: 'suspend',
  reinstate: 'reinstate',
  cancel: 'cancel',
  grant: 'activate-grant',
  payment: 'payments',
};

/**
 * Which decisions make sense where the subscription stands. The server refuses the rest anyway.
 *
 * A free trial is not a status (2026-10-13): a business in its trial, or after it, is still `pending_activation`, so
 * it is offered approve, refuse and grant — and paid or granted access decided while a trial runs starts when the
 * trial ends, which the server sets. None creates, extends or shortens a trial; there is no decision here that could.
 */
function decisionsFor(status: string | undefined, isTest = false): Decision[] {
  // A test business is never paid for (D217): its access is a grant, so no payment is offered.
  if (isTest) return decisionsFor(status).filter((d) => d !== 'payment');
  switch (status) {
    case 'pending_activation':
    case 'rejected':
      return ['approve', 'reject', 'grant'];
    case 'suspended':
      return ['reinstate', 'cancel'];
    case 'cancelled':
      return ['approve'];
    default:
      return ['extend', 'period', 'payment', 'suspend', 'cancel', 'grant'];
  }
}

export function Business() {
  const { id = '' } = useParams();
  const { t, lang } = useI18n();
  const [data, setData] = useState<BusinessDetail | null>(null);
  const [requests, setRequests] = useState<SeatRequest[]>([]);
  const [error, setError] = useState<unknown>(null);
  /** The last decision's result, kept above the requests: the decided row may leave or change in the reloaded list. */
  const [outcome, setOutcome] = useState<ReactNode[] | null>(null);
  const { ask, dialog } = useStepUp();

  const load = useCallback(async () => {
    try {
      const [d, r] = await Promise.all([adminRequest<BusinessDetail>(`platform/businesses/${id}`), adminRequest<SeatRequest[]>(`platform/businesses/${id}/seat-requests`)]);
      setData(d);
      setRequests(r);
      setError(null);
    } catch (e) {
      setError(e);
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);

  if (error && !data) return <ErrorNotice error={error} />;
  if (!data) return <Loading />;
  const ent = data.entitlement;
  // A business with a free trial has its access dates told in its zone: access decided during the trial runs from its end.
  const accessZone = ent?.trial ? trialZone(data) : null;
  // Each branch's activity and scheduled change, and its fee on the server's quote (D154): the price components.
  const branchOf = (id: string) => data.branches.find((b) => b.id === id);
  const feeOf = (id: string) => data.pricing?.quote.lines.find((l) => l.branchId === id)?.activityFee;

  return (
    <div className="stack">
      {dialog}
      <section className="hero row spread">
        <div>
          <h1>{data.name}</h1>
          <p className="lead row">
            <StateBadge state={ent?.state} />
            {data.isTest ? <TestBadge /> : null}
            <span className="ltr muted">{data.publicStoreId}</span>
            {data.city ? <span className="muted">{data.city}</span> : null}
            <span className="muted small">{t('admin.business.version', { n: formatInt(data.version, lang) })}</span>
          </p>
        </div>
        <button type="button" className="btn btn-sm" onClick={() => void load()}>
          {t('action.refresh')}
        </button>
      </section>
      <ErrorNotice error={error} />
      {data.isTest ? <TestBanner /> : null}

      <SetupPanel business={data} ask={ask} onDone={load} />

      <BusinessTrial business={data} />

      <BusinessGrace grace={ent?.grace} timeZone={ent?.timeZone} />

      <BusinessMessages businessId={id} timeZone={ent?.timeZone} version={data} />

      <Decisions business={data} ask={ask} onDone={load} />

      <ConsoleStore business={data} ask={ask} onDone={load} />

      <DeferredAccounts business={data} ask={ask} onDone={load} />

      <TestStaff business={data} ask={ask} onDone={load} />

      <section className="grid">
        <div className="card stack">
          <h2>{t('account.stores')}</h2>
          {ent && ent.seatsByStore.length > 0 ? (
            <Table
              columns={[
                { label: t('account.quote.store'), render: (s) => s.name },
                {
                  label: t('account.stores.activity'),
                  render: (s) => <ActivityWithNext activity={s.activity ?? branchOf(s.branchId)?.activity} next={s.activityNext ?? branchOf(s.branchId)?.activityNext} />,
                },
                {
                  label: t('account.quote.activityFee'),
                  render: (s) => {
                    const fee = feeOf(s.branchId);
                    return typeof fee === 'number' ? <Money amount={fee} /> : '—';
                  },
                },
                { label: t('account.quote.staff'), render: (s) => formatInt(s.seatsUsed, lang) },
                { label: t('account.quote.included'), render: (s) => formatInt(s.includedSeats, lang) },
                { label: t('account.quote.paid'), render: (s) => formatInt(s.paidSeats, lang) },
                { label: t('account.quote.granted'), render: (s) => formatInt(s.grantedSeats, lang) },
                { label: t('admin.businesses.state'), render: (s) => (s.overLimit ? <Badge tone="warn">{t('account.quote.over')}</Badge> : <Badge tone="ok">{formatInt(s.seatsAvailable, lang)}</Badge>) },
              ]}
              rows={ent.seatsByStore}
              keyOf={(s) => s.branchId}
            />
          ) : (
            <ul>
              {data.branches.map((b) => (
                <li key={b.id}>
                  {b.name}
                  {b.activity ? <ActivityWithNext activity={b.activity} next={b.activityNext} /> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card stack">
          <h2>{t('account.quote')}</h2>
          {data.pricing ? (
            <>
              <div className="kpi">
                <span className="value">
                  <Money amount={data.pricing.quote.monthlyTotal} />
                </span>
                <span className="label">{t('account.quote.total')}</span>
              </div>
              <p className="muted small">
                {t('account.quote.storesFee')}: <Money amount={data.pricing.quote.branchFee} /> · {t('account.quote.seatsFee')}: <Money amount={data.pricing.quote.staffFee} />
              </p>
              {data.pricing.currentPeriod.available ? (
                <p className="muted small">{t('account.quote.assessed', { amount: `${formatInt(data.pricing.currentPeriod.assessedTotal, lang)} MRU` })}</p>
              ) : null}
              {ent?.periodEnd ? (
                <p className="muted small">
                  <DatedPhrase phrase="account.period.ends" dates={{ date: ent.periodEnd }} timeZone={accessZone} />
                </p>
              ) : null}
              <div className="muted small">
                <GrantLine grant={ent?.complimentary} timeZone={accessZone} />
              </div>
            </>
          ) : (
            <Empty />
          )}
        </div>
      </section>

      <section className="card stack">
        <h2>{t('admin.business.people')}</h2>
        <Table
          columns={[
            { label: t('apply.owner'), render: (p) => <strong>{p.name}</strong> },
            {
              label: t('apply.email'),
              render: (p) => (
                <span className="row">
                  {p.email ? (
                    <>
                      <span className="ltr">{p.email}</span>
                      <Badge tone={p.emailVerified ? 'ok' : 'warn'}>{p.emailVerified ? t('admin.business.verified') : t('admin.business.unverified')}</Badge>
                    </>
                  ) : null}
                  {p.phone ? (
                    <>
                      <span className="ltr">{p.phone}</span>
                      <PhoneVerificationBadge state={p.phoneVerification} verified={p.phoneVerified} />
                    </>
                  ) : null}
                </span>
              ),
            },
            {
              label: t('admin.businesses.state'),
              render: (p) => (
                <Badge tone={p.status === 'active' ? 'ok' : p.status === 'pending' ? 'info' : 'muted'}>{t(`admin.business.people.${p.status}` as Key)}</Badge>
              ),
            },
            { label: t('admin.audit.when'), render: (p) => formatDateTime(p.lastLoginAt, lang) },
          ]}
          rows={data.people}
          keyOf={(p) => p.id}
        />
      </section>

      <TestStatus business={data} ask={ask} onDone={load} />

      <PilotStatus business={data} ask={ask} onDone={load} />

      <section className="card stack">
        <h2>{t('admin.seats.title')}</h2>
        {outcome ? (
          <Notice tone="ok">
            {outcome.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </Notice>
        ) : null}
        {requests.some(paidDuringTrial) ? <Notice tone="info">{t('admin.trial.addonsPaidNote')}</Notice> : null}
        {requests.length === 0 ? (
          <Empty text={t('account.requests.none')} />
        ) : (
          <Table
            columns={[
              { label: t('admin.seats.request'), render: (r) => <RequestSummary request={r} /> },
              { label: t('admin.seats.amount'), render: (r) => <RequestAmount request={r} /> },
              { label: t('admin.businesses.state'), render: (r) => <RequestStatus request={r} /> },
              { label: t('admin.action.reference'), render: (r) => <span className="ltr">{r.payment?.reference ?? '—'}</span> },
              { label: t('admin.seats.requested'), render: (r) => formatDateTime(r.requestedAt, lang) },
              { label: '', render: (r) => <SeatRequestActions companyId={data.id} request={r} ask={ask} onDone={load} onOutcome={setOutcome} /> },
            ]}
            rows={requests}
            keyOf={(r) => r.id}
          />
        )}
      </section>

      <section className="grid">
        <div className="card stack">
          <h2>{t('account.payments')}</h2>
          {data.payments.length === 0 ? (
            <Empty text={t('account.payments.none')} />
          ) : (
            <Table
              columns={[
                { label: t('admin.audit.when'), render: (p) => formatDate(p.paidAt, lang) },
                { label: t('admin.action.amount'), render: (p) => <Money amount={p.amount} /> },
                { label: t('admin.action.reference'), render: (p) => <span className="ltr">{p.reference ?? '—'}</span> },
                { label: t('admin.audit.actor'), render: (p) => <span className="ltr">{p.confirmedBy ?? p.recordedBy}</span> },
              ]}
              rows={data.payments}
              keyOf={(p) => p.id}
            />
          )}
          <p className="muted small">{t('account.payments.recorded')}</p>
        </div>
        <div className="card stack">
          <h2>{t('account.timeline')}</h2>
          <Timeline events={data.events} trial={timelineTrial(data)} actors />
        </div>
      </section>
    </div>
  );
}

/**
 * A store or seat paid for during a free trial (D176): still scheduled, or in force since it was — the server sets
 * `effectiveAt` on no other row (an API older than it sends none). Its own payment covers what the first paid period
 * charges for it, so that charge must not be collected again.
 */
function paidDuringTrial(r: SeatRequest): boolean {
  return r.status === 'scheduled' || r.effectiveAt != null;
}

/** The trial facts the console holds, for the trial's own events in the history: the recorded claim, in the business's zone. */
function timelineTrial(business: BusinessDetail): TimelineTrial | null {
  const timeZone = business.trial?.timeZone ?? business.entitlement?.trial?.timeZone;
  if (!timeZone) return null;
  const claim = business.trial?.claim ?? business.entitlement?.trial ?? null;
  return { timeZone, startedAt: claim?.startedAt ?? null, endsAt: claim?.endsAt ?? null };
}

/** The business's zone, the one its trial dates are shown in. */
function trialZone(business: BusinessDetail): string | null {
  return business.trial?.timeZone ?? business.entitlement?.trial?.timeZone ?? null;
}

/** The end of a trial still running: paid access decided now starts there, so an end date must lie after it. */
function runningTrialEnd(business: BusinessDetail): string | null {
  return business.entitlement?.trial?.status === 'active' ? (business.trial?.claim?.endsAt ?? business.entitlement.trial.endsAt) : null;
}

/**
 * A decision the server refused, in words. An end date inside a running trial (`period_ends_before_trial_end`) is a
 * date to choose again, not something to try again: it names the trial's end — the server's, when it sends it — in the
 * business's zone. Every other refusal is said the way every page says one.
 */
function DecisionRefusal({ error, business }: { error: unknown; business: BusinessDetail }) {
  const { t, lang } = useI18n();
  if (!(error instanceof ApiError) || error.code !== 'period_ends_before_trial_end') return <ErrorNotice error={error} />;
  const end = detailOf<string>(error, 'trialEndsAt') ?? business.trial?.claim?.endsAt ?? business.entitlement?.trial?.endsAt ?? null;
  return (
    <Notice tone="danger" title={t('admin.trial.periodEnd.title')}>
      {end ? <Phrase text={t('admin.trial.periodEnd.refused')} values={{ date: formatInstant(end, trialZone(business), lang) }} /> : t('admin.trial.periodEnd.refusedUndated')}
    </Notice>
  );
}

function Decisions({ business, ask, onDone }: { business: BusinessDetail; ask: () => Promise<string | null>; onDone: () => Promise<void> }) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState<Decision | null>(null);
  const [form, setForm] = useState({ months: '1', periodEnd: '', days: '14', reason: '', amount: '', paidAt: new Date().toISOString().slice(0, 10), channel: 'bank_transfer', reference: '', note: '', confirm: true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState<string | null>(null);
  const available = decisionsFor(business.entitlement?.status, business.isTest === true);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!open) return;
    setError(null);
    const confirmPassword = await ask();
    if (!confirmPassword) return;
    setBusy(true);
    try {
      const reason = form.reason.trim() || undefined;
      const common = { expectedVersion: business.version, confirmPassword };
      let body: Record<string, unknown>;
      switch (open) {
        case 'approve':
          body = form.periodEnd ? { periodEnd: new Date(form.periodEnd).toISOString(), reason, ...common } : { months: Number(form.months), reason, ...common };
          break;
        case 'period':
          body = { periodEnd: new Date(form.periodEnd).toISOString(), reason, ...common };
          break;
        case 'extend':
          body = { months: Number(form.months), reason, ...common };
          break;
        case 'grant':
          body = { days: Number(form.days), reason: form.reason.trim(), ...common };
          break;
        case 'payment':
          body = {
            amount: form.amount.trim(),
            paidAt: new Date(form.paidAt).toISOString(),
            channel: form.channel,
            reference: form.reference.trim() || undefined,
            note: form.note.trim() || undefined,
            confirm: form.confirm,
            confirmPassword,
          };
          break;
        default:
          body = { reason: form.reason.trim(), ...common };
      }
      const r = await adminRequest<{ applied?: boolean }>(`platform/businesses/${business.id}/${ROUTE[open]}`, { method: 'POST', body });
      setDone(r && r.applied === false ? t('admin.action.noop') : t('admin.action.applied'));
      setOpen(null);
      await onDone();
    } catch (err) {
      setError(err);
      if (err instanceof ApiError && err.status === 409) await onDone();
    } finally {
      setBusy(false);
    }
  };

  const needsReason = open === 'reject' || open === 'suspend' || open === 'reinstate' || open === 'cancel' || open === 'grant';
  const trialEnd = runningTrialEnd(business);

  return (
    <section className="card stack">
      <h2>{t('admin.business.actions')}</h2>
      <div className="row">
        {available.map((d) => (
          <button key={d} type="button" className={`btn btn-sm ${d === 'reject' || d === 'suspend' || d === 'cancel' ? 'btn-danger' : ''}`} onClick={() => (setDone(null), setOpen(d))}>
            {t(`admin.action.${d}` as Key)}
          </button>
        ))}
      </div>
      {done ? <Notice tone="ok">{done}</Notice> : null}
      {open ? (
        <form className="stack" onSubmit={submit}>
          <h3>{t(`admin.action.${open}` as Key)}</h3>
          {open === 'approve' || open === 'extend' ? (
            <Field label={open === 'approve' ? t('admin.action.approve.months') : t('admin.action.extend.months')}>
              <input type="number" min={1} max={60} value={form.months} onChange={(e) => setForm({ ...form, months: e.target.value })} />
            </Field>
          ) : null}
          {open === 'approve' || open === 'period' ? (
            <Field
              label={open === 'approve' ? t('admin.action.approve.periodEnd') : t('admin.action.period')}
              hint={trialEnd ? <Phrase text={t('admin.trial.periodEnd.hint')} values={{ date: formatInstant(trialEnd, trialZone(business), lang) }} /> : undefined}
            >
              <input type="date" required={open === 'period'} value={form.periodEnd} onChange={(e) => setForm({ ...form, periodEnd: e.target.value })} />
            </Field>
          ) : null}
          {open === 'grant' ? (
            <Field label={t('admin.action.grant.days')}>
              <input type="number" min={1} value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} />
            </Field>
          ) : null}
          {open === 'payment' ? (
            <>
              <div className="grid">
                <Field label={t('admin.action.amount')}>
                  <input required inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} dir="ltr" />
                </Field>
                <Field label={t('admin.action.paidAt')}>
                  <input required type="date" value={form.paidAt} onChange={(e) => setForm({ ...form, paidAt: e.target.value })} />
                </Field>
                <Field label={t('admin.action.channel')}>
                  <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
                    <option value="bank_transfer">{t('admin.action.channel.bank_transfer')}</option>
                    <option value="mobile_money">{t('admin.action.channel.mobile_money')}</option>
                    <option value="manual">{t('admin.action.channel.manual')}</option>
                  </select>
                </Field>
              </div>
              <Field label={t('admin.action.reference')} hint={t('admin.action.reference.required')}>
                <input required minLength={3} maxLength={120} value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} dir="ltr" />
              </Field>
              <Field label={t('admin.action.note')}>
                <textarea maxLength={500} rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </Field>
              <label className="row">
                <input type="checkbox" checked={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.checked })} className="checkbox-inline" />
                {t('admin.action.confirmNow')}
              </label>
            </>
          ) : (
            <Field label={t('admin.action.reason')} hint={needsReason ? t('admin.action.reason.required') : undefined}>
              <input required={needsReason} maxLength={500} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </Field>
          )}
          <DecisionRefusal error={error} business={business} />
          <div className="row">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {t('action.confirm')}
            </button>
            <button type="button" className="btn" onClick={() => setOpen(null)}>
              {t('action.cancel')}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
