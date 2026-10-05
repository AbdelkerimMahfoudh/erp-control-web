import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { BusinessList, EntitlementState } from '../../api/types';
import { adminRequest } from '../../auth/admin';
import { Empty, ErrorNotice, Loading, StateBadge, Table } from '../../components/ui';
import { useI18n, type Key } from '../../i18n';
import { formatDate, formatInt } from '../../lib/format';

const STATES: EntitlementState[] = ['pending', 'active', 'grace', 'complimentary', 'suspended', 'expired', 'cancelled', 'rejected'];

export function Businesses() {
  const { t, lang } = useI18n();
  const [q, setQ] = useState('');
  const [state, setState] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<BusinessList | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (state) params.set('state', state);
    params.set('page', String(page));
    adminRequest<BusinessList>(`platform/businesses?${params.toString()}`).then(setData).catch(setError);
  }, [q, state, page]);

  return (
    <div className="stack">
      <h1>{t('admin.businesses.title')}</h1>
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
                  <Link to={`/admin/businesses/${r.id}`}>
                    <strong>{r.name}</strong>
                  </Link>
                ),
              },
              { label: t('admin.business.storeId'), render: (r) => <span className="ltr">{r.publicStoreId}</span> },
              { label: t('apply.city'), render: (r) => r.city ?? '—' },
              { label: t('admin.businesses.state'), render: (r) => <StateBadge state={r.state} /> },
              { label: t('account.period.ends', { date: '' }).trim(), render: (r) => formatDate(r.periodEnd, lang) },
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
