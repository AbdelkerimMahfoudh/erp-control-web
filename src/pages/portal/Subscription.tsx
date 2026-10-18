import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { ApiError } from '../../api/client';
import type {
  Activity,
  ActivityOption,
  ActivityOptions,
  Entitlement,
  GraceView,
  MySubscription,
  NewStoreOption,
  NoticeTimeline,
  PaymentInstructions,
  PortalStatus,
  QuoteLine,
  RequestResult,
  SeatRequest,
  SubscriptionBranch,
  TrialView,
} from '../../api/types';
import { isUnauthorized, ownerRequest, portalChooseAccount, portalSession, portalSignIn, portalSignOut, type AccountChoice, type PortalSession } from '../../auth/owner';
import { ActivityCards, ActivityName, ActivityWithNext } from '../../components/activity';
import { GrantLine } from '../../components/grant';
import { FailureNote, FallbackNote, NoticeStateBadge, Where, noticeName } from '../../components/notices';
import { PublicLink } from '../../components/PortalChrome';
import { RequestAmount, RequestStatus, RequestSummary } from '../../components/requests';
import { Timeline, type TimelineTrial } from '../../components/timeline';
import { Badge, DatedPhrase, Empty, ErrorNotice, Field, Loading, Money, Notice, Phrase, requestStatusKey, StateBadge, Table, type Tone } from '../../components/ui';
import { useI18n, type Key, type Language } from '../../i18n';
import { ACTIVITIES, canWithdraw, isScheduledActivityChange, pricesAfter } from '../../lib/activity';
import { formatDate, formatInstant, formatInt, formatMru } from '../../lib/format';
import { TrialCard } from './TrialCard';

type Session =
  | { kind: 'checking' }
  | { kind: 'anonymous' }
  /** Signed in, but not as an Owner: the portal is the Owner's (403 `owner_only`). */
  | { kind: 'not_owner' }
  | { kind: 'signed'; session: PortalSession; data: MySubscription };

/**
 * The Owner's page on the Dukan ERP portal (0099; docs/101 §4): https://dukan.tsxmr.com/subscription. The Owner signs
 * in here with the same identity as the app — the WhatsApp number or email address and the password — and the page
 * asks the API whether a portal session exists and believes the answer; it never gates on what it can see locally.
 *
 * Everything shown is the server's: the access the business has, the paid period, the grace and its allowance, the
 * free trial and its claim, the stores and seats, the payments and the history, and where the subscription messages
 * stand. Nothing here works out a date, a price, an eligibility or a remaining time.
 */
export function Subscription() {
  const { t } = useI18n();
  const [session, setSession] = useState<Session>({ kind: 'checking' });
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    try {
      const current = await portalSession();
      if (!current) {
        setSession({ kind: 'anonymous' });
        return;
      }
      const data = await ownerRequest<MySubscription>('platform/my-subscription');
      setSession({ kind: 'signed', session: current, data });
      setError(null);
    } catch (e) {
      if (isUnauthorized(e)) setSession({ kind: 'anonymous' });
      else if (e instanceof ApiError && e.status === 403) setSession({ kind: 'not_owner' });
      else {
        setError(e);
        setSession((s) => (s.kind === 'checking' ? { kind: 'anonymous' } : s));
      }
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const signOut = async () => {
    await portalSignOut();
    setSession({ kind: 'anonymous' });
  };

  if (session.kind === 'checking') return <Loading />;
  if (session.kind === 'not_owner') {
    return (
      <div className="stack">
        <section className="hero">
          <h1>{t('portal.title')}</h1>
        </section>
        <Notice tone="warn">{t('portal.ownerOnly')}</Notice>
        <div className="row">
          <button type="button" className="btn" onClick={() => void signOut()}>
            {t('action.signOut')}
          </button>
        </div>
      </div>
    );
  }
  if (session.kind === 'anonymous') {
    return (
      <div className="stack">
        <section className="hero">
          <h1>{t('portal.title')}</h1>
          <p className="lead">{t('portal.signin.lead')}</p>
        </section>
        <ErrorNotice error={error} />
        <SignIn onSigned={load} />
        <p className="muted small">{t('portal.signin.help')}</p>
      </div>
    );
  }
  return <SubscriptionView session={session.session} data={session.data} reload={load} onSignOut={signOut} />;
}

function SignIn({ onSigned }: { onSigned: () => Promise<void> }) {
  const { t } = useI18n();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<'credentials' | 'owner_only' | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [choice, setChoice] = useState<{ continuationToken: string; accounts: AccountChoice[] } | null>(null);

  const refusal = (err: unknown) => {
    if (isUnauthorized(err)) setFailed('credentials');
    else if (err instanceof ApiError && err.code === 'owner_only') setFailed('owner_only');
    else setError(err);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFailed(null);
    setError(null);
    try {
      const result = await portalSignIn(identifier.trim(), password);
      if (result.status === 'choose_account') setChoice({ continuationToken: result.continuationToken, accounts: result.accounts });
      else await onSigned();
    } catch (err) {
      refusal(err);
    } finally {
      setBusy(false);
    }
  };

  const choose = async (accountRef: string) => {
    if (!choice) return;
    setBusy(true);
    setFailed(null);
    setError(null);
    try {
      await portalChooseAccount(choice.continuationToken, accountRef);
      await onSigned();
    } catch (err) {
      refusal(err);
    } finally {
      setBusy(false);
    }
  };

  if (choice) {
    return (
      <div className="card stack">
        <p>{t('account.choice')}</p>
        {choice.accounts.map((a) => (
          <button key={a.accountRef} type="button" className="btn" disabled={busy} onClick={() => void choose(a.accountRef)}>
            {a.companyName} — {a.userName}
          </button>
        ))}
        {failed === 'owner_only' ? <Notice tone="danger">{t('portal.ownerOnly')}</Notice> : null}
        <ErrorNotice error={error} />
      </div>
    );
  }

  return (
    <form className="card stack" onSubmit={submit}>
      <Field label={t('account.identifier')}>
        <input required autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} dir="ltr" />
      </Field>
      <Field label={t('account.password')}>
        <input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      {failed === 'credentials' ? <Notice tone="danger">{t('account.signin.failed')}</Notice> : null}
      {failed === 'owner_only' ? <Notice tone="danger">{t('portal.ownerOnly')}</Notice> : null}
      <ErrorNotice error={error} />
      <div className="row">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {t('action.signIn')}
        </button>
      </div>
    </form>
  );
}

const EXPLAIN_WITH_DATE = new Set(['active', 'grace', 'expired']);

/**
 * The lead sentence. A grant is told with its own end (docs/73 §11.5) — never the paid period's, and never the
 * latest billing period's start, which is what this page once showed as "granted until". A trial is told with the end
 * the server recorded at its claim, in the business's own zone (2026-10-13) — and so are the ends of a business that
 * had one, as the period card tells them.
 */
function explanation(ent: Entitlement, t: (k: Key, p?: Record<string, string>) => string, lang: Language): ReactNode {
  const { state, periodEnd, complimentary: grant, trial } = ent;
  if (state === 'trial_active' || state === 'trial_expired') {
    if (!trial?.endsAt) return t(`status.explain.${state}.undated`);
    return <Phrase text={t(`status.explain.${state}`)} values={{ date: formatInstant(trial.endsAt, trial.timeZone, lang) }} />;
  }
  const dated = (phrase: Key, date: string | null) => <DatedPhrase phrase={phrase} dates={{ date }} timeZone={trial?.timeZone} />;
  if (state === 'complimentary') {
    if (grant?.until) return dated('status.explain.complimentary', grant.until);
    // "No end date" only when the server says so; an older API without the grant view gets no claim about the date.
    return grant?.status === 'indefinite' ? t('status.explain.complimentary.noDate') : t('status.explain.complimentary.undated');
  }
  // Expired with no paid period behind it: the grant that ended is the date there is, never "ended on —".
  if (state === 'expired' && !periodEnd) {
    return grant?.status === 'ended' && grant.until ? dated('status.explain.expired.grantEnded', grant.until) : t('status.explain.expired.noPeriod');
  }
  const key = `status.explain.${state}` as Key;
  return EXPLAIN_WITH_DATE.has(state) ? dated(key, periodEnd) : t(key);
}


function SubscriptionView({ session, data, reload, onSignOut }: { session: PortalSession; data: MySubscription; reload: () => Promise<void>; onSignOut: () => Promise<void> }) {
  const { t, lang } = useI18n();
  const ent = data.entitlement;
  const quote = data.pricing.quote;
  // Bumped after an activity request, so the requests list below reads the new row.
  const [requestsVersion, setRequestsVersion] = useState(0);
  const afterActivityRequest = useCallback(async () => {
    setRequestsVersion((v) => v + 1);
    await reload();
  }, [reload]);
  // What each change, and a new store, would cost: the server's own answer (D154), read again with the account.
  const [options, setOptions] = useState<ActivityOptions | null>(null);
  const [optionsError, setOptionsError] = useState<unknown>(null);
  useEffect(() => {
    let live = true;
    ownerRequest<ActivityOptions>('platform/my-subscription/activity-options')
      .then((o) => {
        if (!live) return;
        setOptions(o);
        setOptionsError(null);
      })
      .catch((e: unknown) => {
        if (live) setOptionsError(e);
      });
    return () => {
      live = false;
    };
  }, [data]);

  return (
    <div className="stack">
      <section className="hero row spread">
        <div>
          <h1>{data.business.name}</h1>
          <p className="lead">
            <StateBadge state={ent.state} /> {explanation(ent, t, lang)}
          </p>
          <p className="muted small">{t('portal.signedInAs', { name: session.owner.name })}</p>
        </div>
        <div className="row">
          <button type="button" className="btn btn-sm" onClick={() => void reload()}>
            {t('action.refresh')}
          </button>
          <button type="button" className="btn btn-sm" onClick={() => void onSignOut()}>
            {t('action.signOut')}
          </button>
        </div>
      </section>

      <StatusPanel version={data} />

      <TrialCard version={data} onChanged={reload} />

      <section className="grid">
        <div className="card">
          <h2>{t('account.owner')}</h2>
          {data.owner ? (
            <div className="stack">
              <strong>{data.owner.name}</strong>
              {data.owner.phone ? (
                <span className="row">
                  <span className="ltr">{data.owner.phone}</span>
                  <Badge tone={data.owner.phoneVerified ? 'ok' : 'warn'}>{data.owner.phoneVerified ? t('admin.business.verified') : t('admin.business.unverified')}</Badge>
                </span>
              ) : null}
              {data.owner.email ? (
                <span className="row">
                  <span className="ltr">{data.owner.email}</span>
                  <Badge tone={data.owner.emailVerified ? 'ok' : 'warn'}>{data.owner.emailVerified ? t('admin.business.verified') : t('admin.business.unverified')}</Badge>
                </span>
              ) : null}
              {data.owner.email && !data.owner.emailVerified ? <EmailVerification onVerified={reload} /> : null}
            </div>
          ) : (
            <Empty />
          )}
        </div>
        <div className="card">
          <h2>{t('account.period')}</h2>
          <GrantLine grant={ent.complimentary} timeZone={ent.trial?.timeZone} />
          <PeriodStart data={data} />
          {ent.periodEnd ? (
            <p>
              <DatedPhrase phrase="account.period.ends" dates={{ date: ent.periodEnd }} timeZone={ent.trial?.timeZone} />
            </p>
          ) : ent.complimentary && ent.complimentary.status !== 'none' ? null : (
            <p className="muted">{t('account.period.none')}</p>
          )}
        </div>
      </section>

      <StoreActivities data={data} options={options} optionsError={optionsError} onRequested={afterActivityRequest} />

      <section className="card stack">
        <h2>{t('account.quote')}</h2>
        <p className="muted small">{t('account.quote.body')}</p>
        <Table
          columns={[
            { label: t('account.quote.store'), render: (l) => l.name },
            { label: t('account.stores.activity'), render: (l) => (l.activity ? <ActivityName activity={l.activity} /> : '—') },
            { label: t('account.quote.activityFee'), render: (l) => (typeof l.activityFee === 'number' ? <Money amount={l.activityFee} /> : '—') },
            { label: t('account.quote.staff'), render: (l) => formatInt(l.staffCount, lang) },
            { label: t('account.quote.included'), render: (l) => formatInt(l.includedSeats, lang) },
            { label: t('account.quote.paid'), render: (l) => formatInt(l.paidSeats, lang) },
            { label: t('account.quote.granted'), render: (l) => formatInt(l.grantedSeats, lang) },
            { label: t('account.quote.fee'), render: (l) => <Money amount={l.seatFee} /> },
          ]}
          rows={quote.lines}
          keyOf={(l) => l.branchId ?? l.name}
        />
        {quote.lines.some((l) => l.overLimit) ? <Notice tone="warn">{t('account.quote.over')}</Notice> : null}
        <div className="grid">
          <div className="kpi">
            <span className="value">
              <Money amount={quote.branchFee} />
            </span>
            <span className="label">{t('account.quote.storesFee')}</span>
          </div>
          <div className="kpi">
            <span className="value">
              <Money amount={quote.staffFee} />
            </span>
            <span className="label">{t('account.quote.seatsFee')}</span>
          </div>
          <div className="kpi">
            <span className="value">
              <Money amount={quote.monthlyTotal} />
            </span>
            <span className="label">{t('account.quote.total')}</span>
          </div>
        </div>
        {data.pricing.currentPeriod.available ? (
          <p className="muted small">{t('account.quote.assessed', { amount: `${formatInt(data.pricing.currentPeriod.assessedTotal, lang)} MRU` })}</p>
        ) : null}
        <p className="muted small">{t('account.quote.next', { amount: `${formatInt(data.pricing.nextRenewalEstimate.monthlyTotal, lang)} MRU` })}</p>
      </section>

      <Requests
        stores={ent.seatsByStore.map((s) => ({ id: s.branchId, name: s.name }))}
        newStore={options?.newStore ?? null}
        trial={ent.trial ?? null}
        version={requestsVersion}
        onChanged={reload}
      />

      <HowToPay version={data} />

      <section className="card stack">
        <h2>{t('account.payments')}</h2>
        {data.payments.length === 0 ? (
          <Empty text={t('account.payments.none')} />
        ) : (
          <Table
            columns={[
              { label: t('admin.audit.when'), render: (p) => formatDate(p.paidAt, lang) },
              { label: t('admin.action.amount'), render: (p) => <Money amount={p.amount} /> },
              { label: t('admin.action.channel'), render: (p) => t(`admin.action.channel.${p.channel}` as Key) },
              { label: t('admin.action.reference'), render: (p) => <span className="ltr">{p.reference ?? '—'}</span> },
            ]}
            rows={data.payments}
            keyOf={(p) => p.id}
          />
        )}
        <p className="muted small">{t('account.payments.recorded')}</p>
      </section>

      <section className="card stack">
        <h2>{t('account.timeline')}</h2>
        <Timeline events={data.events} trial={historyTrial(data)} />
      </section>

      <section className="card stack">
        <h2>{t('portal.help.title')}</h2>
        <p className="muted small">{t('portal.help.body')}</p>
        <ul className="legal-links" role="list">
          <li>
            <PublicLink id="support">{t('footer.support')}</PublicLink>
          </li>
          <li>
            <PublicLink id="privacy">{t('footer.privacy')}</PublicLink>
          </li>
          <li>
            <PublicLink id="terms">{t('footer.terms')}</PublicLink>
          </li>
          <li>
            <PublicLink id="accountDeletion">{t('footer.deletion')}</PublicLink>
          </li>
        </ul>
      </section>
    </div>
  );
}

/**
 * What the business can do and what its Owner should know first (GET platform/my-subscription/status), every part the
 * server's: the access — the app works, read-only or stopped — in colour and words; the paid period; the grace and the
 * allowance of three in any 12 months; how a renewal made now counts; and where the subscription messages stand. Read
 * again with the account. An API older than it, or a role it refuses, shows nothing here.
 */
function StatusPanel({ version }: { version: unknown }) {
  const { t, lang } = useI18n();
  const [status, setStatus] = useState<PortalStatus | null>(null);
  useEffect(() => {
    let live = true;
    ownerRequest<PortalStatus>('platform/my-subscription/status')
      .then((s) => {
        if (live) setStatus(s);
      })
      .catch(() => {
        // Nothing new to say: the lead sentence above already tells the state.
      });
    return () => {
      live = false;
    };
  }, [version]);
  if (!status) return null;
  const at = (iso: string | null) => formatInstant(iso, status.timeZone, lang);
  return (
    <section className="card stack" aria-labelledby="status-h">
      <h2 id="status-h">{t('portal.status.title')}</h2>
      <p>
        <Badge tone={ACCESS_TONE[status.access]}>{t(`portal.access.${status.access}`)}</Badge> {t(`portal.access.${status.access}.explain`)}
      </p>
      {status.period.end ? (
        <p>
          {status.period.start ? (
            <Phrase text={t('portal.period.range')} values={{ start: at(status.period.start), end: at(status.period.end) }} />
          ) : (
            <Phrase text={t('portal.period.ends')} values={{ end: at(status.period.end) }} />
          )}
        </p>
      ) : null}
      <GraceLines grace={status.grace} at={at} />
      <RenewalLine status={status} at={at} />
      <NoticeLines notices={status.notices} at={at} />
    </section>
  );
}

const ACCESS_TONE: Record<PortalStatus['access'], Tone> = { operational: 'ok', read_only: 'warn', stopped: 'danger' };

/**
 * The grace as the server decided it, and the allowance it is counted against. Nothing here is a promise the server
 * did not make: whether the next period end opens a grace is its own answer (`availableAtPeriodEnd`).
 */
function GraceLines({ grace, at }: { grace: GraceView; at: (iso: string | null) => string }) {
  const { t, lang } = useI18n();
  const hours = formatInt(grace.durationHours, lang);
  let line: ReactNode = null;
  if (grace.status === 'active') {
    line = (
      <Notice tone="warn">
        <Phrase text={t('portal.grace.active')} values={{ end: at(grace.endsAt), left: formatInt(grace.hoursRemaining, lang) }} />
      </Notice>
    );
  } else if (grace.status === 'ended') {
    line = (
      <Notice tone="warn">
        <Phrase text={t('portal.grace.ended')} values={{ end: at(grace.endsAt) }} />
      </Notice>
    );
  } else if (grace.status === 'unavailable') {
    line = <Notice tone="warn">{t('portal.grace.unavailable', { allowance: formatInt(grace.allowance, lang), months: formatInt(grace.windowMonths, lang) })}</Notice>;
  } else if (grace.availableAtPeriodEnd === true) {
    line = <p className="muted">{t('portal.grace.ahead', { hours })}</p>;
  } else if (grace.availableAtPeriodEnd === false) {
    line = <p>{t('portal.grace.noneAhead', { allowance: formatInt(grace.allowance, lang), months: formatInt(grace.windowMonths, lang) })}</p>;
  }
  // The allowance means something once the business pays: a paid period running, or one that ended into a decision.
  const counted = grace.usesRemaining !== null && (grace.status !== 'none' || grace.availableAtPeriodEnd !== null);
  return (
    <>
      {line}
      {counted ? (
        <p className="muted small">
          {t('portal.grace.allowance', { left: formatInt(grace.usesRemaining ?? 0, lang), allowance: formatInt(grace.allowance, lang), months: formatInt(grace.windowMonths, lang), hours })}
          {grace.nextUseRestoredAt ? (
            <>
              {' '}
              <Phrase text={t('portal.grace.restored')} values={{ date: at(grace.nextUseRestoredAt) }} />
            </>
          ) : null}
        </p>
      ) : null}
    </>
  );
}

/**
 * How a renewal confirmed now would count (the owner's brief of 2026-10-18), decided on the server when it is
 * confirmed: before the period ends, from its end; during the grace, from the original end; after it, from the day the
 * payment is confirmed.
 */
function RenewalLine({ status, at }: { status: PortalStatus; at: (iso: string | null) => string }) {
  const { t } = useI18n();
  if (!status.period.end) return null;
  const key = status.state === 'active' ? 'portal.renewal.before' : status.state === 'grace' ? 'portal.renewal.grace' : status.state === 'expired' ? 'portal.renewal.after' : null;
  if (!key) return null;
  return (
    <p className="muted small">
      <Phrase text={t(key)} values={{ end: at(status.period.end) }} />
    </p>
  );
}

/** Where the subscription messages stand: the next one due as things are now, and the newest one, whatever became of it. */
function NoticeLines({ notices, at }: { notices: NoticeTimeline; at: (iso: string | null) => string }) {
  const { t, lang } = useI18n();
  const { next, last } = notices;
  if (!next && !last) return null;
  return (
    <div className="stack-tight">
      <h3>{t('portal.messages.title')}</h3>
      {next ? (
        <p>
          <Phrase text={t('portal.messages.next')} values={{ name: noticeName(next.kind, next.threshold, t, lang), date: at(next.dueAt) }} />
        </p>
      ) : null}
      {last ? (
        <div className="stack-tight">
          <p>
            <Phrase text={t('portal.messages.last')} values={{ name: noticeName(last.kind, last.threshold, t, lang), date: at(last.at) }} />{' '}
            <NoticeStateBadge state={last.state} />
          </p>
          {last.channel && last.state !== 'cancelled' && last.state !== 'superseded' ? (
            <p className="muted small">
              <Where channel={last.channel} destination={last.destination} />
            </p>
          ) : null}
          <FallbackNote reason={last.fallbackReason} />
          <FailureNote reason={last.failureReason} />
        </div>
      ) : null}
      <p className="muted small">{t('portal.messages.whatsappFirst')}</p>
    </div>
  );
}

/**
 * Verifying the Owner's email address on the portal (0099): a code to the address already on the account — never one
 * typed here — then the code back. A verified address is what may carry a message WhatsApp cannot.
 */
function EmailVerification({ onVerified }: { onVerified: () => Promise<void> }) {
  const { t, lang } = useI18n();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [verified, setVerified] = useState(false);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const answer = await ownerRequest<{ destination: string }>('platform/my-subscription/contacts/email/verify/start', { method: 'POST', body: { language: lang } });
      setSentTo(answer.destination);
      setCode('');
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };
  const confirm = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await ownerRequest('platform/my-subscription/contacts/email/verify/confirm', { method: 'POST', body: { code: code.trim() } });
      setVerified(true);
      await onVerified();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  if (verified) return <Notice tone="ok">{t('portal.email.verified')}</Notice>;
  const refusal =
    error instanceof ApiError && error.code === 'invalid_code' ? (
      <Notice tone="danger">{t('portal.email.invalidCode')}</Notice>
    ) : error instanceof ApiError && error.status === 429 ? (
      <Notice tone="danger">{t('trial.error.too_many_requests')}</Notice>
    ) : (
      <ErrorNotice error={error} />
    );
  if (!sentTo) {
    return (
      <div className="stack-tight">
        <p className="muted small">{t('portal.email.why')}</p>
        {refusal}
        <div className="row">
          <button type="button" className="btn btn-sm" disabled={busy} onClick={() => void start()}>
            {t('portal.email.verify')}
          </button>
        </div>
      </div>
    );
  }
  return (
    <form className="stack-tight" onSubmit={confirm}>
      <p>
        <Phrase text={t('portal.email.sent')} values={{ destination: <span className="ltr">{sentTo}</span> }} />
      </p>
      <Field label={t('portal.email.code')}>
        <input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{4,8}" maxLength={8} value={code} onChange={(e) => setCode(e.target.value)} dir="ltr" />
      </Field>
      {refusal}
      <div className="row">
        <button type="submit" className="btn btn-sm btn-primary" disabled={busy || !code.trim()}>
          {t('action.confirm')}
        </button>
        <button type="button" className="btn btn-sm" disabled={busy} onClick={() => void start()}>
          {t('portal.email.resend')}
        </button>
      </div>
    </form>
  );
}

/**
 * How to pay, as the server says it (GET platform/payment-instructions): the providers the platform offers with their
 * real codes, once it offers any — and until then, honestly, that each payment is confirmed by hand. Never a code this
 * page holds, never a stand-in.
 */
function HowToPay({ version }: { version: unknown }) {
  const { t } = useI18n();
  const [instructions, setInstructions] = useState<PaymentInstructions | null>(null);
  useEffect(() => {
    let live = true;
    ownerRequest<PaymentInstructions>('platform/payment-instructions')
      .then((p) => {
        if (live) setInstructions(p);
      })
      .catch(() => {
        if (live) setInstructions(null);
      });
    return () => {
      live = false;
    };
  }, [version]);
  const offered = instructions?.available ? instructions.providers.filter((p) => p.code) : [];
  return (
    <section className="card stack">
      <h2>{t('account.payment.howto')}</h2>
      {offered.length > 0 ? (
        <>
          <p>{t('portal.pay.with')}</p>
          <ul className="stack-tight">
            {offered.map((p) => (
              <li key={p.key} className="row">
                <strong>{p.label}</strong>
                <span className="ltr">{p.code}</span>
              </li>
            ))}
          </ul>
          <p className="muted small">{t('portal.pay.confirmed')}</p>
        </>
      ) : (
        <Notice tone="info">{t('account.payment.none')}</Notice>
      )}
      <p className="muted small">{t('account.team.note')}</p>
    </section>
  );
}

/**
 * The trial facts the history is told with: the trial's view, or — when the server gives none (a business whose chance
 * to claim closed unused, or one suspended before it claimed) — the business's zone alone (C18), so the trial's own
 * rows are dated in that zone, as the console dates them. An API older than C18 sends no zone, and those rows keep the
 * date they had.
 */
function historyTrial(data: MySubscription): TimelineTrial | null {
  if (data.entitlement.trial) return data.entitlement.trial;
  return data.timeZone ? { timeZone: data.timeZone, startedAt: null, endsAt: null } : null;
}

/**
 * A period that has not begun (2026-10-13): access approved during a free trial starts when the trial ends, so the
 * running period's start can lie ahead. It is "ahead" when the server's own start is later than the server's own
 * reading of the entitlement — two server instants, never this browser's clock. For a business with a trial, in
 * whatever state (suspended mid-trial too), it is a trial date: told in the trial's zone, and as what it is — the
 * platform's grant, when one runs, or paid access.
 */
function PeriodStart({ data }: { data: MySubscription }) {
  const { t, lang } = useI18n();
  const ent = data.entitlement;
  const start = data.pricing.currentPeriod.periodStart;
  if (!start || !(Date.parse(start) > Date.parse(ent.calculatedAt))) return null;
  if (ent.trial) {
    const granted = ent.complimentary?.status === 'active' || ent.complimentary?.status === 'indefinite';
    return (
      <p>
        <Phrase text={t(granted ? 'trial.grantStart' : 'trial.paidStart')} values={{ date: formatInstant(start, ent.trial.timeZone, lang) }} />
      </p>
    );
  }
  return <p>{t('account.period.starts', { date: formatDate(start, lang) })}</p>;
}

/**
 * A new store that takes over the month of one closed during this paid month (D158): the server names the store it
 * replaces and what is due now — the difference between the two activities, or nothing. The page does no arithmetic.
 */
function ReplacementNote({ option }: { option: NewStoreOption | null }) {
  const { t, lang } = useI18n();
  if (!option?.replaces || typeof option.dueNow !== 'number') return null;
  return option.dueNow === 0 ? (
    <Notice tone="info">{t('account.requests.store.replacesFree', { store: option.replaces.name })}</Notice>
  ) : (
    <Notice tone="info">{t('account.requests.store.replaces', { store: option.replaces.name, amount: formatMru(option.dueNow, lang) })}</Notice>
  );
}

/** What `activity-requests` refuses by name (docs/73 §6), said in words. */
const ACTIVITY_REFUSALS = new Set(['activity_unchanged', 'activity_not_for_warehouse', 'activity_request_pending']);

/**
 * Each store with its activity and the change waiting for the next renewal,
 * and — per store — the action to ask for another activity. Warehouses stay
 * electronics (D154 c), and a store the server did not describe (an older API)
 * offers no change at all.
 */
function StoreActivities({
  data,
  options,
  optionsError,
  onRequested,
}: {
  data: MySubscription;
  options: ActivityOptions | null;
  optionsError: unknown;
  onRequested: () => Promise<void>;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState<string | null>(null);
  const lineOf = (id: string) => data.pricing.quote.lines.find((l) => l.branchId === id);
  const optionsOf = (id: string) => (options ? (options.stores.find((s) => s.branchId === id)?.options ?? []) : null);

  return (
    <section className="card stack">
      <h2>{t('account.stores')}</h2>
      <ul className="store-list">
        {data.business.branches.map((b) => {
          const changeable = b.id && b.activity && b.type !== 'warehouse' ? { ...b, id: b.id, activity: b.activity } : null;
          return (
            <li key={b.id ?? b.name} className="stack">
              <div className="row spread">
                <div className="stack-tight">
                  <strong>{b.name}</strong>
                  {b.type === 'warehouse' ? <span className="muted small">{t('account.stores.warehouse')}</span> : null}
                  {b.activity ? <ActivityWithNext activity={b.activity} next={b.activityNext} /> : null}
                </div>
                {changeable && open !== changeable.id ? (
                  <button type="button" className="btn btn-sm" onClick={() => setOpen(changeable.id)}>
                    {t('account.stores.change')}
                  </button>
                ) : null}
              </div>
              {changeable && open === changeable.id ? (
                <ActivityChange
                  branch={changeable}
                  line={lineOf(changeable.id)}
                  options={optionsOf(changeable.id)}
                  optionsError={optionsError}
                  onRequested={onRequested}
                  onClose={() => setOpen(null)}
                />
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * Ask for another activity for one store (D154, docs/73 §3, §6).
 *
 * Before the request, the consequence is the SERVER's answer for this store
 * now (GET my-subscription/activity-options): what would be due now, what the
 * store pays per month once the next paid period opens, or why a change cannot
 * be asked yet — the page computes no charge. After it, the page renders the
 * row the server answered with, by its status: awaiting payment of the
 * difference, waiting for the renewal, or a scheduled change withdrawn.
 */
function ActivityChange({
  branch,
  line,
  options,
  optionsError,
  onRequested,
  onClose,
}: {
  branch: SubscriptionBranch & { id: string; activity: Activity };
  line: QuoteLine | undefined;
  /** Null while the server's options are loading (or could not be read). */
  options: ActivityOption[] | null;
  optionsError: unknown;
  onRequested: () => Promise<void>;
  onClose: () => void;
}) {
  const { t, lang } = useI18n();
  const [target, setTarget] = useState<Activity | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [result, setResult] = useState<RequestResult | null>(null);
  const name = (a: Activity) => t(`activity.${a}` as Key);

  const next = branch.activityNext ?? null;
  const currentFee = typeof line?.activityFee === 'number' ? line.activityFee : null;
  const offered = (options ?? []).filter((o) => o.outcome !== 'refused');
  const blockedBy = [...new Set((options ?? []).flatMap((o) => (o.outcome === 'refused' ? [o.blockedBy] : [])))];
  const chosen = offered.find((o) => o.activity === target) ?? null;

  const send = async () => {
    if (!target) return;
    setBusy(true);
    setError(null);
    try {
      setResult(await ownerRequest<RequestResult>('platform/my-subscription/activity-requests', { method: 'POST', body: { branchId: branch.id, activity: target } }));
      await onRequested();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    const outcome = outcomeOf(result, branch, chosen?.monthlyAfter ?? null, t, lang);
    return (
      <div className="stack">
        <Notice tone={outcome.tone}>{outcome.text}</Notice>
        <div className="row">
          <button type="button" className="btn btn-sm" onClick={onClose}>
            {t('action.close')}
          </button>
        </div>
      </div>
    );
  }

  let explanation: string | null = null;
  if (chosen) {
    const price = formatMru(chosen.monthlyAfter, lang);
    const upgrade = t('account.change.upgrade', { difference: formatMru(chosen.dueNow, lang), price });
    const renewal = t('account.change.downgrade', { price });
    if (chosen.outcome === 'keep') explanation = t('account.change.keepExplain', { activity: name(next ?? chosen.activity) });
    else if (chosen.outcome === 'now') explanation = upgrade;
    else if (chosen.outcome === 'renewal') explanation = renewal;
    else explanation = `${t('account.change.outcome.existing')} ${chosen.dueNow > 0 ? upgrade : renewal}`;
  }

  return (
    <div className="card stack">
      <h3>{t('account.change.title', { store: branch.name })}</h3>
      <p>{currentFee !== null ? t('account.change.now', { activity: name(branch.activity), amount: formatMru(currentFee, lang) }) : name(branch.activity)}</p>
      {options === null ? (
        optionsError ? <ErrorNotice error={optionsError} /> : <Loading />
      ) : (
        <>
          {offered.length > 0 ? (
            <ActivityCards
              name={`activity-${branch.id}`}
              legend={t('account.change.to')}
              options={offered.map((o) => o.activity)}
              value={target}
              onChange={(a) => {
                setTarget(a);
                setError(null);
              }}
              prices={pricesAfter(offered)}
              labelOf={(a) => (a === branch.activity ? t('account.change.keep', { activity: name(a) }) : null)}
            />
          ) : null}
          {blockedBy.map((a) => (
            <Notice key={a} tone="info">
              {t('account.change.blocked', { activity: name(a) })}
            </Notice>
          ))}
        </>
      )}
      {explanation ? (
        <div className="stack-tight" aria-live="polite">
          <Notice tone="info">{explanation}</Notice>
          <p className="muted small">{t('account.change.estimate')}</p>
        </div>
      ) : null}
      {error instanceof ApiError && error.code && ACTIVITY_REFUSALS.has(error.code) ? (
        <Notice tone="danger" title={t(`account.change.error.${error.code}` as Key)}>
          {error.message}
        </Notice>
      ) : (
        <ErrorNotice error={error} />
      )}
      <div className="row">
        <button type="button" className="btn btn-primary" disabled={busy || !chosen} onClick={() => void send()}>
          {t('account.requests.submit')}
        </button>
        <button type="button" className="btn" onClick={onClose}>
          {t('action.cancel')}
        </button>
      </div>
    </div>
  );
}

/**
 * The server's answer to an activity request, in words — read from the row's status, never from the prices.
 * `monthlyAfter` is the server's own figure for the month after, from the options the change was chosen from.
 */
function outcomeOf(
  result: RequestResult,
  branch: SubscriptionBranch & { activity: Activity },
  monthlyAfter: number | null,
  t: ReturnType<typeof useI18n>['t'],
  lang: ReturnType<typeof useI18n>['lang'],
): { tone: Tone; text: string } {
  const a = result.allocation;
  const store = a.branchName ?? branch.name;
  const name = (x: Activity) => t(`activity.${x}` as Key);
  if (!result.created && a.status === 'released') {
    return { tone: 'ok', text: t('account.change.outcome.withdrawn', { store, activity: name(a.activityFrom ?? branch.activity) }) };
  }
  const prefix = result.created ? '' : `${t('account.change.outcome.existing')} `;
  if (a.status === 'pending_payment' && a.activityEffective === 'now') {
    const amount = formatMru(a.monthlyAmount, lang);
    return {
      tone: 'warn',
      text:
        prefix +
        (monthlyAfter !== null ? t('account.change.outcome.due', { amount, price: formatMru(monthlyAfter, lang) }) : t('account.change.outcome.dueNoPrice', { amount })),
    };
  }
  if (isScheduledActivityChange(a) && a.activityTo) {
    return { tone: 'info', text: prefix + t('account.change.outcome.renewal', { store, activity: name(a.activityTo) }) };
  }
  return { tone: 'info', text: prefix + t('account.change.outcome.other', { status: t(requestStatusKey(a.status)) }) };
}

/**
 * The Owner's seat, store and activity requests, and the forms to ask for more. While the free trial runs, a store or
 * seat asked for here can be paid for at once and starts when the trial ends, never during it (D176): the forms say so,
 * with the trial's end in the business's zone, and a list holding one paid for that way says it is paid for once.
 */
function Requests({
  stores,
  newStore,
  trial,
  version,
  onChanged,
}: {
  stores: { id: string; name: string }[];
  /** What a new store of each activity is charged per month now — the server's figure; null until it is read. */
  newStore: NewStoreOption[] | null;
  /** The business's free trial as the entitlement tells it, or null. */
  trial: TrialView | null;
  version: number;
  onChanged: () => Promise<void>;
}) {
  const { t, lang } = useI18n();
  const [rows, setRows] = useState<SeatRequest[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [branchId, setBranchId] = useState(stores[0]?.id ?? '');
  const [storeName, setStoreName] = useState('');
  const [storeActivity, setStoreActivity] = useState<Activity>('electronics');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows(await ownerRequest<SeatRequest[]>('platform/my-subscription/seat-requests'));
    } catch (e) {
      setError(e);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load, version]);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load();
      await onChanged();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card stack">
      <h2>{t('account.requests')}</h2>
      <p className="muted small">{t('account.requests.explain')}</p>
      {rows === null ? (
        // A list that could not be read says so below, once; it is not still loading.
        error ? null : <Loading />
      ) : rows.length === 0 ? (
        <Empty text={t('account.requests.none')} />
      ) : (
        <Table
          columns={[
            { label: t('admin.seats.request'), render: (r) => <RequestSummary request={r} /> },
            { label: t('admin.seats.amount'), render: (r) => <RequestAmount request={r} /> },
            { label: t('admin.businesses.state'), render: (r) => <RequestStatus request={r} /> },
            { label: t('admin.seats.requested'), render: (r) => formatDate(r.requestedAt, lang) },
            {
              label: '',
              render: (r) =>
                canWithdraw(r) ? (
                  <button type="button" className="btn btn-sm" disabled={busy} onClick={() => void act(() => ownerRequest(`platform/my-subscription/seat-requests/${r.id}/withdraw`, { method: 'POST' }))}>
                    {t('account.requests.withdraw')}
                  </button>
                ) : (
                  <span className="muted small">{r.payment?.reference ? <span className="ltr">{r.payment.reference}</span> : null}</span>
                ),
            },
          ]}
          rows={rows}
          keyOf={(r) => r.id}
        />
      )}
      {rows?.some((r) => r.status === 'scheduled') ? <p className="small">{t('trial.addons.paidNote')}</p> : null}
      <ErrorNotice error={error} />
      <div className="grid">
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            if (branchId) void act(() => ownerRequest('platform/my-subscription/seat-requests', { method: 'POST', body: { branchId } }));
          }}
        >
          <h3>{t('account.requests.add.seat')}</h3>
          <Field label={t('account.requests.seat.store')}>
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <button type="submit" className="btn" disabled={busy || !branchId}>
            {t('account.requests.submit')}
          </button>
        </form>
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            if (storeName.trim())
              void act(() => ownerRequest('platform/my-subscription/store-requests', { method: 'POST', body: { name: storeName.trim(), activity: storeActivity } })).then(() => setStoreName(''));
          }}
        >
          <h3>{t('account.requests.add.store')}</h3>
          <Field label={t('account.requests.store.name')}>
            <input maxLength={160} value={storeName} onChange={(e) => setStoreName(e.target.value)} />
          </Field>
          <Field label={t('account.requests.store.activity')}>
            <select value={storeActivity} onChange={(e) => setStoreActivity(e.target.value as Activity)}>
              {ACTIVITIES.map((a) => {
                const price = newStore?.find((n) => n.activity === a)?.monthly ?? null;
                const label = t(`activity.${a}` as Key);
                return (
                  <option key={a} value={a}>
                    {price !== null ? t('account.requests.option', { activity: label, amount: formatMru(price, lang) }) : label}
                  </option>
                );
              })}
            </select>
          </Field>
          <ReplacementNote option={newStore?.find((n) => n.activity === storeActivity) ?? null} />
          <button type="submit" className="btn" disabled={busy || !storeName.trim()}>
            {t('account.requests.submit')}
          </button>
        </form>
      </div>
      {trial?.status === 'active' && trial.endsAt ? (
        <Notice tone="info">
          <Phrase text={t('trial.addons.note')} values={{ date: formatInstant(trial.endsAt, trial.timeZone, lang) }} />
        </Notice>
      ) : null}
    </section>
  );
}
