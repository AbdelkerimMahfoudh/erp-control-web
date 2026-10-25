import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AcquisitionReport, AcquisitionRow, AcquisitionSource, AcquisitionSummary } from '../../api/types';
import { adminRequest } from '../../auth/admin';
import { Badge, Empty, ErrorNotice, Loading, StateBadge, Table } from '../../components/ui';
import { useI18n } from '../../i18n';
import { formatDate, formatInt } from '../../lib/format';
import { TestBadge } from './provisioning';
import { Pager } from './Promoters';

/**
 * Where self-registered businesses came from (0103, D221): no source, a promoter's code or QR card, or another
 * business's invitation — counted for a period, then listed. Facts only: the business, when it registered, the source
 * and the snapshot taken then, and how the business stands now. A business created in this console has no source and
 * is not here.
 */
export function RegistrationSources() {
  const { t, lang } = useI18n();
  const [source, setSource] = useState<'' | AcquisitionSource>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(0);
  const [summary, setSummary] = useState<AcquisitionSummary | null>(null);
  const [data, setData] = useState<AcquisitionReport | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    const range = new URLSearchParams();
    if (from) range.set('from', from);
    if (to) range.set('to', to);
    const params = new URLSearchParams(range);
    params.set('page', String(page));
    if (source) params.set('source', source);
    let live = true;
    Promise.all([
      adminRequest<AcquisitionSummary>(`platform/acquisitions/summary?${range.toString()}`),
      adminRequest<AcquisitionReport>(`platform/acquisitions?${params.toString()}`),
    ])
      .then(([s, d]) => {
        if (!live) return;
        setSummary(s);
        setData(d);
        setError(null);
      })
      .catch((e) => live && setError(e));
    return () => {
      live = false;
    };
  }, [source, from, to, page]);

  return (
    <div className="stack">
      <h1>{t('admin.sources.title')}</h1>
      <p className="muted small">{t('admin.sources.lead')}</p>
      {summary ? (
        <div className="grid">
          <div className="kpi">
            <span className="value">{formatInt(summary.total, lang)}</span>
            <span className="label">{t('admin.sources.total')}</span>
          </div>
          <div className="kpi">
            <span className="value">{formatInt(summary.promoter, lang)}</span>
            <span className="label">{t('admin.sources.promoter')}</span>
          </div>
          <div className="kpi">
            <span className="value">{formatInt(summary.userInvite, lang)}</span>
            <span className="label">{t('admin.sources.user_invite')}</span>
          </div>
          <div className="kpi">
            <span className="value">{formatInt(summary.none, lang)}</span>
            <span className="label">{t('admin.sources.none')}</span>
          </div>
        </div>
      ) : null}
      <div className="row">
        <select className="compact" value={source} onChange={(e) => (setPage(0), setSource(e.target.value as '' | AcquisitionSource))} aria-label={t('admin.sources.col.source')}>
          <option value="">{t('admin.sources.all')}</option>
          <option value="promoter">{t('admin.sources.promoter')}</option>
          <option value="user_invite">{t('admin.sources.user_invite')}</option>
          <option value="none">{t('admin.sources.none')}</option>
        </select>
        <label className="row small">
          {t('admin.sources.from')}
          <input type="date" className="compact" value={from} onChange={(e) => (setPage(0), setFrom(e.target.value))} />
        </label>
        <label className="row small">
          {t('admin.sources.to')}
          <input type="date" className="compact" value={to} onChange={(e) => (setPage(0), setTo(e.target.value))} />
        </label>
      </div>
      <ErrorNotice error={error} />
      {!data ? (
        error ? null : <Loading />
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
                    <Link to={`/admin/businesses/${r.companyId}`}>
                      <strong>{r.businessName ?? '—'}</strong>
                    </Link>
                    {r.isTest ? <TestBadge /> : null}
                  </span>
                ),
              },
              { label: t('admin.sources.col.registered'), render: (r) => <bdi>{formatDate(r.registeredAt, lang)}</bdi> },
              {
                label: t('admin.sources.col.source'),
                render: (r) => (
                  <span className="stack-tight">
                    <span>{t(`admin.sources.${r.source}`)}</span>
                    {r.mechanism ? <span className="muted small">{t(`admin.sources.mechanism.${r.mechanism}`)}</span> : null}
                  </span>
                ),
              },
              { label: t('admin.sources.col.detail'), render: (r) => <SourceDetail row={r} /> },
              { label: t('admin.sources.col.finished'), render: (r) => <AcquisitionStatus row={r} /> },
            ]}
            rows={data.rows}
            keyOf={(r) => r.companyId}
          />
          <Pager page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
        </>
      )}
    </div>
  );
}

function SourceDetail({ row }: { row: AcquisitionRow }) {
  const { t, lang } = useI18n();
  if (row.promoter) {
    return (
      <span className="stack-tight">
        <Link to={`/admin/promoters/${row.promoter.id}`}>{row.promoter.nameSnapshot ?? '—'}</Link>
        {row.promoter.codeVersion ? <span className="muted small">{t('admin.business.version', { n: formatInt(row.promoter.codeVersion, lang) })}</span> : null}
      </span>
    );
  }
  if (row.inviter) return <Link to={`/admin/businesses/${row.inviter.companyId}`}>{row.inviter.businessName}</Link>;
  return <span className="muted">—</span>;
}

/** How the business stands now: its subscription's state, and whether its Owner finished registering. */
export function AcquisitionStatus({ row }: { row: AcquisitionRow }) {
  const { t } = useI18n();
  // The subscription's own status, not the full entitlement: the business's page has the rest, one tap away.
  const status = row.closed ? (
    <Badge tone="muted">{t('admin.sources.closed')}</Badge>
  ) : row.status === 'activated' ? (
    <Badge tone="ok">{t('admin.sources.activated')}</Badge>
  ) : (
    <StateBadge state={row.status === 'pending_activation' ? 'pending' : row.status} />
  );
  return (
    <span className="row">
      {status}
      <Badge tone={row.completed ? 'ok' : 'muted'}>{t(row.completed ? 'admin.sources.finished.yes' : 'admin.sources.finished.no')}</Badge>
    </span>
  );
}
