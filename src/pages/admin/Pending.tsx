import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { PendingApplication } from '../../api/types';
import { adminRequest } from '../../auth/admin';
import { Badge, Empty, ErrorNotice, Loading, Table } from '../../components/ui';
import { useI18n } from '../../i18n';
import { formatDateTime } from '../../lib/format';

export function Pending() {
  const { t, lang } = useI18n();
  const [rows, setRows] = useState<PendingApplication[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    adminRequest<PendingApplication[]>('platform/pending').then(setRows).catch(setError);
  }, []);
  return (
    <div className="stack">
      <h1>{t('admin.pending.title')}</h1>
      <ErrorNotice error={error} />
      {rows === null ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty text={t('admin.pending.none')} />
      ) : (
        <Table
          columns={[
            { label: t('apply.business'), render: (r) => <strong>{r.businessName}</strong> },
            { label: t('apply.owner'), render: (r) => r.ownerName },
            { label: t('apply.city'), render: (r) => r.city ?? '—' },
            {
              label: t('apply.email'),
              render: (r) => (
                <span className="ltr">
                  {r.email ?? ''} {r.phone ?? ''}
                </span>
              ),
            },
            { label: t('admin.businesses.state'), render: (r) => <Badge tone={r.status === 'pending_activation' ? 'info' : 'muted'}>{r.companyId ? r.status.replace(/_/g, ' ') : t('admin.pending.incomplete')}</Badge> },
            { label: t('admin.audit.when'), render: (r) => formatDateTime(r.registeredAt, lang) },
            {
              label: '',
              render: (r) =>
                r.companyId ? (
                  <Link className="btn btn-sm" to={`/admin/businesses/${r.companyId}`}>
                    {t('admin.pending.open')}
                  </Link>
                ) : null,
            },
          ]}
          rows={rows}
          keyOf={(r) => r.id}
        />
      )}
    </div>
  );
}
