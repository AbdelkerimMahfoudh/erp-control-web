import { useEffect, useState } from 'react';
import type { Dashboard as DashboardData, EntitlementState } from '../../api/types';
import { adminRequest } from '../../auth/admin';
import { ErrorNotice, Loading, StateBadge } from '../../components/ui';
import { useI18n } from '../../i18n';
import { formatInt } from '../../lib/format';

const STATES: EntitlementState[] = ['pending', 'active', 'grace', 'complimentary', 'suspended', 'expired', 'cancelled', 'rejected'];

export function Dashboard() {
  const { t, lang } = useI18n();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    adminRequest<DashboardData>('platform/dashboard').then(setData).catch(setError);
  }, []);
  if (error) return <ErrorNotice error={error} />;
  if (!data) return <Loading />;
  const kpis: [string, number][] = [
    [t('admin.dashboard.businesses'), data.businesses],
    [t('admin.dashboard.stores'), data.branches],
    [t('admin.dashboard.users'), data.activeUsers],
    [t('admin.dashboard.pendingSeats'), data.pendingSeatRequests],
    [t('admin.dashboard.pendingStaff'), data.pendingStaff],
  ];
  return (
    <div className="stack">
      <h1>{t('admin.nav.dashboard')}</h1>
      <div className="grid">
        {kpis.map(([label, value]) => (
          <div className="card kpi" key={label}>
            <span className="value">{formatInt(value, lang)}</span>
            <span className="label">{label}</span>
          </div>
        ))}
      </div>
      <section className="card">
        <h2>{t('admin.dashboard.byState')}</h2>
        <div className="row">
          {STATES.map((s) => (
            <span key={s} className="row">
              <StateBadge state={s} /> <strong>{formatInt(data.byState[s] ?? 0, lang)}</strong>
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
