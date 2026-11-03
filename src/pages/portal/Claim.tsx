import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../../api/client';
import { portalClaimLink } from '../../auth/owner';
import { Loading, Notice } from '../../components/ui';
import { useI18n, type Key } from '../../i18n';
import { PORTAL_HOME } from '../../site/routes';

/**
 * Where the account-ready message's button lands (post-Build-4): `/claim/<link>`. The link leaves the address at once —
 * the history entry is replaced, and the page sends no referrer — and goes to the API in a request body, spent once
 * for the Owner's normal portal session. Then the Owner's page, which shows whether the business may claim its free
 * trial and claims it only when the Owner asks. A link that cannot open says why and what to do instead.
 */
type Refusal = 'invalid' | 'expired' | 'used' | 'unavailable';

const REFUSAL: Record<Refusal, Key> = {
  invalid: 'portal.claim.notValid',
  expired: 'portal.claim.expired',
  used: 'portal.claim.used',
  unavailable: 'portal.claim.unavailable',
};

export function Claim() {
  const { t } = useI18n();
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const [refused, setRefused] = useState<Refusal | null>(null);
  const spent = useRef(false);

  useEffect(() => {
    // Once per load, even under React's double effects: the link is single-use.
    if (spent.current) return;
    spent.current = true;
    window.history.replaceState(null, '', '/claim');
    portalClaimLink(token)
      .then(() => navigate(PORTAL_HOME, { replace: true }))
      .catch((e: unknown) => {
        const code = e instanceof ApiError ? e.code : null;
        setRefused(code === 'claim_link_expired' ? 'expired' : code === 'claim_link_used' ? 'used' : code === 'claim_link_invalid' ? 'invalid' : 'unavailable');
      });
  }, [token, navigate]);

  if (!refused) return <Loading />;
  return (
    <div className="stack">
      <meta name="referrer" content="no-referrer" />
      <section className="hero">
        <h1>{t('portal.claim.title')}</h1>
      </section>
      <Notice tone={refused === 'unavailable' ? 'danger' : 'warn'}>{t(REFUSAL[refused])}</Notice>
      <div className="row">
        <Link className="btn btn-primary" to={PORTAL_HOME}>
          {t('portal.claim.signIn')}
        </Link>
      </div>
      <p className="muted small">{t('portal.claim.support')}</p>
    </div>
  );
}
