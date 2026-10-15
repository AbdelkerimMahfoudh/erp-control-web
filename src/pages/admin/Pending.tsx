import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { PendingApplication } from '../../api/types';
import { adminRequest } from '../../auth/admin';
import { Badge, Empty, ErrorNotice, Loading, Phrase, StateBadge, Table } from '../../components/ui';
import { useI18n, type Key } from '../../i18n';
import { formatDateTime, formatInstant } from '../../lib/format';

/** The subscription statuses an application can stand at, each with its words. */
const STATUSES = new Set(['pending_activation', 'activated', 'suspended', 'cancelled', 'rejected']);

/**
 * Where an application stands, in colour and words, never as a code (review R4-13). The state the server computes
 * comes first (C8): a business using its free trial reads as one, with the trial's end in the business's zone. An API
 * that sends only the subscription's status gets that status in words; an application with no business yet is
 * incomplete.
 */
function PendingState({ row }: { row: PendingApplication }) {
  const { t, lang } = useI18n();
  if (!row.companyId) return <Badge tone="muted">{t('admin.pending.incomplete')}</Badge>;
  if (row.state) {
    return (
      <span className="stack-tight">
        <StateBadge state={row.state} />
        {row.trial?.status === 'active' && row.trial.endsAt ? (
          <span className="muted small">
            <Phrase text={t('admin.trial.ends')} values={{ date: formatInstant(row.trial.endsAt, row.trial.timeZone, lang) }} />
          </span>
        ) : null}
      </span>
    );
  }
  return (
    <Badge tone={row.status === 'pending_activation' ? 'info' : 'muted'}>
      {STATUSES.has(row.status) ? t(`admin.pending.status.${row.status}` as Key) : t('status.unknown')}
    </Badge>
  );
}

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
            { label: t('admin.businesses.state'), render: (r) => <PendingState row={r} /> },
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
