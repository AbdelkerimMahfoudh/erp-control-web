import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { BusinessList, BusinessRow, EntitlementState } from '../../api/types';
import { adminRequest } from '../../auth/admin';
import { Empty, ErrorNotice, Loading, StateBadge, Table } from '../../components/ui';
import { useI18n, type Key } from '../../i18n';
import { formatDate, formatInstant, formatInt } from '../../lib/format';
import { TestBadge } from './provisioning';

/** Every state the server computes, in the order a business meets them: the free trial's three (2026-10-13) come before paid access. */
const STATES: EntitlementState[] = ['pending', 'trial_available', 'trial_active', 'trial_expired', 'active', 'grace', 'complimentary', 'suspended', 'expired', 'cancelled', 'rejected'];

/**
 * When access ends (docs/73 §11.5): for a business on a platform grant, the later of the grant's own end and the paid
 * period's — a grant over a paid month runs on into that month — never the paid end alone, long past for a shop that
 * lapsed before the grant. Every other business ends with its paid period.
 */
export function accessEnd(r: Pick<BusinessRow, 'state' | 'periodEnd' | 'complimentary'>): string | null {
  const until = r.state === 'complimentary' ? r.complimentary?.until ?? null : null;
  if (!until) return r.periodEnd;
  return r.periodEnd && new Date(r.periodEnd).getTime() > new Date(until).getTime() ? r.periodEnd : until;
}

/**
 * A row's access end. A business with a free trial (C18) has it told as its own page tells it: in the business's zone,
 * with the zone's name, isolated — access decided during the trial runs from the trial's end, so its end is a trial
 * date too, and this browser's zone could name another day. Every other row, and every row of an API older than C18,
 * keeps the date it had.
 */
function AccessEndCell({ row }: { row: BusinessRow }) {
  const { lang } = useI18n();
  const end = accessEnd(row);
  if (!row.trial || !end) return <>{formatDate(end, lang)}</>;
  return <bdi>{formatInstant(end, row.trial.timeZone, lang)}</bdi>;
}

export function Businesses() {
  const { t, lang } = useI18n();
  const [q, setQ] = useState('');
  const [state, setState] = useState('');
  const [deferredOnly, setDeferredOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<BusinessList | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (state) params.set('state', state);
    if (deferredOnly) params.set('verification', 'deferred');
    params.set('page', String(page));
    adminRequest<BusinessList>(`platform/businesses?${params.toString()}`).then(setData).catch(setError);
  }, [q, state, page, deferredOnly]);

  return (
    <div className="stack">
      <div className="row spread">
        <h1>{t('admin.businesses.title')}</h1>
        <Link className="btn btn-primary btn-sm" to="/admin/businesses/new">
          {t('admin.new.title')}
        </Link>
      </div>
      <div className="row">
        <input placeholder={t('admin.businesses.search')} value={q} onChange={(e) => (setPage(1), setQ(e.target.value))} aria-label={t('admin.businesses.search')} />
        <select className="compact" value={state} onChange={(e) => (setPage(1), setState(e.target.value))} aria-label={t('admin.businesses.state')}>
          <option value="">{t('admin.businesses.all')}</option>
          {STATES.map((s) => (
            <option key={s} value={s}>
              {t(`status.${s}` as Key)}
            </option>
          ))}
        </select>
        <label className="row small">
          <input type="checkbox" className="checkbox-inline" checked={deferredOnly} onChange={(e) => (setPage(1), setDeferredOnly(e.target.checked))} />
          {t('admin.businesses.deferredOnly')}
        </label>
      </div>
      <ErrorNotice error={error} />
      {!data ? (
        <Loading />
      ) : data.rows.length === 0 ? (
        <Empty />
      ) : (
        <>
          <Table
            columns={[
              {
                label: t('apply.business'),
                render: (r) => (
                  <span className="row">
                    <Link to={`/admin/businesses/${r.id}`}>
                      <strong>{r.name}</strong>
                    </Link>
                    {r.isTest ? <TestBadge /> : null}
                  </span>
                ),
              },
              { label: t('admin.business.storeId'), render: (r) => <span className="ltr">{r.publicStoreId}</span> },
              { label: t('apply.city'), render: (r) => r.city ?? '—' },
              { label: t('admin.businesses.state'), render: (r) => <StateBadge state={r.state} /> },
              { label: t('account.period.ends', { date: '' }).trim(), render: (r) => <AccessEndCell row={r} /> },
              { label: t('admin.dashboard.stores'), render: (r) => formatInt(r.branches, lang) },
              { label: t('admin.business.people'), render: (r) => formatInt(r.users, lang) },
            ]}
            rows={data.rows}
            keyOf={(r) => r.id}
          />
          <div className="row">
            <button type="button" className="btn btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              ‹
            </button>
            <span className="muted small">
              {formatInt(page, lang)} / {formatInt(Math.max(1, Math.ceil(data.total / data.pageSize)), lang)}
            </span>
            <button type="button" className="btn btn-sm" disabled={page * data.pageSize >= data.total} onClick={() => setPage(page + 1)}>
              ›
            </button>
          </div>
        </>
      )}
    </div>
  );
}
