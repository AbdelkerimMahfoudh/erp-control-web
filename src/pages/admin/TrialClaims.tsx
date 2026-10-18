import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { TrialClaims as TrialClaimsData } from '../../api/types';
import { adminRequest } from '../../auth/admin';
import { Badge, Empty, ErrorNotice, Loading, Table } from '../../components/ui';
import { useI18n } from '../../i18n';
import { formatInstant, formatInt } from '../../lib/format';

/**
 * The free trials claimed on the portal (GET platform/trial-claims; 0095, 0099): each one's claim and end — the
 * server's instants, in the business's zone — and whether it runs; above them, how many run, how many ended and how
 * many eligible businesses have not claimed yet. A read: no trial is started, extended or shortened here.
 */
export function TrialClaims() {
  const { t, lang } = useI18n();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<TrialClaimsData | null>(null);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    const params = new URLSearchParams({ page: String(page) });
    if (status) params.set('status', status);
    adminRequest<TrialClaimsData>(`platform/trial-claims?${params.toString()}`)
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch(setError);
  }, [status, page]);

  if (!data) return error ? <ErrorNotice error={error} /> : <Loading />;
  return (
    <div className="stack">
      <h1>{t('admin.trial.list.title')}</h1>
      <p className="muted small">{t('admin.trial.list.lead')}</p>
      <div className="grid">
        <div className="kpi">
          <span className="value">{formatInt(data.summary.active, lang)}</span>
          <span className="label">{t('admin.trial.list.active')}</span>
        </div>
        <div className="kpi">
          <span className="value">{formatInt(data.summary.expired, lang)}</span>
          <span className="label">{t('admin.trial.list.expired')}</span>
        </div>
        <div className="kpi">
          <span className="value">{formatInt(data.summary.eligibleUnclaimed, lang)}</span>
          <span className="label">{t('admin.trial.list.unclaimed')}</span>
        </div>
      </div>
      <div className="row">
        <select className="compact" value={status} onChange={(e) => (setPage(1), setStatus(e.target.value))} aria-label={t('admin.trial.list.status')}>
          <option value="">{t('admin.trial.list.all')}</option>
          <option value="active">{t('admin.trial.list.active')}</option>
          <option value="expired">{t('admin.trial.list.expired')}</option>
        </select>
      </div>
      <ErrorNotice error={error} />
      {data.rows.length === 0 ? (
        <Empty />
      ) : (
        <>
          <Table
            columns={[
              {
                label: t('apply.business'),
                render: (r) => (
                  <Link to={`/admin/businesses/${r.business.id}`}>
                    <strong>{r.business.name}</strong>
                  </Link>
                ),
              },
              { label: t('admin.trial.list.status'), render: (r) => <Badge tone={r.status === 'active' ? 'ok' : 'muted'}>{t(`admin.trial.list.${r.status}`)}</Badge> },
              { label: t('admin.trial.list.claimed'), render: (r) => <bdi>{formatInstant(r.claimedAt, r.timeZone, lang)}</bdi> },
              { label: t('admin.trial.list.ends'), render: (r) => <bdi>{formatInstant(r.endsAt, r.timeZone, lang)}</bdi> },
              { label: t('admin.trial.list.method'), render: (r) => (r.registrationMethod ? t(`admin.trial.method.${r.registrationMethod}`) : '—') },
              { label: t('admin.trial.list.terms'), render: (r) => <span className="ltr">{r.termsVersion}</span> },
            ]}
            rows={data.rows}
            keyOf={(r) => r.id}
          />
          <div className="row">
            <button type="button" className="btn btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label={t('admin.page.previous')}>
              ‹
            </button>
            <span className="muted small">
              {formatInt(page, lang)} / {formatInt(Math.max(1, Math.ceil(data.total / data.pageSize)), lang)}
            </span>
            <button type="button" className="btn btn-sm" disabled={page * data.pageSize >= data.total} onClick={() => setPage(page + 1)} aria-label={t('admin.page.next')}>
              ›
            </button>
          </div>
        </>
      )}
    </div>
  );
}
