import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ApiError } from '../../api/client';
import type { Activity, ActivityPrices, MySubscription, Pricing, QuoteLine, RequestResult, SeatRequest, SubscriptionBranch } from '../../api/types';
import { isUnauthorized, ownerChooseAccount, ownerLogin, ownerLogout, ownerRequest, type AccountChoice } from '../../auth/owner';
import { ActivityCards, ActivityName, ActivityWithNext } from '../../components/activity';
import { RequestAmount, RequestStatus, RequestSummary } from '../../components/requests';
import { Badge, Empty, ErrorNotice, Field, Loading, Money, Notice, StateBadge, Table, type Tone } from '../../components/ui';
import { useI18n, type Key } from '../../i18n';
import { ACTIVITIES, activityPrice, canWithdraw, explainActivityChange, isScheduledActivityChange } from '../../lib/activity';
import { formatDate, formatDateTime, formatInt, formatMru } from '../../lib/format';
import { paymentProvider } from '../../providers/payment';

type Session = { kind: 'checking' } | { kind: 'anonymous' } | { kind: 'signed'; data: MySubscription };

/**
 * The Owner's business account (docs/68 §3). The page asks the API whether a
 * session exists — a bearer token from the form here, or the portal cookie set
 * by the app's handoff — and believes the answer; it never gates on what it
 * can see locally.
 */
export function Account() {
  const { t } = useI18n();
  const [session, setSession] = useState<Session>({ kind: 'checking' });
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    try {
      const data = await ownerRequest<MySubscription>('platform/my-subscription');
      setSession({ kind: 'signed', data });
      setError(null);
    } catch (e) {
      if (isUnauthorized(e)) setSession({ kind: 'anonymous' });
      else setError(e);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (session.kind === 'checking') return <Loading />;
  if (session.kind === 'anonymous') {
    return (
      <div className="stack">
        <section className="hero">
          <h1>{t('account.title')}</h1>
          <p className="lead">{t('account.signin.lead')}</p>
        </section>
        <ErrorNotice error={error} />
        <SignIn onSigned={load} />
      </div>
    );
  }
  return (
    <Subscription
      data={session.data}
      reload={load}
      onSignOut={async () => {
        await ownerLogout();
        setSession({ kind: 'anonymous' });
      }}
    />
  );
}

function SignIn({ onSigned }: { onSigned: () => Promise<void> }) {
  const { t } = useI18n();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [choice, setChoice] = useState<{ continuationToken: string; accounts: AccountChoice[] } | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFailed(false);
    setError(null);
    try {
      const result = await ownerLogin(identifier.trim(), password);
      if (result.status === 'choose_account') setChoice({ continuationToken: result.continuationToken, accounts: result.accounts });
      else await onSigned();
    } catch (err) {
      if (isUnauthorized(err)) setFailed(true);
      else setError(err);
    } finally {
      setBusy(false);
    }
  };

  const choose = async (accountRef: string) => {
    if (!choice) return;
    setBusy(true);
    try {
      await ownerChooseAccount(choice.continuationToken, accountRef);
      await onSigned();
    } catch (err) {
      setError(err);
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
      {failed ? <Notice tone="danger">{t('account.signin.failed')}</Notice> : null}
      <ErrorNotice error={error} />
      <div className="row">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {t('action.signIn')}
        </button>
      </div>
    </form>
  );
}

const EXPLAIN_WITH_DATE = new Set(['active', 'grace', 'expired', 'complimentary']);

function Subscription({ data, reload, onSignOut }: { data: MySubscription; reload: () => Promise<void>; onSignOut: () => Promise<void> }) {
  const { t, lang } = useI18n();
  const ent = data.entitlement;
  const quote = data.pricing.quote;
  const date = ent.state === 'complimentary' ? data.pricing.currentPeriod.periodStart : ent.periodEnd;
  const explainKey = `status.explain.${ent.state}` as Key;
  // Bumped after an activity request, so the requests list below reads the new row.
  const [requestsVersion, setRequestsVersion] = useState(0);
  const afterActivityRequest = useCallback(async () => {
    setRequestsVersion((v) => v + 1);
    await reload();
  }, [reload]);

  return (
    <div className="stack">
      <section className="hero row spread">
        <div>
          <h1>{data.business.name}</h1>
          <p className="lead">
            <StateBadge state={ent.state} />{' '}
            {EXPLAIN_WITH_DATE.has(ent.state) ? t(explainKey, { date: formatDate(date, lang) }) : t(explainKey)}
          </p>
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

      <section className="grid">
        <div className="card">
          <h2>{t('account.owner')}</h2>
          {data.owner ? (
            <div className="stack">
              <strong>{data.owner.name}</strong>
              {data.owner.email ? (
                <span className="row">
                  <span className="ltr">{data.owner.email}</span>
                  <Badge tone={data.owner.emailVerified ? 'ok' : 'warn'}>{data.owner.emailVerified ? t('admin.business.verified') : t('admin.business.unverified')}</Badge>
                </span>
              ) : null}
              {data.owner.phone ? (
                <span className="row">
                  <span className="ltr">{data.owner.phone}</span>
                  <Badge tone={data.owner.phoneVerified ? 'ok' : 'warn'}>{data.owner.phoneVerified ? t('admin.business.verified') : t('admin.business.unverified')}</Badge>
                </span>
              ) : null}
            </div>
          ) : (
            <Empty />
          )}
        </div>
        <div className="card">
          <h2>{t('account.period')}</h2>
          {ent.periodEnd ? <p>{t('account.period.ends', { date: formatDate(ent.periodEnd, lang) })}</p> : <p className="muted">{t('account.period.none')}</p>}
        </div>
      </section>

      <StoreActivities data={data} onRequested={afterActivityRequest} />

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

      <Requests stores={ent.seatsByStore.map((s) => ({ id: s.branchId, name: s.name }))} prices={data.pricing.plan} version={requestsVersion} onChanged={reload} />

      <section className="card stack">
        <h2>{t('account.payment.howto')}</h2>
        {paymentProvider.available ? null : <Notice tone="info">{t('account.payment.none')}</Notice>}
        <p className="muted small">{t('account.team.note')}</p>
      </section>

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
        {data.events.length === 0 ? (
          <Empty />
        ) : (
          <ul className="timeline">
            {data.events.map((e) => (
              <li key={e.id}>
                <span className="dot" aria-hidden="true" />
                <div>
                  <div>
                    <strong>{e.kind.replace(/_/g, ' ')}</strong>
                    {e.note ? ` — ${e.note}` : ''}
                  </div>
                  <time dateTime={e.createdAt}>{formatDateTime(e.createdAt, lang)}</time>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
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
function StoreActivities({ data, onRequested }: { data: MySubscription; onRequested: () => Promise<void> }) {
  const { t } = useI18n();
  const [open, setOpen] = useState<string | null>(null);
  const lineOf = (id: string) => data.pricing.quote.lines.find((l) => l.branchId === id);

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
                <ActivityChange branch={changeable} line={lineOf(changeable.id)} pricing={data.pricing} onRequested={onRequested} onClose={() => setOpen(null)} />
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
 * Before the request, the consequence is EXPLAINED from the plan's prices and
 * the store's own fee on the quote — never from constants — and says that the
 * amount due is the one the server records. After it, the page renders the
 * row the server answered with, by its status: awaiting payment of the
 * difference, waiting for the renewal (which is also what an upgrade becomes
 * when no paid month is running), or a scheduled change withdrawn.
 */
function ActivityChange({
  branch,
  line,
  pricing,
  onRequested,
  onClose,
}: {
  branch: SubscriptionBranch & { id: string; activity: Activity };
  line: QuoteLine | undefined;
  pricing: Pricing;
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
  // With a change scheduled, keeping today's activity is a choice of its own: it withdraws that change.
  const options: Activity[] = [...(next ? [branch.activity] : []), ...ACTIVITIES.filter((a) => a !== branch.activity && a !== next)];
  const currentFee = typeof line?.activityFee === 'number' ? line.activityFee : null;
  // The next renewal is priced like the server's own renewal estimate: the scheduled plan when there is one.
  const renewalPrices: ActivityPrices = pricing.upcomingPlan ?? pricing.plan;

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
    const outcome = outcomeOf(result, branch, renewalPrices, t, lang);
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
  let fromPriceList = false;
  if (target && target === branch.activity && next) {
    explanation = t('account.change.keepExplain', { activity: name(next) });
  } else if (target) {
    const preview = explainActivityChange(currentFee, activityPrice(pricing.plan, target));
    const price = activityPrice(renewalPrices, target);
    if (!preview || price === null) {
      explanation = t('account.change.unknown');
    } else {
      fromPriceList = true;
      explanation =
        preview.kind === 'upgrade'
          ? t('account.change.upgrade', { difference: formatMru(preview.differenceNow, lang), price: formatMru(price, lang) })
          : t('account.change.downgrade', { price: formatMru(price, lang) });
    }
  }

  return (
    <div className="card stack">
      <h3>{t('account.change.title', { store: branch.name })}</h3>
      <p>{currentFee !== null ? t('account.change.now', { activity: name(branch.activity), amount: formatMru(currentFee, lang) }) : name(branch.activity)}</p>
      <ActivityCards
        name={`activity-${branch.id}`}
        legend={t('account.change.to')}
        options={options}
        value={target}
        onChange={(a) => {
          setTarget(a);
          setError(null);
        }}
        prices={pricing.plan}
        labelOf={(a) => (a === branch.activity ? t('account.change.keep', { activity: name(a) }) : null)}
      />
      {explanation ? (
        <div className="stack-tight" aria-live="polite">
          <Notice tone="info">{explanation}</Notice>
          {fromPriceList ? <p className="muted small">{t('account.change.estimate')}</p> : null}
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
        <button type="button" className="btn btn-primary" disabled={busy || !target} onClick={() => void send()}>
          {t('account.requests.submit')}
        </button>
        <button type="button" className="btn" onClick={onClose}>
          {t('action.cancel')}
        </button>
      </div>
    </div>
  );
}

/** The server's answer to an activity request, in words — read from the row's status, never from the prices. */
function outcomeOf(
  result: RequestResult,
  branch: SubscriptionBranch & { activity: Activity },
  renewalPrices: ActivityPrices,
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
    const price = a.activityTo ? activityPrice(renewalPrices, a.activityTo) : null;
    return {
      tone: 'warn',
      text: prefix + (price !== null ? t('account.change.outcome.due', { amount, price: formatMru(price, lang) }) : t('account.change.outcome.dueNoPrice', { amount })),
    };
  }
  if (isScheduledActivityChange(a) && a.activityTo) {
    return { tone: 'info', text: prefix + t('account.change.outcome.renewal', { store, activity: name(a.activityTo) }) };
  }
  return { tone: 'info', text: prefix + t('account.change.outcome.other', { status: t(`account.requests.status.${a.status}` as Key) }) };
}

function Requests({
  stores,
  prices,
  version,
  onChanged,
}: {
  stores: { id: string; name: string }[];
  prices: ActivityPrices;
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
        <Loading />
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
                const price = activityPrice(prices, a);
                const label = t(`activity.${a}` as Key);
                return (
                  <option key={a} value={a}>
                    {price !== null ? t('account.requests.option', { activity: label, amount: formatMru(price, lang) }) : label}
                  </option>
                );
              })}
            </select>
          </Field>
          <button type="submit" className="btn" disabled={busy || !storeName.trim()}>
            {t('account.requests.submit')}
          </button>
        </form>
      </div>
    </section>
  );
}
