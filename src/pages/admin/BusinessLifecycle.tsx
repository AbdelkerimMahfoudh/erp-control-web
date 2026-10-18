import { useEffect, useState } from 'react';
import type { BusinessNotices, GraceView } from '../../api/types';
import { adminRequest } from '../../auth/admin';
import { NoticeStateBadge, Where, noticeName } from '../../components/notices';
import { Badge, Empty, Phrase, Table, type Tone } from '../../components/ui';
import { useI18n } from '../../i18n';
import { formatInstant, formatInt } from '../../lib/format';
import { NoticeReason } from './Messages';

const GRACE_TONE: Record<GraceView['status'], Tone> = { none: 'muted', active: 'warn', ended: 'muted', unavailable: 'warn' };

/**
 * The business's grace as the server decided it (the entitlement's `grace`, 0099): the current period end's decision,
 * its end and the hours left, the allowance of three in any 12 months — how many are used and when the next returns —
 * and whether the next period end would open one. Each date in the business's zone. Nothing to decide here: a grace
 * is the rules', recorded once.
 */
export function BusinessGrace({ grace, timeZone }: { grace?: GraceView; timeZone?: string }) {
  const { t, lang } = useI18n();
  if (!grace) return null;
  const at = (iso: string | null) => formatInstant(iso, timeZone, lang);
  return (
    <section className="card stack">
      <h2>{t('admin.business.grace.title')}</h2>
      <p className="row">
        <Badge tone={GRACE_TONE[grace.status]}>{t(`admin.business.grace.status.${grace.status}`)}</Badge>
        {grace.status === 'active' || grace.status === 'ended' ? (
          <span>
            <Phrase text={t('admin.business.grace.ends')} values={{ date: at(grace.endsAt) }} />
          </span>
        ) : null}
        {grace.status === 'active' ? <span className="muted">{t('admin.business.grace.left', { hours: formatInt(grace.hoursRemaining, lang) })}</span> : null}
      </p>
      {grace.usesInWindow !== null ? (
        <p>
          {t('admin.business.grace.uses', { used: formatInt(grace.usesInWindow, lang), allowance: formatInt(grace.allowance, lang), months: formatInt(grace.windowMonths, lang) })}{' '}
          {grace.nextUseRestoredAt ? <Phrase text={t('admin.business.grace.restored')} values={{ date: at(grace.nextUseRestoredAt) }} /> : null}
        </p>
      ) : null}
      {grace.availableAtPeriodEnd !== null ? (
        <p className="muted small">{t(grace.availableAtPeriodEnd ? 'admin.business.grace.ahead.yes' : 'admin.business.grace.ahead.no', { hours: formatInt(grace.durationHours, lang) })}</p>
      ) : null}
    </section>
  );
}

/**
 * The business's subscription messages (GET platform/businesses/:id/notices, 0099): the next one due as things stand,
 * then the latest — which message, by which channel to which masked destination, what became of it and why — each
 * dated in the business's zone. An API without it shows nothing here.
 */
export function BusinessMessages({ businessId, timeZone, version }: { businessId: string; timeZone?: string; version: unknown }) {
  const { t, lang } = useI18n();
  const [data, setData] = useState<BusinessNotices | null>(null);
  useEffect(() => {
    let live = true;
    adminRequest<BusinessNotices>(`platform/businesses/${businessId}/notices`)
      .then((d) => {
        if (live) setData(d);
      })
      .catch(() => {
        if (live) setData(null);
      });
    return () => {
      live = false;
    };
  }, [businessId, version]);
  if (!data) return null;
  const at = (iso: string | null) => formatInstant(iso, timeZone, lang);
  const next = data.timeline.next;
  return (
    <section className="card stack">
      <h2>{t('admin.business.messages.title')}</h2>
      {next ? (
        <p>
          <Phrase text={t('admin.business.messages.next')} values={{ name: noticeName(next.kind, next.threshold, t, lang), date: at(next.dueAt) }} />
        </p>
      ) : null}
      {data.messages.length === 0 ? (
        <Empty text={t('admin.business.messages.none')} />
      ) : (
        <Table
          columns={[
            { label: t('admin.audit.when'), render: (r) => <bdi>{at(r.acceptedAt ?? r.createdAt)}</bdi> },
            {
              label: t('admin.messages.message'),
              render: (r) => (
                <span className="stack-tight">
                  <span>{noticeName(r.kind, r.threshold, t, lang, r.variant)}</span>
                  {r.resend ? <span className="muted small">{t('admin.messages.resend')}</span> : null}
                </span>
              ),
            },
            { label: t('admin.messages.channel'), render: (r) => (r.channel ? <Where channel={r.channel} destination={r.destination} /> : '—') },
            { label: t('admin.messages.state'), render: (r) => <NoticeStateBadge state={r.state} /> },
            { label: t('admin.messages.reason'), render: (r) => <NoticeReason row={r} /> },
          ]}
          rows={data.messages}
          keyOf={(r) => r.id}
        />
      )}
    </section>
  );
}
