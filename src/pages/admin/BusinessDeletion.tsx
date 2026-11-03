import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { adminRequest } from '../../auth/admin';
import { ErrorNotice, Field, Notice } from '../../components/ui';
import { useI18n, type Key } from '../../i18n';
import { formatDateTime } from '../../lib/format';

/**
 * A business's staged deletion (post-Build-4; `business-deletion.service.ts` on the server, which decides everything
 * shown here). First "Prepare for deletion": the subscription cancelled, the business deactivated, every session ended,
 * no refund. Then "Delete business", only once the server finds nothing in the way, with the open step-up window and
 * the business's name typed back exactly. What is kept — de-identified, marked as a deleted business — is said as such.
 */

type Blocker = 'already_deleted' | 'not_prepared' | 'still_active' | 'subscription_usable' | 'payment_pending' | 'seat_payment_pending' | 'owner_deletion_in_progress';

interface DeletionView {
  businessId: string;
  confirmName: string | null;
  stage: 'none' | 'prepared' | 'completed';
  preparedAt: string | null;
  preparedBy: string | null;
  completedAt: string | null;
  completedBy: string | null;
  retentionPolicy: string | null;
  prepareBlockers: Blocker[];
  deleteBlockers: Blocker[];
}

const BLOCKER: Record<Blocker, Key> = {
  already_deleted: 'admin.deletion.blocker.already_deleted',
  not_prepared: 'admin.deletion.blocker.not_prepared',
  still_active: 'admin.deletion.blocker.still_active',
  subscription_usable: 'admin.deletion.blocker.subscription_usable',
  payment_pending: 'admin.deletion.blocker.payment_pending',
  seat_payment_pending: 'admin.deletion.blocker.seat_payment_pending',
  owner_deletion_in_progress: 'admin.deletion.blocker.owner_deletion_in_progress',
};

export function BusinessDeletion({ businessId, ask, onDone }: { businessId: string; ask: () => Promise<boolean>; onDone: () => Promise<void> }) {
  const { t, lang } = useI18n();
  const [view, setView] = useState<DeletionView | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [typed, setTyped] = useState('');

  const load = useCallback(async () => {
    try {
      setView(await adminRequest<DeletionView>(`platform/businesses/${businessId}/deletion`));
    } catch (e) {
      setError(e);
    }
  }, [businessId]);
  useEffect(() => {
    void load();
  }, [load]);
  if (!view) return error ? <ErrorNotice error={error} /> : null;

  const run = async (path: string, body: Record<string, unknown>) => {
    setError(null);
    if (!(await ask())) return;
    setBusy(true);
    try {
      setView(await adminRequest<DeletionView>(`platform/businesses/${businessId}/${path}`, { method: 'POST', body }));
      setTyped('');
      setUnderstood(false);
      await onDone();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  const blockers = (list: Blocker[]) =>
    list.length > 0 ? (
      <ul className="small" data-testid="deletion-blockers">
        {list.map((b) => (
          <li key={b}>{t(BLOCKER[b])}</li>
        ))}
      </ul>
    ) : null;

  if (view.stage === 'completed') {
    return (
      <section className="card stack" aria-labelledby="deletion-title">
        <h2 id="deletion-title">{t('admin.deletion.title')}</h2>
        <Notice tone="muted" title={t('admin.deletion.completed')}>
          {t('admin.deletion.completedBy', { at: formatDateTime(view.completedAt!, lang), who: view.completedBy ?? '' })}
          <br />
          {t('admin.deletion.retained', { policy: view.retentionPolicy ?? '' })}
        </Notice>
      </section>
    );
  }

  const prepare = (e: FormEvent) => {
    e.preventDefault();
    if (understood && view.prepareBlockers.length === 0) void run('deletion/prepare', {});
  };
  const remove = (e: FormEvent) => {
    e.preventDefault();
    if (view.confirmName && typed === view.confirmName && view.deleteBlockers.length === 0) void run('deletion', { confirmName: typed });
  };

  return (
    <section className="card stack" aria-labelledby="deletion-title">
      <h2 id="deletion-title">{t('admin.deletion.title')}</h2>
      <ErrorNotice error={error} />
      {view.stage === 'none' ? (
        <form className="stack" onSubmit={prepare}>
          <p>{t('admin.deletion.prepare.lead')}</p>
          <ul className="small">
            <li>{t('admin.deletion.prepare.cancel')}</li>
            <li>{t('admin.deletion.prepare.deactivate')}</li>
            <li>{t('admin.deletion.prepare.sessions')}</li>
            <li>{t('admin.deletion.prepare.noRefund')}</li>
          </ul>
          {blockers(view.prepareBlockers)}
          <label className="row">
            <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} disabled={view.prepareBlockers.length > 0} />
            <span>{t('admin.deletion.prepare.understood')}</span>
          </label>
          <div>
            <button type="submit" className="btn btn-danger" disabled={busy || !understood || view.prepareBlockers.length > 0}>
              {t('admin.deletion.prepare.action')}
            </button>
          </div>
        </form>
      ) : (
        <form className="stack" onSubmit={remove}>
          <Notice tone="warn" title={t('admin.deletion.prepared')}>
            {t('admin.deletion.preparedBy', { at: formatDateTime(view.preparedAt!, lang), who: view.preparedBy ?? '' })}
          </Notice>
          <p>{t('admin.deletion.delete.lead')}</p>
          <p className="small muted">{t('admin.deletion.delete.kept')}</p>
          {blockers(view.deleteBlockers)}
          <Field label={t('admin.deletion.delete.typeName', { name: view.confirmName ?? '' })}>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" spellCheck={false} disabled={view.deleteBlockers.length > 0} />
          </Field>
          <div>
            <button type="submit" className="btn btn-danger" disabled={busy || view.deleteBlockers.length > 0 || !view.confirmName || typed !== view.confirmName}>
              {t('admin.deletion.delete.action')}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

/** The account-ready message again, with a new single-use link, for an Owner whose link was delayed, expired or lost. */
export function AccountReadyResend({ businessId, ask }: { businessId: string; ask: () => Promise<boolean> }) {
  const { t } = useI18n();
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const resend = async () => {
    setError(null);
    if (!(await ask())) return;
    setBusy(true);
    try {
      await adminRequest(`platform/businesses/${businessId}/account-ready/resend`, { method: 'POST', body: {} });
      setDone(true);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="stack">
      <ErrorNotice error={error} />
      {done ? <Notice tone="ok">{t('admin.accountReady.resent')}</Notice> : null}
      <div>
        <button type="button" className="btn btn-sm" disabled={busy} onClick={() => void resend()}>
          {t('admin.accountReady.resend')}
        </button>
      </div>
    </div>
  );
}
