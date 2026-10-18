import type { FailureReason, FallbackReason, NoticeKind, NoticeState, TrialChannel } from '../api/types';
import { useI18n, type Language } from '../i18n';
import { formatInt } from '../lib/format';
import { Badge, Phrase, type Tone } from './ui';

/*
 * The subscription messages as the server records them (0099; docs/101 §6): WhatsApp first, email only for a recorded
 * reason, and — when nothing carried a message — why. Shared by the portal (the trial card's instructions, the status
 * panel's timeline) and the console. Every destination is masked by the server; the page never sees one whole.
 */

const NOTICE_HOURS: Record<string, number> = { h72: 72, h48: 48, h24: 24 };

const isReminder = (kind: NoticeKind): kind is 'trial_reminder' | 'paid_reminder' | 'grace_reminder' =>
  kind === 'trial_reminder' || kind === 'paid_reminder' || kind === 'grace_reminder';

/** A message in words: its kind, and the hours of a reminder. */
export function noticeName(kind: NoticeKind, threshold: string, t: ReturnType<typeof useI18n>['t'], lang: Language, variant?: string | null): string {
  const hours = NOTICE_HOURS[threshold];
  if (hours !== undefined && isReminder(kind)) return t(`notice.kind.${kind}.hours`, { hours: formatInt(hours, lang) });
  // A paid end's message says which it was, when the row says so: grace started, or none left.
  if (kind === 'paid_expired' && (variant === 'grace_started' || variant === 'no_grace')) return t(`notice.kind.paid_expired.${variant}`);
  return t(`notice.kind.${kind}`);
}

const NOTICE_STATE_TONE: Record<NoticeState, Tone> = {
  pending: 'info',
  sending: 'info',
  accepted: 'ok',
  delivered: 'ok',
  failed: 'danger',
  cancelled: 'muted',
  superseded: 'muted',
};

/** What became of a message, in colour and words. */
export function NoticeStateBadge({ state }: { state: NoticeState }) {
  const { t } = useI18n();
  return <Badge tone={NOTICE_STATE_TONE[state]}>{t(`notice.state.${state}`)}</Badge>;
}

/** The channel and its masked destination, in one phrase: "by WhatsApp to +222••••1234" — the contact kept left to right. */
export function Where({ channel, destination }: { channel: TrialChannel | null; destination: string | null }) {
  const { t } = useI18n();
  if (!channel) return null;
  return destination ? (
    <Phrase text={t(`notice.where.${channel}`)} values={{ destination: <span className="ltr">{destination}</span> }} />
  ) : (
    <>{t(`notice.by.${channel}`)}</>
  );
}

/** Why a message went by email: WhatsApp could not carry it. */
export function FallbackNote({ reason }: { reason: FallbackReason | null }) {
  const { t } = useI18n();
  return reason ? <p className="muted small">{t(`notice.fallback.${reason}`)}</p> : null;
}

/** Why nothing carried a message. */
export function FailureNote({ reason }: { reason: FailureReason | null }) {
  const { t } = useI18n();
  return reason ? <p className="small">{t(`notice.failure.${reason}`)}</p> : null;
}
