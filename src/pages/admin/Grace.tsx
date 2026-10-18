import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { GraceUsage } from '../../api/types';
import { adminRequest } from '../../auth/admin';
import { Badge, Empty, ErrorNotice, Loading, Table } from '../../components/ui';
import { useI18n } from '../../i18n';
import { formatInstant, formatInt } from '../../lib/format';

/**
 * The grace decisions across businesses (GET platform/grace; 0099, docs/101 §3): each paid period end decided once —
 * 72 hours of grace, or none because the business used its three of the last 12 months — newest first, each date in
 * the business's zone. Above them, how things stand now: the graces running, and the businesses at the limit. A read:
 * no grace is granted, refused or ended here.
 */
export function Grace() {
  const { t, lang } = useI18n();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<GraceUsage | null>(null);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    adminRequest<GraceUsage>(`platform/grace?page=${page}`)
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch(setError);
  }, [page]);

  if (!data) return error ? <ErrorNotice error={error} /> : <Loading />;
  const { rules, summary } = data;
  return (
    <div className="stack">
      <h1>{t('admin.grace.title')}</h1>
      <p className="muted small">
        {t('admin.grace.lead', { hours: formatInt(rules.durationHours, lang), allowance: formatInt(rules.allowance, lang), months: formatInt(rules.windowMonths, lang) })}
      </p>
      <div className="grid">
        <div className="kpi">
          <span className="value">{formatInt(summary.running, lang)}</span>
          <span className="label">{t('admin.grace.running')}</span>
        </div>
        <div className="kpi">
          <span className="value">{formatInt(summary.atAllowance, lang)}</span>
          <span className="label">{t('admin.grace.atAllowance')}</span>
        </div>
        <div className="kpi">
          <span className="value">{formatInt(summary.withUse, lang)}</span>
          <span className="label">{t('admin.grace.withUse', { months: formatInt(rules.windowMonths, lang) })}</span>
        </div>
      </div>
      <ErrorNotice error={error} />
      {data.rows.length === 0 ? (
        <Empty text={t('admin.grace.none')} />
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
              { label: t('admin.grace.periodEnd'), render: (r) => <bdi>{formatInstant(r.periodEnd, r.timeZone, lang)}</bdi> },
              {
                label: t('admin.grace.decision'),
                render: (r) => (
                  <span className="row">
                    <Badge tone={r.decision === 'granted' ? 'ok' : 'warn'}>{t(`admin.grace.decision.${r.decision}`)}</Badge>
                    {r.running ? <Badge tone="info">{t('admin.grace.runningBadge')}</Badge> : null}
                  </span>
                ),
              },
              { label: t('admin.grace.ends'), render: (r) => (r.decision === 'granted' ? <bdi>{formatInstant(r.endsAt, r.timeZone, lang)}</bdi> : '—') },
              { label: t('admin.grace.usesBefore'), render: (r) => t('admin.grace.usesOf', { used: formatInt(r.usesBefore, lang), allowance: formatInt(rules.allowance, lang) }) },
              { label: t('admin.grace.recordedBy'), render: (r) => t(`admin.grace.recordedBy.${r.recordedBy}`) },
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
