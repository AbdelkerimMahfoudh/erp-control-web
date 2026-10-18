import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { NoticeKind, NoticeLog, NoticeRow, NoticeState } from '../../api/types';
import { adminRequest } from '../../auth/admin';
import { NoticeStateBadge, Where, noticeName } from '../../components/notices';
import { Empty, ErrorNotice, Loading, Table } from '../../components/ui';
import { useI18n, type Key } from '../../i18n';
import { formatDateTime, formatInt } from '../../lib/format';

const STATES: NoticeState[] = ['failed', 'pending', 'sending', 'accepted', 'delivered', 'cancelled', 'superseded'];
const KINDS: NoticeKind[] = ['portal_instructions', 'trial_reminder', 'trial_expired', 'paid_reminder', 'paid_expired', 'grace_reminder', 'grace_ended'];

/** Why it went by email, why nothing carried it, or why it was cancelled — the server's recorded reason, in a few words. */
export function NoticeReason({ row }: { row: NoticeRow }) {
  const { t } = useI18n();
  const reason = row.failureReason
    ? t(`admin.messages.reason.failure.${row.failureReason}`)
    : row.fallbackReason
      ? t(`admin.messages.reason.fallback.${row.fallbackReason}`)
      : row.cancelReason
        ? t(`admin.messages.reason.cancel.${row.cancelReason}` as Key)
        : null;
  return reason ? <>{reason}</> : <span className="muted">—</span>;
}

/**
 * Every subscription message across businesses (GET platform/notices; 0099, docs/101 §7), newest first: which message,
 * for which business, by which channel to which masked destination, what became of it and why. The counts above are
 * every message's, by state; the filters narrow the list. A read: nothing here sends, retries or cancels a message.
 */
export function Messages() {
  const { t, lang } = useI18n();
  const [state, setState] = useState('');
  const [kind, setKind] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<NoticeLog | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page) });
    if (state) params.set('state', state);
    if (kind) params.set('kind', kind);
    adminRequest<NoticeLog>(`platform/notices?${params.toString()}`)
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch(setError);
  }, [state, kind, page]);

  return (
    <div className="stack">
      <h1>{t('admin.messages.title')}</h1>
      <p className="muted small">{t('admin.messages.lead')}</p>
      {data ? (
        <div className="grid">
          {STATES.map((s) => (
            <div key={s} className="kpi">
              <span className="value">{formatInt(data.byState[s] ?? 0, lang)}</span>
              <span className="label">
                <NoticeStateBadge state={s} />
              </span>
            </div>
          ))}
        </div>
      ) : null}
      <div className="row">
        <select className="compact" value={state} onChange={(e) => (setPage(1), setState(e.target.value))} aria-label={t('admin.messages.state')}>
          <option value="">{t('admin.messages.allStates')}</option>
          {STATES.map((s) => (
            <option key={s} value={s}>
              {t(`notice.state.${s}`)}
            </option>
          ))}
        </select>
        <select className="compact" value={kind} onChange={(e) => (setPage(1), setKind(e.target.value))} aria-label={t('admin.messages.message')}>
          <option value="">{t('admin.messages.allKinds')}</option>
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {t(`notice.kind.${k}`)}
            </option>
          ))}
        </select>
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
              { label: t('admin.audit.when'), render: (r) => formatDateTime(r.createdAt, lang) },
              {
                label: t('apply.business'),
                render: (r) =>
                  r.business ? (
                    <Link to={`/admin/businesses/${r.business.id}`}>
                      <strong>{r.business.name}</strong>
                    </Link>
                  ) : (
                    '—'
                  ),
              },
              {
                label: t('admin.messages.message'),
                render: (r) => (
                  <span className="stack-tight">
                    <span>{noticeName(r.kind, r.threshold, t, lang, r.variant)}</span>
                    {r.resend ? <span className="muted small">{t('admin.messages.resend')}</span> : null}
                  </span>
                ),
              },
              { label: t('admin.messages.channel'), render: (r) => (r.channel ? <Where channel={r.channel} destination={r.destination} /> : '—') },
              { label: t('admin.messages.state'), render: (r) => <NoticeStateBadge state={r.state} /> },
              { label: t('admin.messages.reason'), render: (r) => <NoticeReason row={r} /> },
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
