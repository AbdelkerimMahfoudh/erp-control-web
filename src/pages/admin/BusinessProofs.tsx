import { useState } from 'react';
import type { PaymentProof } from '../../api/types';
import { ProofViewer, proofFileHref } from '../../components/ProofViewer';
import { ProofLines } from '../../components/stores';
import { Badge, Empty, Money, Notice } from '../../components/ui';
import { useI18n, type Key } from '../../i18n';
import { formatDate, localNumber } from '../../lib/format';

/**
 * One business's payment proofs in its payment history (owner, 2026-11-12): every decision — waiting, approved,
 * refused — each viewable on the page without downloading it, read-only, its latest revision first. A proof is fetched
 * only when it is opened (an image is not loaded for every row), and Download stays its own action. Deciding happens on
 * the review page; nothing here approves or refuses.
 */
export function BusinessProofs({ proofs }: { proofs: PaymentProof[] | null }) {
  const { t } = useI18n();
  if (!proofs) return null;
  return (
    <section className="card stack" aria-labelledby="business-proofs-h">
      <h2 id="business-proofs-h">{t('admin.proofs.history')}</h2>
      {proofs.length === 0 ? <Empty text={t('admin.proofs.none')} /> : <ul className="proof-list">{proofs.map((p) => <ProofItem key={p.id} proof={p} />)}</ul>}
    </section>
  );
}

const TONE: Record<string, 'ok' | 'warn' | 'danger' | 'info'> = { approved: 'ok', refused: 'danger', submitted: 'info', under_review: 'info' };

function ProofItem({ proof }: { proof: PaymentProof }) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const path = `platform/payment-proofs/${proof.id}/file`;
  const revision = proof.revision ?? 1;
  return (
    <li className="proof-item stack-tight">
      <div className="row spread">
        <span className="row">
          <Badge tone={TONE[proof.status] ?? 'info'}>{t(`portal.proof.status.${proof.status}` as Key)}</Badge>
          <strong>
            <Money amount={proof.amount} />
          </strong>
          <span className="muted small">{formatDate(proof.paidAt, lang)}</span>
          {revision > 1 ? <span className="muted small">{t('admin.proofs.version', { revision: String(revision) })}</span> : null}
        </span>
        {proof.fileAvailable ? (
          <button type="button" className="btn btn-sm" aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? t('admin.proofs.hide') : t('admin.proofs.view')}
          </button>
        ) : null}
      </div>
      {proof.payerPhone ? (
        <p className="small">
          {t('admin.proofs.payer')}: <span className="ltr" dir="ltr">{localNumber(proof.payerPhone)}</span>
        </p>
      ) : null}
      {proof.status === 'refused' && proof.refusalReason ? <p className="small">{t('admin.proofs.refusedBecause', { reason: proof.refusalReason })}</p> : null}
      <ProofLines lines={proof.lines} />
      {!proof.fileAvailable ? <Notice tone="warn">{t('admin.proofs.purged')}</Notice> : null}
      {open && proof.fileAvailable ? <ProofViewer path={path} revision={revision} fileName={proof.fileName ?? 'payment-proof'} downloadHref={proofFileHref(path)} /> : null}
    </li>
  );
}
