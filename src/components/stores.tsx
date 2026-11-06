import type { StoreStatus } from '../api/types';
import { useI18n, type Key } from '../i18n';
import { formatDate } from '../lib/format';
import { Badge, Money } from './ui';

/**
 * 0132 (docs/122): each store is its own subscription. Its state in words and colour, and its own end — the console's
 * business page and the portal read the same server list.
 */
export function StoreStatusList({ stores }: { stores: StoreStatus[] }) {
  const { t, lang } = useI18n();
  if (!stores.length) return null;
  return (
    <ul className="stack-tight" data-testid="store-status">
      {stores.map((s) => {
        const ends = s.graceEndsAt ?? s.paidUntil ?? s.trialEndsAt ?? s.complimentaryUntil;
        return (
          <li key={s.branchId} className="row spread">
            <bdi>{lang === 'ar' && s.nameAr ? s.nameAr : s.name}</bdi>
            <span className="small">
              <Badge tone={s.canWrite ? 'ok' : 'warn'}>{t(`portal.stores.state.${s.state}` as Key)}</Badge>
              {ends ? <> · {t(s.graceEndsAt ? 'portal.stores.graceUntil' : 'portal.stores.until', { date: formatDate(ends, lang) })}</> : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** A proof's lines: the stores it pays for and each amount — what its approval applies, store by store. */
export function ProofLines({ lines }: { lines: { branchId: string; name: string; amount: number; pending?: boolean }[] | null | undefined }) {
  const { t } = useI18n();
  if (!lines?.length) return null;
  return (
    <div className="stack-tight">
      <strong className="small">{t('admin.proof.lines')}</strong>
      <ul className="stack-tight small" data-testid="proof-lines">
        {lines.map((l) => (
          <li key={l.branchId} className="row spread">
            <span>
              <bdi>{l.name}</bdi>
              {l.pending ? <> <Badge tone="warn">{t('portal.branches.pending.badge')}</Badge></> : null}
            </span>
            <Money amount={l.amount} />
          </li>
        ))}
      </ul>
    </div>
  );
}
