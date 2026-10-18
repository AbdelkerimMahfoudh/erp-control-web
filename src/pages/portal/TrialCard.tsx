import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../../api/client';
import type { TrialClaimResult, TrialContact, TrialSetup, TrialSetupAttempt, TrialStatus } from '../../api/types';
import { ownerRequest } from '../../auth/owner';
import { FailureNote, FallbackNote, Where } from '../../components/notices';
import { ClaimOutcome, TrialPanel, VerifyContacts } from '../../components/trial';
import { Badge, ErrorNotice, Notice, Phrase, type Tone } from '../../components/ui';
import { useI18n, type Key } from '../../i18n';
import { formatInstant, formatWait } from '../../lib/format';
import { detailOf, secondsUntil } from '../../lib/trial';

/** How often a shown card is read again: the end a claim would set moves with the clock, and the page shows the server's. */
const REFRESH_MS = 60_000;

/** How soon instructions still being sent are read again: their outcome is recorded once the providers answer. */
const SENDING_REREAD_MS = 5_000;

/**
 * The Owner's free-trial card on the portal (0095, 0099; docs/101 §5), from GET platform/my-subscription/trial. That
 * route answers the Owner only: any other role is refused (403) and sees no card at all, without an error — as does an
 * API older than the trial (404). The card shows what the server says: the offer with its terms, the button and its
 * confirmation, why it cannot be claimed yet, the running trial or the ended one; while the trial is still to be
 * claimed, where the portal instructions stand too. It is read again with the account, and every minute while shown.
 */
export function TrialCard({ version, onChanged }: { version: unknown; onChanged: () => Promise<void> }) {
  const { t } = useI18n();
  const [status, setStatus] = useState<TrialStatus | null>(null);
  const [claimed, setClaimed] = useState<TrialClaimResult | null>(null);
  const [refused, setRefused] = useState<unknown>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    try {
      const next = await ownerRequest<TrialStatus>('platform/my-subscription/trial');
      if (alive.current) setStatus(next);
    } catch (e) {
      // Not the Owner, or an API without the trial: no card, and nothing to say about it. Any other failure keeps
      // what is shown — a refresh that failed once says nothing new about the trial.
      if (alive.current && e instanceof ApiError && (e.status === 403 || e.status === 404)) setStatus(null);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load, version]);
  // After a send, its answer is shown at once and the trial read again.
  const reload = useCallback(
    async (next?: TrialSetup) => {
      if (next) setStatus((s) => (s ? { ...s, setup: next } : s));
      await load();
    },
    [load],
  );

  // An ended trial matters here only while it leaves the business read-only; once paid access runs it is history.
  const shown =
    status !== null &&
    (status.offer !== null || status.trial?.status === 'active' || (status.trial?.status === 'expired' && status.state === 'trial_expired'));
  useEffect(() => {
    if (!shown) return;
    const id = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(id);
  }, [shown, load]);

  if (!status || (!shown && !claimed && !refused)) return null;

  const after = async () => {
    await Promise.all([load(), onChanged()]);
  };
  return (
    <section className="card stack">
      <h2>{t('trial.title')}</h2>
      <ClaimOutcome claimed={claimed} refused={refused} offer={status.offer} />
      <TrialPanel
        state={status.state}
        trial={status.trial}
        offer={status.offer}
        onClaimed={(r) => {
          setClaimed(r);
          setRefused(null);
          void after();
        }}
        onRefused={(e) => {
          setRefused(e);
          void after();
        }}
      />
      {status.setup && status.state === 'trial_available' ? (
        <SetupInstructions
          setup={status.setup}
          missing={status.offer?.missingContacts ?? []}
          timeZone={status.offer?.timeZone ?? status.trial?.timeZone ?? null}
          reload={reload}
        />
      ) : null}
    </section>
  );
}

/**
 * The portal instructions (the owner's brief of 2026-10-18): one WhatsApp message, sent automatically once the Owner's
 * number is verified, naming this portal's address — the Owner reading this has already found it, so it sits behind a
 * disclosure. It says honestly what was sent, by which channel, where (masked by the server) and when, why it went by
 * email when it did, and why nothing carried it when nothing did. It is sent again only from here; the claim never
 * depends on it.
 *
 * Whether a send may go now is the server's answer, with its reason: only the server's limit is counted down, to the
 * instant it named — and when the count ends the trial is read again rather than the button enabled on this browser's
 * clock. Nothing to carry the message is no countdown: the button stays off and says so. A number still to verify
 * hides it, as the card above says what to verify.
 */
function SetupInstructions({
  setup,
  missing,
  timeZone,
  reload,
}: {
  setup: TrialSetup;
  missing: TrialContact[];
  timeZone: string | null;
  /** Reads the trial again — after a send, with the server's answer shown at once. */
  reload: (next?: TrialSetup) => Promise<void>;
}) {
  const { t, lang } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState<{ tone: Tone; text: string } | null>(null);
  // A refusal for sending too soon names its own instant; it holds until the next reading of the trial replaces it.
  const [pushed, setPushed] = useState<string | null>(null);
  useEffect(() => setPushed(null), [setup]);
  const until = pushed ?? (setup.resendBlockedBy === 'throttle' ? setup.resendAvailableAt : null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => setNow(Date.now()), [until]);
  const wait = secondsUntil(until, now);
  const waiting = wait > 0;
  useEffect(() => {
    if (!waiting) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [waiting]);
  // The wait is over: ask the server, once for each instant it named.
  const asked = useRef<string | null>(null);
  useEffect(() => {
    if (until === null || waiting || asked.current === until) return;
    asked.current = until;
    void reload();
  }, [until, waiting, reload]);
  // Instructions still on their way are read again shortly, until the server records what became of them.
  useEffect(() => {
    if (setup.delivery !== 'sending') return;
    const id = setTimeout(() => void reload(), SENDING_REREAD_MS);
    return () => clearTimeout(id);
  }, [setup, reload]);

  const resend = async () => {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const next = await ownerRequest<TrialSetup>('platform/my-subscription/trial/setup/resend', { method: 'POST' });
      // Still on its way when the server answered: the line above says so, and the card reads it again shortly.
      if (next.delivery !== 'sending') setDone(next.delivery === 'sent' ? { tone: 'ok', text: t('trial.setup.resent') } : { tone: 'warn', text: t('trial.setup.failed') });
      await reload(next);
    } catch (e) {
      setError(e);
      const at = detailOf<string>(e, 'resendAvailableAt');
      if (at) setPushed(at);
      // A refusal that changed what the card should say (nothing can carry it, no trial to set up any more): read again.
      if (e instanceof ApiError && (e.status === 409 || e.status === 503)) await reload();
    } finally {
      setBusy(false);
    }
  };

  const awaitingContact = setup.delivery === 'waiting_for_contact' || setup.resendBlockedBy === 'contact_unverified';
  return (
    <details className="disclosure">
      <summary>{t('trial.setup.title')}</summary>
      <div className="stack">
        <DeliveryLine setup={setup} missing={missing} timeZone={timeZone} />
        {done ? <Notice tone={done.tone}>{done.text}</Notice> : null}
        <ResendRefusal error={error} />
        {awaitingContact ? null : (
          <div className="row">
            <button type="button" className="btn" disabled={busy || waiting || pushed !== null || !setup.canResendNow} onClick={() => void resend()}>
              {t('trial.setup.resend')}
            </button>
            {waiting ? (
              <span className="muted small" aria-live="polite">
                {wait < 3600 ? (
                  <Phrase text={t('trial.setup.wait')} values={{ time: formatWait(wait, lang) }} />
                ) : (
                  <Phrase text={t('trial.setup.waitUntil')} values={{ date: formatInstant(until, timeZone, lang) }} />
                )}
              </span>
            ) : setup.resendBlockedBy === 'unavailable' ? (
              <span className="muted small">{t('trial.setup.unavailable')}</span>
            ) : null}
          </div>
        )}
        <DeliveryHistory history={setup.history} timeZone={timeZone} />
      </div>
    </details>
  );
}

const DELIVERY_TONE: Record<TrialSetupAttempt['delivery'], Tone> = { sent: 'ok', sending: 'info', failed: 'danger', not_sent: 'muted' };

/**
 * The requests the server recorded, newest first (its last ten): when, in the business's zone; whether it was the
 * automatic send or one the Owner asked for; and, in colour and words, what became of it and by which channel.
 */
function DeliveryHistory({ history, timeZone }: { history: TrialSetupAttempt[]; timeZone: string | null }) {
  const { t, lang } = useI18n();
  if (history.length === 0) return null;
  return (
    <div className="stack-tight">
      <h4>{t('trial.setup.history')}</h4>
      <ul className="attempts">
        {history.map((a) => (
          <li key={`${a.at}-${a.trigger}`} className="row">
            <bdi>{formatInstant(a.at, timeZone, lang)}</bdi>
            <span className="muted">{t(`trial.setup.history.${a.trigger}`)}</span>
            <Badge tone={DELIVERY_TONE[a.delivery]}>
              {a.channel && a.delivery !== 'not_sent' ? t(`trial.setup.history.${a.delivery}.${a.channel}` as Key) : t(`trial.setup.history.${a.delivery}` as Key)}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** What became of the newest instructions, from what the server recorded — never more than it says. */
function DeliveryLine({ setup, missing, timeZone }: { setup: TrialSetup; missing: TrialContact[]; timeZone: string | null }) {
  const { t, lang } = useI18n();
  const where = <Where channel={setup.channel} destination={setup.destination} />;
  switch (setup.delivery) {
    case 'sending':
      return <p aria-live="polite">{setup.channel ? <Phrase text={t('trial.setup.sending.to')} values={{ where }} /> : t('trial.setup.sending')}</p>;
    case 'sent':
      return (
        <>
          <p>
            <Phrase text={t(setup.channel ? 'trial.setup.sent' : 'trial.setup.sentUnnamed')} values={{ where, date: formatInstant(setup.lastSentAt ?? setup.lastAttemptAt, timeZone, lang) }} />
          </p>
          <FallbackNote reason={setup.fallbackReason} />
        </>
      );
    case 'waiting_for_contact':
      // The automatic send goes once: after it was attempted, no second one is promised.
      if (setup.history.some((a) => a.trigger === 'automatic')) return null;
      return (
        <>
          {missing.includes('phone') ? <p className="muted">{t('trial.setup.waiting.phone')}</p> : null}
          {missing.includes('email') ? <p className="muted">{t('trial.setup.waiting.email')}</p> : null}
        </>
      );
    case 'failed':
      return (
        <Notice tone="warn">
          {t('trial.setup.failed')}
          <FailureNote reason={setup.failureReason} />
        </Notice>
      );
    default:
      // Never asked for — or asked for and not yet sent, while an earlier one did go out: when that one went.
      return setup.lastSentAt ? (
        <Notice tone="warn">
          <Phrase text={t('trial.setup.latestNotSent')} values={{ date: formatInstant(setup.lastSentAt, timeZone, lang) }} />
        </Notice>
      ) : (
        <Notice tone="warn">{t('trial.setup.notSent')}</Notice>
      );
  }
}

/** Why a send again was refused, in words; the wait it names is counted down beside the button. */
function ResendRefusal({ error }: { error: unknown }) {
  const { t } = useI18n();
  if (!error) return null;
  const code = error instanceof ApiError ? error.code : null;
  if (error instanceof ApiError && error.status === 429) return <Notice tone="warn">{t('trial.setup.error.too_many_requests')}</Notice>;
  if (error instanceof ApiError && error.status === 503) return <Notice tone="warn">{t('trial.setup.error.setup_delivery_unavailable')}</Notice>;
  if (code === 'trial_not_available') return <Notice tone="warn">{t('trial.setup.error.trial_not_available')}</Notice>;
  if (code === 'contact_unverified') return <VerifyContacts missing={detailOf<TrialContact[]>(error, 'missingContacts') ?? []} />;
  if (code === 'owner_only') return <Notice tone="danger">{t('trial.error.owner_only')}</Notice>;
  return <ErrorNotice error={error} />;
}
