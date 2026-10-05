import { useEffect, useState } from 'react';
import type { AuditEvent } from '../../api/types';
import { adminRequest } from '../../auth/admin';
import { Empty, ErrorNotice, Loading, Table } from '../../components/ui';
import { useI18n } from '../../i18n';
import { formatDateTime } from '../../lib/format';

export function Audit() {
  const { t, lang } = useI18n();
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<AuditEvent[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    const params = new URLSearchParams({ page: String(page) });
    if (action.trim()) params.set('action', action.trim());
    adminRequest<AuditEvent[] | { rows: AuditEvent[] }>(`platform/audit?${params.toString()}`)
      .then((r) => setRows(Array.isArray(r) ? r : r.rows))
      .catch(setError);
  }, [action, page]);
  return (
    <div className="stack">
      <h1>{t('admin.audit.title')}</h1>
      <div className="row">
        <input placeholder={t('admin.audit.action')} value={action} onChange={(e) => (setPage(1), setAction(e.target.value))} aria-label={t('admin.audit.action')} dir="ltr" />
        <button type="button" className="btn btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
          ‹
        </button>
        <span className="muted small">{page}</span>
        <button type="button" className="btn btn-sm" disabled={!rows || rows.length < 50} onClick={() => setPage(page + 1)}>
          ›
        </button>
      </div>
      <ErrorNotice error={error} />
      {rows === null ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty />
      ) : (
        <Table
          columns={[
            { label: t('admin.audit.when'), render: (r) => formatDateTime(r.createdAt, lang) },
            { label: t('admin.audit.actor'), render: (r) => <span className="ltr">{r.actor}</span> },
            { label: t('admin.audit.action'), render: (r) => <code className="ltr">{r.action}</code> },
            { label: t('admin.audit.target'), render: (r) => r.targetLabel ?? r.targetType },
            { label: t('admin.audit.reason'), render: (r) => r.reason ?? '—' },
          ]}
          rows={rows}
          keyOf={(r) => r.id}
        />
      )}
    </div>
  );
}
