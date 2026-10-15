import type { ComplimentaryGrant } from '../api/types';
import { useI18n } from '../i18n';
import { DatedPhrase } from './ui';

/**
 * A platform grant with its own dates (docs/73 §11.5), as the Owner's page and the console both say it: running to its
 * end, ended, superseded by a paid period, or recorded with no end — never a paid period's date in its place. A
 * business with a free trial gives its zone: a grant decided during the trial runs from the trial's end, so its dates
 * are told as the trial's are.
 */
export function GrantLine({ grant, timeZone = null }: { grant: ComplimentaryGrant | undefined; timeZone?: string | null }) {
  const { t } = useI18n();
  if (!grant || grant.status === 'none') return null;
  if (grant.status === 'indefinite') return <p>{t('account.grant.indefinite')}</p>;
  if (grant.status === 'active') {
    return (
      <p>
        <DatedPhrase phrase="account.grant.until" dates={{ date: grant.until }} timeZone={timeZone} />
      </p>
    );
  }
  if (grant.status === 'superseded') {
    return (
      <p className="muted">
        <DatedPhrase phrase="account.grant.superseded" dates={{ date: grant.until, paid: grant.paidUntil }} timeZone={timeZone} />
      </p>
    );
  }
  return (
    <p className="muted">
      <DatedPhrase phrase="account.grant.ended" dates={{ date: grant.until }} timeZone={timeZone} />
    </p>
  );
}
