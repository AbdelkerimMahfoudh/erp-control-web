import type { FailureReason, FallbackReason, TrialChannel } from '../api/types';
import { useI18n } from '../i18n';
import { Phrase } from './ui';

/*
 * The subscription messages as the server records them (0099; docs/101 §6): WhatsApp first, email only for a recorded
 * reason, and — when nothing carried a message — why. Shared by the trial card's portal instructions and the status
 * panel's timeline. Every destination is masked by the server; the page never sees one whole.
 */

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
