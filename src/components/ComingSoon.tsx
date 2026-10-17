import { SURFACE } from '../config/site';
import { useI18n } from '../i18n';

/**
 * "Coming soon — not yet open for public registration", on the pre-launch website only (docs/96): said plainly wherever
 * Dukan ERP is presented, so no page can read as an offer of a service that is not open.
 */
export function ComingSoon() {
  const { t } = useI18n();
  if (SURFACE !== 'public') return null;
  return (
    <p className="notice tone-info coming-soon" role="note">
      <strong>{t('prelaunch.badge')}</strong>
    </p>
  );
}
