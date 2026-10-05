import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { MySubscription, SeatRequest } from '../../api/types';
import { isUnauthorized, ownerChooseAccount, ownerLogin, ownerLogout, ownerRequest, type AccountChoice } from '../../auth/owner';
import { Badge, Empty, ErrorNotice, Field, Loading, Money, Notice, RequestBadge, StateBadge, Table } from '../../components/ui';
import { useI18n, type Key } from '../../i18n';
import { formatDate, formatDateTime, formatInt } from '../../lib/format';
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
          <h2>{t('account.stores')}</h2>
          <ul>
            {data.business.branches.map((b) => (
              <li key={b.name}>{b.name}</li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h2>{t('account.period')}</h2>
          {ent.periodEnd ? <p>{t('account.period.ends', { date: formatDate(ent.periodEnd, lang) })}</p> : <p className="muted">{t('account.period.none')}</p>}
        </div>
      </section>

      <section className="card stack">
        <h2>{t('account.quote')}</h2>
        <p className="muted small">{t('account.quote.body')}</p>
        <Table
          columns={[
            { label: t('account.quote.store'), render: (l) => l.name },
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

      <Requests stores={ent.seatsByStore.map((s) => ({ id: s.branchId, name: s.name }))} onChanged={reload} />

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

function Requests({ stores, onChanged }: { stores: { id: string; name: string }[]; onChanged: () => Promise<void> }) {
  const { t, lang } = useI18n();
  const [rows, setRows] = useState<SeatRequest[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [branchId, setBranchId] = useState(stores[0]?.id ?? '');
  const [storeName, setStoreName] = useState('');
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
  }, [load]);

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
            {
              label: t('admin.seats.request'),
              render: (r) => (
                <>
                  {r.kind === 'seat' ? t('account.requests.seat') : t('account.requests.store')}{' '}
                  {r.kind === 'seat' && r.store ? t('account.requests.at', { store: r.store.name }) : r.label ? `“${r.label}”` : ''}{' '}
                  {r.person ? t('account.requests.for', { person: r.person.name }) : ''}
                </>
              ),
            },
            { label: t('admin.seats.amount'), render: (r) => t('account.requests.perMonth', { amount: `${formatInt(r.monthlyAmount, lang)} MRU` }) },
            { label: t('admin.businesses.state'), render: (r) => <RequestBadge status={r.status} /> },
            { label: t('admin.seats.requested'), render: (r) => formatDate(r.requestedAt, lang) },
            {
              label: '',
              render: (r) =>
                r.status === 'pending_payment' ? (
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
            if (storeName.trim()) void act(() => ownerRequest('platform/my-subscription/store-requests', { method: 'POST', body: { name: storeName.trim() } })).then(() => setStoreName(''));
          }}
        >
          <h3>{t('account.requests.add.store')}</h3>
          <Field label={t('account.requests.store.name')}>
            <input maxLength={160} value={storeName} onChange={(e) => setStoreName(e.target.value)} />
          </Field>
          <button type="submit" className="btn" disabled={busy || !storeName.trim()}>
            {t('account.requests.submit')}
          </button>
        </form>
      </div>
    </section>
  );
}
