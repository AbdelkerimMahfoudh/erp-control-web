import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ApiError } from '../../api/client';
import type { TrialChannel, TrialClaimResult, TrialContact, TrialSetup, TrialSetupAttempt, TrialSetupOutcome, TrialStatus } from '../../api/types';
import { ownerRequest } from '../../auth/owner';
import { ClaimOutcome, TrialPanel, VerifyContacts } from '../../components/trial';
import { Badge, ErrorNotice, Notice, Phrase, type Tone } from '../../components/ui';
import { useI18n, type Key, type Language } from '../../i18n';
import { formatInstant, formatWait, listParts } from '../../lib/format';
import { detailOf, secondsUntil } from '../../lib/trial';

/** How often a shown card is read again: the end a claim would set moves with the clock, and the page shows the server's. */
const REFRESH_MS = 60_000;

/** How soon instructions still being sent are read again: their outcome is recorded once the providers answer (C1). */
const SENDING_REREAD_MS = 5_000;

/**
 * The Owner's free-trial card on the account page (2026-10-13), from GET platform/my-subscription/trial. That route
 * answers the Owner only: any other role is refused (403) and sees no card at all, without an error — as does an API
 * older than the trial (404). The card shows what the server says: the offer with its terms and the one button, why it
 * cannot be claimed yet, the running trial or the ended one; while the trial is still to be claimed, the setup
 * instructions too. It is read again with the account, and every minute while it is shown.
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
        token={null}
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
          canClaim={status.offer?.available === true}
          timeZone={status.offer?.timeZone ?? status.trial?.timeZone ?? null}
          reload={reload}
        />
      ) : null}
    </section>
  );
}

/**
 * The setup instructions (2026-10-13): sent automatically, once, when the Owner's required contacts are all verified,
 * to every verified contact a message service can reach now. They are sent again only from here, by the Owner signed
 * in on this website — the app has no way to ask. The card says what was sent, where (masked by the server) and when,
 * or honestly that nothing was or could be; the claim never depends on them.
 *
 * Whether a send may go now is the server's answer, with its reason (C4): only the server's limit is counted down, to
 * the instant it named — and when the count ends the trial is read again rather than the button enabled on this
 * browser's clock. Nothing to carry the message is no countdown: the button stays off and says so. A contact still to
 * verify hides it, as the card above says what to verify.
 */
function SetupInstructions({
  setup,
  missing,
  canClaim,
  timeZone,
  reload,
}: {
  setup: TrialSetup;
  missing: TrialContact[];
  canClaim: boolean;
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
      const next = await ownerRequest<TrialSetup>('platform/my-subscription/trial/setup/resend', { method: 'POST', body: {} });
      // Still on its way when the server answered: the line above says so, and the card reads it again shortly.
      if (next.delivery !== 'sending') setDone(next.delivery === 'sent' ? { tone: 'ok', text: t('trial.setup.resent') } : { tone: 'warn', text: t('trial.setup.failed') });
      await reload(next);
    } catch (e) {
      setError(e);
      const at = detailOf<string>(e, 'resendAvailableAt');
      if (at) setPushed(at);
      // A refusal that changed what the card should say (nothing operational, no trial to set up any more): read again.
      if (e instanceof ApiError && (e.status === 409 || e.status === 503)) await reload();
    } finally {
      setBusy(false);
    }
  };

  const awaitingContact = setup.delivery === 'waiting_for_contact' || setup.resendBlockedBy === 'contact_unverified';
  return (
    <div className="stack">
      <h3>{t('trial.setup.title')}</h3>
      <DeliveryLine setup={setup} missing={missing} timeZone={timeZone} lang={lang} />
      {canClaim && !awaitingContact ? <p className="muted small">{t('trial.setup.optional')}</p> : null}
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
          ) : setup.resendBlockedBy === 'unavailable' && setup.delivery !== 'unavailable' ? (
            <span className="muted small">{t('trial.setup.unavailable')}</span>
          ) : null}
        </div>
      )}
      <DeliveryHistory history={setup.history} timeZone={timeZone} />
    </div>
  );
}

const CHANNELS: TrialChannel[] = ['email', 'whatsapp'];
const OUTCOME_TONE: Record<Exclude<TrialSetupOutcome, 'not_applicable'>, Tone> = { accepted: 'ok', failed: 'danger', unavailable: 'warn' };

/**
 * The attempts the server recorded, newest first (its last ten): when, in the business's zone; whether it was the
 * automatic send or one the Owner asked for; and, in colour and words, what each channel did — a channel that was no
 * verified contact of the Owner was not tried and is not listed. A record only: the claim never depends on it.
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
            {CHANNELS.map((channel) => {
              const outcome = a[channel];
              return outcome === 'not_applicable' ? null : (
                <Badge key={channel} tone={OUTCOME_TONE[outcome]}>
                  {t(`trial.setup.history.${channel}.${outcome}` as Key)}
                </Badge>
              );
            })}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** What became of the instructions, from the last attempt the server recorded — never more than it says. */
function DeliveryLine({ setup, missing, timeZone, lang }: { setup: TrialSetup; missing: TrialContact[]; timeZone: string | null; lang: Language }) {
  const { t } = useI18n();
  switch (setup.delivery) {
    case 'sending': {
      // One verified contact is the only one a message on its way can be going to; of several, the server will say.
      const only = setup.destinations.length === 1 ? setup.destinations[0]! : null;
      return (
        <p aria-live="polite">
          {only ? <Phrase text={t('trial.setup.sending.one')} values={{ destination: <span className="ltr">{only.masked}</span> }} /> : t('trial.setup.sending')}
        </p>
      );
    }
    case 'sent': {
      const to = setup.destinations.filter((d) => setup.sentTo.includes(d.channel)).map((d) => d.masked);
      return (
        <p>
          <Phrase text={t('trial.setup.sent')} values={{ destinations: <Destinations items={to} lang={lang} />, date: formatInstant(setup.lastAttemptAt, timeZone, lang) }} />
        </p>
      );
    }
    case 'waiting_for_contact':
      return (
        <>
          {missing.includes('phone') ? <p className="muted">{t('trial.setup.waiting.phone')}</p> : null}
          {missing.includes('email') ? <p className="muted">{t('trial.setup.waiting.email')}</p> : null}
        </>
      );
    case 'failed':
      return <Notice tone="warn">{t('trial.setup.failed')}</Notice>;
    case 'unavailable':
      return <Notice tone="warn">{t('trial.setup.unavailable')}</Notice>;
    default:
      return <Notice tone="warn">{t('trial.setup.notSent')}</Notice>;
  }
}

/** The masked contacts, joined the way the language joins a list, each kept left to right inside an Arabic sentence. */
function Destinations({ items, lang }: { items: string[]; lang: Language }) {
  const parts: ReactNode[] = listParts(items, lang).map((p, i) =>
    p.type === 'element' ? (
      <span key={i} className="ltr">
        {p.value}
      </span>
    ) : (
      p.value
    ),
  );
  return <>{parts}</>;
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
