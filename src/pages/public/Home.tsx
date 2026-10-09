import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { request } from '../../api/client';
import type { Activity, PublicPlan, Quote } from '../../api/types';
import { ActivityName, ActivityPriceCards } from '../../components/activity';
import { ErrorNotice, Money, Notice } from '../../components/ui';
import { useI18n, type Key } from '../../i18n';
import { ACTIVITIES } from '../../lib/activity';
import { formatDate, formatInt, formatMru } from '../../lib/format';

/**
 * The public face: what the ERP is, who it is for, how a subscription works,
 * the price list in force and an estimate — every figure from the server.
 * Each store is priced by its activity (D154): the electronics store, the
 * money services agent, or both — three prices from `GET platform/plan`.
 */
export function Home() {
  const { t, lang } = useI18n();
  const [plan, setPlan] = useState<PublicPlan | null>(null);
  const [planError, setPlanError] = useState<unknown>(null);

  useEffect(() => {
    let alive = true;
    request<PublicPlan>('platform/plan')
      .then((p) => alive && setPlan(p))
      .catch((e) => alive && setPlanError(e));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="stack">
      <section className="hero">
        <h1>{t('home.title')}</h1>
        <p className="lead">{t('home.lead')}</p>
        <div className="row">
          <Link className="btn btn-primary" to="/apply">
            {t('home.cta.apply')}
          </Link>
          <Link className="btn" to="/account">
            {t('home.cta.account')}
          </Link>
        </div>
      </section>

      <section className="grid">
        <div className="card">
          <h2>{t('home.business')}</h2>
          <p>{t('home.business.body')}</p>
        </div>
        <div className="card">
          <h2>{t('home.how')}</h2>
          <ol className="steps">
            <li>{t('home.how.1')}</li>
            <li>{t('home.how.2')}</li>
            <li>{t('home.how.3')}</li>
            <li>{t('home.how.4')}</li>
          </ol>
        </div>
      </section>

      <section className="card" id="pricing">
        <h2>{t('home.pricing')}</h2>
        {!plan && !planError ? <p className="muted">{t('home.pricing.loading')}</p> : null}
        {planError ? <Notice tone="warn">{t('home.pricing.unavailable')}</Notice> : null}
        {plan ? (
          <div className="stack">
            <ActivityPriceCards prices={plan} />
            <p className="muted small">{t('home.pricing.perStore')}</p>
            <div className="kpi">
              <span className="value">
                <Money amount={plan.extraSeatMonthly} />
              </span>
              <span className="label">{t('home.pricing.extra')}</span>
            </div>
            <p>{t('home.pricing.included', { count: formatInt(plan.includedSeatsPerStore, lang) })}</p>
            <p className="muted small">{t('home.pricing.rules')}</p>
            <p className="muted small">{t('home.pricing.change')}</p>
            <p className="muted small">{t('home.pricing.since', { date: formatDate(plan.effectiveFrom, lang) })}</p>
            {plan.upcoming ? (
              <Notice tone="info">
                {typeof plan.upcoming.agentMonthly === 'number' && typeof plan.upcoming.bothMonthly === 'number'
                  ? t('home.pricing.upcoming.activities', {
                      date: formatDate(plan.upcoming.effectiveFrom, lang),
                      store: formatMru(plan.upcoming.branchMonthly, lang),
                      agent: formatMru(plan.upcoming.agentMonthly, lang),
                      both: formatMru(plan.upcoming.bothMonthly, lang),
                      seat: formatMru(plan.upcoming.extraSeatMonthly, lang),
                    })
                  : t('home.pricing.upcoming', {
                      date: formatDate(plan.upcoming.effectiveFrom, lang),
                      store: `${formatInt(plan.upcoming.branchMonthly, lang)} MRU`,
                      seat: `${formatInt(plan.upcoming.extraSeatMonthly, lang)} MRU`,
                    })}
              </Notice>
            ) : null}
          </div>
        ) : null}
      </section>

      <Estimate />
    </div>
  );
}

function Estimate() {
  const { t, lang } = useI18n();
  const [stores, setStores] = useState<number[]>([1]);
  // One activity per store, kept beside the counts: electronics until the visitor says otherwise.
  const [activities, setActivities] = useState<Activity[]>(['electronics']);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      // The server prices it. This page never multiplies anything.
      setQuote(await request<Quote>('platform/quote', { method: 'POST', body: { stores, activities } }));
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card" id="estimate">
      <h2>{t('home.estimate')}</h2>
      <p className="muted">{t('home.estimate.help')}</p>
      <form className="stack" onSubmit={submit}>
        <div className="estimate-grid">
          {stores.map((n, i) => (
            <div className="estimate-store" key={i}>
              <strong>{t('home.estimate.store', { n: formatInt(i + 1, lang) })}</strong>
              <label className="field">
                {t('home.estimate.activity')}
                <select value={activities[i] ?? 'electronics'} onChange={(e) => setActivities(activities.map((a, j) => (j === i ? (e.target.value as Activity) : a)))}>
                  {ACTIVITIES.map((a) => (
                    <option key={a} value={a}>
                      {t(`activity.${a}` as Key)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                {t('home.estimate.employees')}
                <input
                  type="number"
                  min={0}
                  max={500}
                  value={n}
                  onChange={(e) => setStores(stores.map((v, j) => (j === i ? Math.max(0, Number(e.target.value) || 0) : v)))}
                />
              </label>
              <button
                type="button"
                className="btn btn-sm"
                disabled={stores.length === 1}
                onClick={() => {
                  setStores(stores.filter((_, j) => j !== i));
                  setActivities(activities.filter((_, j) => j !== i));
                }}
              >
                {t('home.estimate.remove')}
              </button>
            </div>
          ))}
        </div>
        <div className="row">
          <button
            type="button"
            className="btn"
            disabled={stores.length >= 50}
            onClick={() => {
              setStores([...stores, 0]);
              setActivities([...activities, 'electronics']);
            }}
          >
            {t('home.estimate.add')}
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {t('home.estimate.submit')}
          </button>
        </div>
      </form>
      <ErrorNotice error={error} />
      {quote ? (
        <div className="stack" aria-live="polite">
          <div className="kpi">
            <span className="value">
              <Money amount={quote.monthlyTotal} />
            </span>
            <span className="label">{t('home.estimate.total')}</span>
          </div>
          <p className="muted small">
            {t('home.estimate.stores', { count: formatInt(quote.activeBranchCount, lang) })} · {t('home.estimate.seats', { count: formatInt(quote.paidSeatCount, lang) })}
          </p>
          <ul>
            {quote.lines.map((l, i) => (
              <li key={i}>
                {t('home.estimate.store', { n: formatInt(i + 1, lang) })}
                {l.activity ? (
                  <>
                    {' — '}
                    <ActivityName activity={l.activity} />
                    {typeof l.activityFee === 'number' ? (
                      <>
                        {' '}
                        <Money amount={l.activityFee} />
                      </>
                    ) : null}
                  </>
                ) : null}
                {' · '}
                {formatInt(l.includedSeats, lang)} {t('home.estimate.lineIncluded')}, {formatInt(l.paidSeats, lang)} {t('home.estimate.linePaid')} — <Money amount={l.seatFee} />
              </li>
            ))}
          </ul>
          <p className="muted small">
            {t('account.quote.storesFee')}: <Money amount={quote.branchFee} /> · {t('account.quote.seatsFee')}: <Money amount={quote.staffFee} />
          </p>
        </div>
      ) : null}
    </section>
  );
}
