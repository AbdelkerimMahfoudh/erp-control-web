import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { SeatRequest, SeatRequestStatus } from '../../api/types';
import { adminRequest } from '../../auth/admin';
import { RequestAmount, RequestStatus, RequestSummary } from '../../components/requests';
import { Empty, ErrorNotice, Loading, Notice, requestStatusKey, Table } from '../../components/ui';
import { useI18n } from '../../i18n';
import { formatDateTime } from '../../lib/format';
import { SeatRequestActions } from './SeatRequestActions';
import { useStepUp } from './useStepUp';

const STATUSES: SeatRequestStatus[] = ['pending_payment', 'paid', 'granted', 'released', 'refused'];

/**
 * The platform's queue of seat, store and activity requests (docs/68 §4,
 * docs/73 §6). An activity change reads "from → to", when it takes effect and
 * the amount the server recorded; a change waiting for the renewal is listed
 * under "granted" and says so.
 */
export function SeatRequests() {
  const { t, lang } = useI18n();
  const [status, setStatus] = useState<SeatRequestStatus>('pending_payment');
  const [rows, setRows] = useState<SeatRequest[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  /** The last decision's result, kept above the list: the decided row usually leaves the list it was shown in. */
  const [outcome, setOutcome] = useState<string[] | null>(null);
  const { ask, dialog } = useStepUp();

  const load = useCallback(async () => {
    try {
      setRows(await adminRequest<SeatRequest[]>(`platform/seat-requests?status=${status}`));
    } catch (e) {
      setError(e);
    }
  }, [status]);
  useEffect(() => {
    setRows(null);
    void load();
  }, [load]);

  return (
    <div className="stack">
      {dialog}
      <div className="row spread">
        <h1>{t('admin.seats.title')}</h1>
        <label className="row">
          <span className="muted small">{t('admin.seats.filter')}</span>
          <select className="compact" value={status} onChange={(e) => setStatus(e.target.value as SeatRequestStatus)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(requestStatusKey(s))}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ErrorNotice error={error} />
      {outcome ? (
        <Notice tone="ok">
          {outcome.map((l) => (
            <div key={l}>{l}</div>
          ))}
        </Notice>
      ) : null}
      {rows === null ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty text={t('admin.seats.none')} />
      ) : (
        <Table
          columns={[
            {
              label: t('admin.seats.business'),
              render: (r) => (r.business ? <Link to={`/admin/businesses/${r.business.id}`}>{r.business.name}</Link> : '—'),
            },
            { label: t('admin.seats.request'), render: (r) => <RequestSummary request={r} /> },
            { label: t('admin.seats.amount'), render: (r) => <RequestAmount request={r} /> },
            { label: t('admin.businesses.state'), render: (r) => <RequestStatus request={r} /> },
            { label: t('admin.seats.requested'), render: (r) => formatDateTime(r.requestedAt, lang) },
            { label: '', render: (r) => (r.business ? <SeatRequestActions companyId={r.business.id} request={r} ask={ask} onDone={load} onOutcome={setOutcome} /> : null) },
          ]}
          rows={rows}
          keyOf={(r) => r.id}
        />
      )}
    </div>
  );
}
