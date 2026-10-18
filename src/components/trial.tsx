import { useRef, useState } from 'react';
import { ApiError } from '../api/client';
import type { EntitlementState, TrialClaimResult, TrialContact, TrialOffer, TrialView } from '../api/types';
import { ownerRequest } from '../auth/owner';
import { useI18n, type Key } from '../i18n';
import { formatInstant } from '../lib/format';
import { detailOf, refusalOf, TRIAL_TERMS_SHOWN } from '../lib/trial';
import { ErrorNotice, Notice, Phrase } from './ui';

/*
 * The free trial as the Owner meets it on the Dukan ERP portal, the only place it can be claimed (the owner's brief of
 * 2026-10-18): its terms, the button, the explicit confirmation, and what the server answered. Every date is a UTC
 * instant the server sent, shown in the business's own zone with the zone's name (formatInstant) — never this
 * browser's zone, never a zone written here, and never a date this page worked out.
 */

/** The terms, word for word what the claim's terms version stands for, with the end the server would set now. */
export function TrialTerms({ offer }: { offer: TrialOffer }) {
  const { t, lang } = useI18n();
  return (
    <ul className="terms">
      <li>{t('trial.terms.free')}</li>
      <li>{t('trial.terms.start')}</li>
      <li>
        <strong>
          <Phrase text={t('trial.terms.endsIf')} values={{ date: formatInstant(offer.wouldEndAt, offer.timeZone, lang) }} />
        </strong>
      </li>
      <li>{t('trial.terms.noPause')}</li>
      <li>{t('trial.terms.once')}</li>
      <li>{t('trial.terms.after')}</li>
      <li>{t('trial.terms.paid')}</li>
    </ul>
  );
}

/**
 * The claim (POST platform/my-subscription/trial/claim) — two presses, never a page load: the button, then the
 * explicit confirmation that the trial starts at once, lasts exactly 7 days (168 hours) and cannot be paused or
 * restarted. One attempt keeps one idempotency key: a retry after a lost answer sends the same key with the same body,
 * so the server replays its first answer rather than refuse a second claim. A refusal is the server's decision and
 * goes up to the page, which says it and reads the trial again; a failure worth retrying (no network, a server error,
 * too many attempts) stays here.
 */
export function ClaimTrial({ offer, onClaimed, onRefused }: { offer: TrialOffer; onClaimed: (result: TrialClaimResult) => void; onRefused: (error: unknown) => void }) {
  const { t, lang } = useI18n();
  const attempt = useRef<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  if (offer.termsVersion !== TRIAL_TERMS_SHOWN) return <Notice tone="warn">{t('trial.terms.changed')}</Notice>;

  const claim = async () => {
    attempt.current ??= crypto.randomUUID();
    setBusy(true);
    setError(null);
    try {
      onClaimed(await ownerRequest<TrialClaimResult>('platform/my-subscription/trial/claim', { method: 'POST', body: { idempotencyKey: attempt.current, termsVersion: TRIAL_TERMS_SHOWN } }));
    } catch (e) {
      if (refusalOf(e)) onRefused(e);
      else setError(e);
    } finally {
      setBusy(false);
    }
  };

  if (!confirming) {
    return (
      <div className="row">
        <button type="button" className="btn btn-primary" onClick={() => setConfirming(true)}>
          {t('trial.claim')}
        </button>
      </div>
    );
  }
  return (
    <div className="confirm stack" role="group" aria-labelledby="trial-confirm-title">
      <h3 id="trial-confirm-title">{t('trial.confirm.title')}</h3>
      <p>
        <strong>{t('trial.confirm.body')}</strong>
      </p>
      <p>
        <Phrase text={t('trial.terms.endsIf')} values={{ date: formatInstant(offer.wouldEndAt, offer.timeZone, lang) }} />
      </p>
      <TrialRefusal error={error} />
      <div className="row">
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void claim()}>
          {busy ? t('trial.claiming') : t('trial.confirm.yes')}
        </button>
        <button type="button" className="btn" disabled={busy} onClick={() => setConfirming(false)}>
          {t('trial.confirm.no')}
        </button>
      </div>
    </div>
  );
}

/** Which contact the claim still waits for, and where it is verified: the WhatsApp number in the app; an email here, below. */
export function VerifyContacts({ missing }: { missing: TrialContact[] }) {
  const { t } = useI18n();
  if (missing.length === 0) return <Notice tone="warn">{t('trial.error.contact_unverified')}</Notice>;
  return (
    <>
      {missing.includes('phone') ? <Notice tone="warn">{t('trial.verify.phone')}</Notice> : null}
      {missing.includes('email') ? <Notice tone="warn">{t('trial.verify.email')}</Notice> : null}
    </>
  );
}

/** A trial refusal in words — never its code — and anything else the way every page says an error. */
export function TrialRefusal({ error }: { error: unknown }) {
  const { t } = useI18n();
  if (!error) return null;
  const code = refusalOf(error);
  if (code === 'contact_unverified') return <VerifyContacts missing={detailOf<TrialContact[]>(error, 'missingContacts') ?? []} />;
  if (code) return <Notice tone="danger">{t(`trial.error.${code}` as Key)}</Notice>;
  if (error instanceof ApiError && error.status === 429) return <Notice tone="danger">{t('trial.error.too_many_requests')}</Notice>;
  return <ErrorNotice error={error} />;
}

/**
 * What the last claim on this page came to: started, with the end the server recorded — or refused, in words. A
 * refusal the offer read again now explains itself (a contact still to verify, a suspension) is not said twice.
 */
export function ClaimOutcome({ claimed, refused, offer }: { claimed: TrialClaimResult | null; refused: unknown; offer: TrialOffer | null }) {
  const { t, lang } = useI18n();
  if (claimed) {
    return (
      <Notice tone="ok">
        <Phrase text={t('trial.started')} values={{ date: formatInstant(claimed.trial.endsAt, claimed.trial.timeZone, lang) }} />
      </Notice>
    );
  }
  if (offer && !offer.available && offer.reason !== null && refusalOf(refused) === offer.reason) return null;
  return <TrialRefusal error={refused} />;
}

/**
 * The recorded trial: its exact end and its start, or when it ended — and what its end means. Access the platform
 * approved during it (paid, or granted) starts the moment it ends, and then that is what is said (C6); without it the
 * business turns read-only at the end, as the terms said.
 */
export function TrialFacts({ trial, state }: { trial: TrialView; state: EntitlementState }) {
  const { t, lang } = useI18n();
  const at = (iso: string | null) => formatInstant(iso, trial.timeZone, lang);
  if (trial.status === 'active') {
    const after = trial.accessAfterTrial ?? null;
    return (
      <div className="stack-tight">
        <p>
          <strong>
            <Phrase text={t('trial.active.ends')} values={{ date: at(trial.endsAt) }} />
          </strong>
        </p>
        <p className="muted">
          <Phrase text={t('trial.active.started')} values={{ date: at(trial.startedAt) }} />
        </p>
        {after ? (
          <p>
            <Phrase text={t(after.kind === 'granted' ? 'trial.access.granted' : 'trial.access.paid')} values={{ date: at(after.startsAt) }} />
          </p>
        ) : (
          <>
            <p className="muted small">{t('trial.terms.after')}</p>
            <p className="muted small">{t('trial.terms.paid')}</p>
          </>
        )}
      </div>
    );
  }
  return (
    <div className="stack-tight">
      <p>
        <strong>
          <Phrase text={t('trial.expired.ended')} values={{ date: at(trial.endsAt) }} />
        </strong>
      </p>
      {state === 'trial_expired' ? <Notice tone="warn">{t('trial.expired.readOnly')}</Notice> : null}
    </div>
  );
}

/**
 * What the server says of the trial: a recorded trial with its dates; or the offer — its terms, the button and its
 * confirmation — or why it cannot be claimed yet; or nothing at all.
 */
export function TrialPanel({
  state,
  trial,
  offer,
  onClaimed,
  onRefused,
}: {
  state: EntitlementState;
  trial: TrialView | null;
  offer: TrialOffer | null;
  onClaimed: (result: TrialClaimResult) => void;
  onRefused: (error: unknown) => void;
}) {
  const { t } = useI18n();
  if (trial && trial.status !== 'available') return <TrialFacts trial={trial} state={state} />;
  if (!offer) return null;
  if (!offer.available) {
    return (
      <>
        <p>{t('trial.eligible')}</p>
        {offer.reason === 'contact_unverified' ? (
          <VerifyContacts missing={offer.missingContacts} />
        ) : offer.reason === 'business_suspended' ? (
          <Notice tone="warn">{t('trial.error.business_suspended')}</Notice>
        ) : (
          <Notice tone="info">{t('trial.blocked.other')}</Notice>
        )}
      </>
    );
  }
  return (
    <>
      <TrialTerms offer={offer} />
      <ClaimTrial offer={offer} onClaimed={onClaimed} onRefused={onRefused} />
    </>
  );
}
