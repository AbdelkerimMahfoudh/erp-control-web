import type { ComplimentaryGrant } from '../api/types';
import { useI18n } from '../i18n';
import { formatDate } from '../lib/format';

/**
 * A platform grant with its own dates (docs/73 §11.5), as the Owner's page and the console both say it: running to its
 * end, ended, superseded by a paid period, or recorded with no end — never a paid period's date in its place.
 */
export function GrantLine({ grant }: { grant: ComplimentaryGrant | undefined }) {
  const { t, lang } = useI18n();
  if (!grant || grant.status === 'none') return null;
  if (grant.status === 'indefinite') return <p>{t('account.grant.indefinite')}</p>;
  if (grant.status === 'active') return <p>{t('account.grant.until', { date: formatDate(grant.until, lang) })}</p>;
  if (grant.status === 'superseded') return <p className="muted">{t('account.grant.superseded', { date: formatDate(grant.until, lang), paid: formatDate(grant.paidUntil, lang) })}</p>;
  return <p className="muted">{t('account.grant.ended', { date: formatDate(grant.until, lang) })}</p>;
}
