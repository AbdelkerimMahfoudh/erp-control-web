import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { BusinessNames } from './names';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '../../api/client';
import type { BusinessDetail, PaymentProof, SeatRequest } from '../../api/types';
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
import { StoreStatusList } from '../../components/stores';
import { BusinessGrace, BusinessMessages } from './BusinessLifecycle';
import { ConsoleStore, ProvisioningDraft, SetupPanel, TestBadge, TestBanner, TestStatus } from './provisioning';
import { DeferredAccounts, PhoneVerificationBadge, ProvisionStaff } from './deferral';
import { SeatRequestActions } from './SeatRequestActions';
import { useStepUp } from './useStepUp';
import { AccountReadyResend, BusinessDeletion } from './BusinessDeletion';
import { BusinessProofs } from './BusinessProofs';
import { categoryBody, DEFAULT_CHOICE, PaymentCategoryFields, type CategoryChoice } from './PaymentCategoryFields';

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

/** Owner, 2026-11-12 (layout review, approved): one business as a summary and five focused tabs. */
export const BUSINESS_TABS = ['stores', 'payments', 'people', 'history', 'settings'] as const;
export type BusinessTab = (typeof BUSINESS_TABS)[number];
/** The tab chosen, kept in memory for the visit: back from the review page, the same tab. */
let rememberedBusinessTab: BusinessTab = 'stores';
/** For tests and for links that must land on one tab. */
export function openBusinessTab(tab: BusinessTab): void {
  rememberedBusinessTab = tab;
}

/** The access decisions, kept with the payments; the business's status ones, kept in its settings. */
const ACCESS_DECISIONS: Decision[] = ['approve', 'grant', 'extend', 'period', 'payment'];
const STATUS_DECISIONS: Decision[] = ['reject', 'suspend', 'reinstate', 'cancel'];

/** The one thing this business is waiting for, said first: a proof to review, a store waiting, or access to decide. */
type NextAction = { kind: 'proof' } | { kind: 'store'; count: number } | { kind: 'access' } | null;
function nextActionOf(data: BusinessDetail, requests: SeatRequest[], proofs: PaymentProof[] | null): NextAction {
  if (proofs?.some((p) => p.status === 'submitted' || p.status === 'under_review')) return { kind: 'proof' };
  const waiting = requests.filter((r) => r.kind === 'store' && r.status === 'pending_payment').length;
  if (waiting > 0) return { kind: 'store', count: waiting };
  if (data.entitlement?.status === 'pending_activation') return { kind: 'access' };
  return null;
}

export function Business() {
  const { id = '' } = useParams();
  const { t, lang } = useI18n();
  const [data, setData] = useState<BusinessDetail | null>(null);
  const [requests, setRequests] = useState<SeatRequest[]>([]);
  const [proofs, setProofs] = useState<PaymentProof[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  /** The last decision's result, kept above the requests: the decided row may leave or change in the reloaded list. */
  const [outcome, setOutcome] = useState<ReactNode[] | null>(null);
  const [tab, setTabState] = useState<BusinessTab>(() => rememberedBusinessTab);
  const setTab = (next: BusinessTab) => {
    rememberedBusinessTab = next;
    setTabState(next);
  };
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
    // The proofs are read beside the page, never in its way: an API without the per-business list shows none.
    try {
      setProofs(await adminRequest<PaymentProof[]>(`platform/payment-proofs?company=${encodeURIComponent(id)}`));
    } catch {
      setProofs([]);
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
  const next = nextActionOf(data, requests, proofs);
  const storeCount = data.storeStatus?.length ?? data.branches.length;

  return (
    <div className="stack">
      {dialog}
      <section className="card stack business-summary" aria-labelledby="business-h">
        <div className="row spread">
          <div className="stack-tight">
            <h1 id="business-h">{data.name}</h1>
            <p className="row">
              <StateBadge state={ent?.state} />
              {data.isTest ? <TestBadge /> : null}
              <span className="ltr muted">{data.publicStoreId}</span>
              {data.city ? <span className="muted">{data.city}</span> : null}
            </p>
          </div>
          <div className="row">
            {next?.kind === 'proof' ? (
              <Link className="btn btn-primary" to="/admin/proofs">
                {t('admin.next.reviewProof')}
              </Link>
            ) : next?.kind === 'store' ? (
              <button type="button" className="btn btn-primary" onClick={() => setTab('stores')}>
                {t('admin.next.storeWaiting', { n: formatInt(next.count, lang) })}
              </button>
            ) : next?.kind === 'access' ? (
              <button type="button" className="btn btn-primary" onClick={() => setTab('payments')}>
                {t('admin.next.decideAccess')}
              </button>
            ) : null}
            <button type="button" className="btn btn-sm" onClick={() => void load()}>
              {t('action.refresh')}
            </button>
          </div>
        </div>
        <dl className="summary-facts">
          <div>
            <dt>{t('admin.summary.paidUntil')}</dt>
            <dd>{ent?.periodEnd ? formatInstant(ent.periodEnd, accessZone, lang) : '—'}</dd>
          </div>
          <div>
            <dt>{t('admin.summary.stores')}</dt>
            <dd>{formatInt(storeCount, lang)}</dd>
          </div>
          <div>
            <dt>{t('account.quote.total')}</dt>
            <dd>{data.pricing ? <Money amount={data.pricing.quote.monthlyTotal} /> : '—'}</dd>
          </div>
          <div>
            <dt>{t('admin.summary.version')}</dt>
            <dd>{formatInt(data.version, lang)}</dd>
          </div>
        </dl>
      </section>
      <ErrorNotice error={error} />
      {data.isTest ? <TestBanner /> : null}

      {/* Setting a business up comes before everything else, whichever tab is open. */}
      <ProvisioningDraft business={data} ask={ask} onDone={load} />
      <SetupPanel business={data} ask={ask} onDone={load} />

      <nav className="portal-tabs" role="tablist" aria-label={t('admin.tabs.label')}>
        {BUSINESS_TABS.map((k) => (
          <button key={k} type="button" role="tab" id={`btab-${k}`} aria-selected={tab === k} aria-controls={`bpanel-${k}`} className={tab === k ? 'portal-tab active' : 'portal-tab'} onClick={() => setTab(k)}>
            {t(`admin.tabs.${k}` as Key)}
          </button>
        ))}
      </nav>

      {tab === 'stores' ? (
        <div className="stack" role="tabpanel" id="bpanel-stores" aria-labelledby="btab-stores">
          {data.storeStatus?.length ? (
            <section className="card stack" aria-labelledby="stores-h">
              <h2 id="stores-h">{t('admin.stores.title')}</h2>
              <StoreStatusList stores={data.storeStatus} />
            </section>
          ) : null}

          <section className="card stack">
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
          </section>

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

          <ConsoleStore business={data} ask={ask} onDone={load} />
          <BusinessNames business={data} ask={ask} onDone={load} />
        </div>
      ) : null}

      {tab === 'payments' ? (
        <div className="stack" role="tabpanel" id="bpanel-payments" aria-labelledby="btab-payments">
          <section className="card stack">
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
          </section>

          <BusinessProofs proofs={proofs} />

          <section className="card stack">
            <h2>{t('account.payments')}</h2>
            {data.payments.length === 0 ? (
              <Empty text={t('account.payments.none')} />
            ) : (
              <Table
                columns={[
                  { label: t('admin.audit.when'), render: (p) => formatDate(p.paidAt, lang) },
                  { label: t('admin.action.amount'), render: (p) => <Money amount={p.amount} /> },
                  // 0134: what each payment was for (an older one says nothing).
                  { label: t('payment.category'), render: (p) => (p.category ? t(`payment.category.${p.category}` as Key) + (p.details?.months ? ' · ' + t('payment.months.n', { n: String(p.details.months) }) : '') + (p.details?.seats ? ' · ' + t('payment.seats.n', { n: String(p.details.seats) }) : '') : '—') },
                  { label: t('admin.action.reference'), render: (p) => <span className="ltr">{p.reference ?? '—'}</span> },
                  { label: t('admin.audit.actor'), render: (p) => <span className="ltr">{p.confirmedBy ?? p.recordedBy}</span> },
                ]}
                rows={data.payments}
                keyOf={(p) => p.id}
              />
            )}
            <p className="muted small">{t('account.payments.recorded')}</p>
          </section>

          <Decisions business={data} ask={ask} onDone={load} kinds={ACCESS_DECISIONS} title={t('admin.business.actions')} />
          <BusinessTrial business={data} />
          <BusinessGrace grace={ent?.grace} timeZone={ent?.timeZone} />
        </div>
      ) : null}

      {tab === 'people' ? (
        <div className="stack" role="tabpanel" id="bpanel-people" aria-labelledby="btab-people">
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
                  render: (p) => <Badge tone={p.status === 'active' ? 'ok' : p.status === 'pending' ? 'info' : 'muted'}>{t(`admin.business.people.${p.status}` as Key)}</Badge>,
                },
                { label: t('admin.audit.when'), render: (p) => formatDateTime(p.lastLoginAt, lang) },
              ]}
              rows={data.people}
              keyOf={(p) => p.id}
            />
          </section>
          <DeferredAccounts business={data} ask={ask} onDone={load} />
          <ProvisionStaff business={data} ask={ask} onDone={load} />
          <AccountReadyResend businessId={id} ask={ask} />
        </div>
      ) : null}

      {tab === 'history' ? (
        <div className="stack" role="tabpanel" id="bpanel-history" aria-labelledby="btab-history">
          <BusinessMessages businessId={id} timeZone={ent?.timeZone} version={data} />
          <section className="card stack">
            <h2>{t('account.timeline')}</h2>
            <Timeline events={data.events} trial={timelineTrial(data)} actors />
          </section>
        </div>
      ) : null}

      {tab === 'settings' ? (
        <div className="stack" role="tabpanel" id="bpanel-settings" aria-labelledby="btab-settings">
          <TestStatus business={data} ask={ask} onDone={load} />
          <Decisions business={data} ask={ask} onDone={load} kinds={STATUS_DECISIONS} title={t('admin.business.statusActions')} />
          {/* Never beside an everyday button: deleting the business has its own zone and its own confirmation. */}
          <section className="danger-zone stack" aria-labelledby="danger-h">
            <h2 id="danger-h">{t('admin.business.danger')}</h2>
            <BusinessDeletion businessId={id} ask={ask} onDone={load} />
          </section>
        </div>
      ) : null}
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

/** Calendar months after an instant: the server's `monthsFrom` (subscription-lifecycle.service.ts), for the preview only. */
export function monthsAfter(from: string, months: number): string {
  const end = new Date(from);
  end.setMonth(end.getMonth() + months);
  return end.toISOString();
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

function Decisions({ business, ask, onDone, kinds, title }: { business: BusinessDetail; ask: () => Promise<boolean>; onDone: () => Promise<void>; kinds: Decision[]; title: string }) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState<Decision | null>(null);
  const [form, setForm] = useState({ months: '1', periodEnd: '', days: '14', reason: '', amount: '', paidAt: new Date().toISOString().slice(0, 10), channel: 'bank_transfer', reference: '', note: '', confirm: true });
  const [choice, setChoice] = useState<CategoryChoice>(DEFAULT_CHOICE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState<string | null>(null);
  const available = decisionsFor(business.entitlement?.status, business.isTest === true).filter((d) => kinds.includes(d));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!open) return;
    setError(null);
    if (!(await ask())) return;
    setBusy(true);
    try {
      const reason = form.reason.trim() || undefined;
      const common = { expectedVersion: business.version };
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
            // 0134: what it pays for; the server checks the amount is its price.
            ...categoryBody(choice),
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
      <h2>{title}</h2>
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
              {open === 'approve' && trialEnd && !form.periodEnd && Number(form.months) >= 1 ? (
                // Counted from the trial's end, as the server counts it (`monthsFrom`): no zero-length period, no grace rule
                // changed (owner, 2026-11-05).
                <p className="muted small">
                  <Phrase
                    text={t('admin.trial.approve.fromTrial')}
                    values={{ start: formatInstant(trialEnd, trialZone(business), lang), end: formatInstant(monthsAfter(trialEnd, Number(form.months)), trialZone(business), lang) }}
                  />
                </p>
              ) : null}
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
              <PaymentCategoryFields
                businessId={business.id}
                stores={business.storeStatus ?? []}
                choice={choice}
                onChoice={setChoice}
                onPrice={(amount) => setForm((f) => ({ ...f, amount: amount ?? (choice.category === 'other' ? f.amount : '') }))}
              />
              <div className="grid">
                <Field label={t('admin.action.amount')}>
                  <input required inputMode="decimal" readOnly={choice.category !== 'other'} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} dir="ltr" />
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
              <Field label={t('admin.action.note')} hint={choice.category === 'other' ? t('admin.action.reason.required') : undefined}>
                <textarea required={choice.category === 'other'} maxLength={500} rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
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
