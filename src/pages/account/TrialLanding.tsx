import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../../api/client';
import type { EntitlementState, MySubscription, TrialClaimResult, TrialLinkCheck, TrialLinkOutcome, TrialOffer, TrialStatus, TrialView } from '../../api/types';
import { ownerRequest } from '../../auth/owner';
import { ClaimOutcome, TrialPanel, TrialRefusal } from '../../components/trial';
import { Loading, Notice, StateBadge } from '../../components/ui';
import { useI18n, type Key } from '../../i18n';
import { isTokenShaped, refusalOf, setupTokenIn } from '../../lib/trial';
import { TRIAL_LANDING } from '../../site/routes';

/** Read again every minute while an offer is shown, as on the account page: the end it would set stays the server's. */
const REFRESH_MS = 60_000;

/**
 * The setup link's token (2026-10-13): taken from `#t=` or `?t=` on /account/trial before anything is sent, kept in
 * this page's memory only — never storage, never a log — and the address replaced by /account/trial at once, so the
 * token leaves the address bar, the history and any later referrer. It is sent after sign-in, in a POST body, only.
 */
export function useSetupToken(landing: boolean): string | null {
  const { hash, search } = useLocation();
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    if (!landing) return;
    const found = setupTokenIn(hash, search);
    if (found === null) return;
    setToken(found);
    navigate(TRIAL_LANDING, { replace: true });
  }, [landing, hash, search, navigate]);
  return token;
}

/** The link's refusal at the claim, as the link check would have said it. */
const LINK_OF: Partial<Record<string, TrialLinkOutcome>> = {
  link_invalid: 'invalid',
  link_expired: 'expired',
  link_used: 'used',
  link_revoked: 'revoked',
  link_other_account: 'other_account',
};

interface View {
  state: EntitlementState;
  trial: TrialView | null;
  offer: TrialOffer | null;
}

/**
 * Where the setup link lands (/account/trial, 2026-10-13). This renders once the Owner has signed in: an emailed link
 * opens a fresh tab, and the token waited in memory meanwhile. With a token, the server says what the link is worth
 * for this Owner (POST …/trial/link, which never consumes it); without one — or once the link is refused while the
 * business can still claim — the page offers the ordinary claim. Nothing changes until the Owner presses the button:
 * a scanner or a preview that opens the link meets a sign-in form, and nothing else.
 */
export function TrialLanding({ token, data, onChanged, onSignOut }: { token: string | null; data: MySubscription; onChanged: () => Promise<void>; onSignOut: () => Promise<void> }) {
  const { t } = useI18n();
  const [view, setView] = useState<View | null>(null);
  const [link, setLink] = useState<TrialLinkOutcome | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [claimed, setClaimed] = useState<TrialClaimResult | null>(null);
  const [refused, setRefused] = useState<unknown>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // A failure is said only while nothing is shown yet: a later reading that failed says nothing new about the trial.
  const read = useCallback(async () => {
    try {
      const s = await ownerRequest<TrialStatus>('platform/my-subscription/trial');
      if (!alive.current) return;
      setView({ state: s.state, trial: s.trial, offer: s.offer });
      setError(null);
    } catch (e) {
      if (alive.current) setError(e);
    }
  }, []);

  // The link is checked once per token; a token not even shaped like one is invalid without being sent anywhere.
  useEffect(() => {
    if (token === null) {
      void read();
      return;
    }
    if (!isTokenShaped(token)) {
      setLink('invalid');
      void read();
      return;
    }
    let live = true;
    ownerRequest<TrialLinkCheck>('platform/my-subscription/trial/link', { method: 'POST', body: { token } })
      .then((c) => {
        if (!live) return;
        setLink(c.link);
        setView({ state: c.state, trial: c.trial, offer: c.offer });
        setError(null);
      })
      .catch((e: unknown) => {
        if (!live) return;
        // A link the server will not even look at (malformed by the time it arrived) is an invalid link.
        if (e instanceof ApiError && e.status === 400) {
          setLink('invalid');
          void read();
        } else setError(e);
      });
    return () => {
      live = false;
    };
  }, [token, read]);

  const offerShown = view?.offer != null;
  useEffect(() => {
    if (!offerShown) return;
    const id = setInterval(() => void read(), REFRESH_MS);
    return () => clearInterval(id);
  }, [offerShown, read]);

  const after = async () => {
    await Promise.all([read(), onChanged()]);
  };
  // Only a link the server called valid goes with the claim; once refused, the claim goes without it.
  const linkToken = link === 'valid' ? token : null;
  const linkRefused = link !== null && link !== 'valid';

  return (
    <div className="stack">
      <section className="hero row spread">
        <div>
          <h1>{t('trial.title')}</h1>
          <p className="lead">
            <StateBadge state={view?.state ?? data.entitlement.state} /> {data.business.name}
          </p>
        </div>
        <div className="row">
          <Link className="btn btn-sm" to="/account">
            {t('home.cta.account')}
          </Link>
          <button type="button" className="btn btn-sm" onClick={() => void onSignOut()}>
            {t('action.signOut')}
          </button>
        </div>
      </section>
      <section className="card stack">
        {!view ? (
          error ? <TrialRefusal error={error} /> : <Loading />
        ) : (
          <>
            <ClaimOutcome claimed={claimed} refused={refused} offer={view.offer} />
            {linkRefused ? <Notice tone="warn">{t(`trial.error.link_${link}` as Key)}</Notice> : null}
            {linkRefused && view.offer?.available ? <p>{t('trial.landing.withoutLink')}</p> : null}
            {!view.offer && !view.trial ? <Notice tone="info">{t('trial.error.trial_not_available')}</Notice> : null}
            <TrialPanel
              state={view.state}
              trial={view.trial}
              offer={view.offer}
              token={linkToken}
              onClaimed={(r) => {
                setClaimed(r);
                setRefused(null);
                void after();
              }}
              onRefused={(e) => {
                const outcome = LINK_OF[refusalOf(e) ?? ''];
                // The link no longer stands (it expired, was used or replaced since it was checked): say so, and
                // offer the claim without it if the business can still claim.
                if (outcome) setLink(outcome);
                else setRefused(e);
                void after();
              }}
            />
          </>
        )}
      </section>
    </div>
  );
}
