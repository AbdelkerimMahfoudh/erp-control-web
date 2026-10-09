import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { PlanVersion } from '../../api/types';
import { adminRequest } from '../../auth/admin';
import { Badge, ErrorNotice, Field, Loading, Money, Notice } from '../../components/ui';
import { useI18n } from '../../i18n';
import { formatDate, formatInt } from '../../lib/format';
import { useStepUp } from './useStepUp';

/**
 * The price list's versions, and scheduling the next one. A version prices
 * every activity (D154): the electronics store (`branchMonthly`), the money
 * services agent and a branch doing both — all three required, as the server
 * requires them. A version from an API older than the activity shows only what
 * it carries.
 */
export function Plans() {
  const { t, lang } = useI18n();
  const [rows, setRows] = useState<PlanVersion[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [form, setForm] = useState({ branchMonthly: '', agentMonthly: '', bothMonthly: '', includedStaffPerBranch: '1', extraStaffMonthly: '', effectiveFrom: '', reason: '' });
  const [done, setDone] = useState(false);
  const { ask, dialog } = useStepUp();

  const load = useCallback(async () => {
    try {
      setRows(await adminRequest<PlanVersion[]>('platform/plans'));
    } catch (e) {
      setError(e);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const confirmPassword = await ask();
    if (!confirmPassword) return;
    setError(null);
    try {
      await adminRequest('platform/plans', {
        method: 'POST',
        body: {
          branchMonthly: Number(form.branchMonthly),
          agentMonthly: Number(form.agentMonthly),
          bothMonthly: Number(form.bothMonthly),
          includedStaffPerBranch: Number(form.includedStaffPerBranch),
          extraStaffMonthly: Number(form.extraStaffMonthly),
          effectiveFrom: new Date(form.effectiveFrom).toISOString(),
          reason: form.reason.trim(),
          confirmPassword,
        },
      });
      setDone(true);
      await load();
    } catch (err) {
      setError(err);
    }
  };

  return (
    <div className="stack">
      {dialog}
      <h1>{t('admin.plans.title')}</h1>
      <ErrorNotice error={error} />
      {rows === null ? (
        <Loading />
      ) : (
        <div className="grid">
          {rows.map((p) => (
            <div className="card stack" key={p.version}>
              <div className="row spread">
                <strong>{t('admin.plans.version', { n: formatInt(p.version, lang) })}</strong>
                <Badge tone={p.state === 'in_force' ? 'ok' : 'info'}>{p.state === 'in_force' ? t('admin.plans.inForce') : t('admin.plans.scheduled')}</Badge>
              </div>
              <div>
                <Money amount={p.branchMonthly} /> {t('activity.electronics')}
              </div>
              {typeof p.agentMonthly === 'number' ? (
                <div>
                  <Money amount={p.agentMonthly} /> {t('activity.money_agent')}
                </div>
              ) : null}
              {typeof p.bothMonthly === 'number' ? (
                <div>
                  <Money amount={p.bothMonthly} /> {t('activity.both')}
                </div>
              ) : null}
              <div className="muted small">{t('home.pricing.perStore')}</div>
              <div>{t('home.pricing.included', { count: formatInt(p.includedStaffPerBranch, lang) })}</div>
              <div>
                <Money amount={p.extraStaffMonthly} /> {t('home.pricing.extra')}
              </div>
              <div className="muted small">{t('admin.plans.from', { date: formatDate(p.effectiveFrom, lang) })}</div>
              {p.reason ? <div className="muted small">{p.reason}</div> : null}
            </div>
          ))}
        </div>
      )}
      <form className="card stack" onSubmit={submit}>
        <h2>{t('admin.plans.new')}</h2>
        <div className="grid">
          <Field label={t('admin.plans.branchMonthly')}>
            <input required inputMode="numeric" value={form.branchMonthly} onChange={(e) => setForm({ ...form, branchMonthly: e.target.value })} dir="ltr" />
          </Field>
          <Field label={t('admin.plans.agentMonthly')}>
            <input required inputMode="numeric" value={form.agentMonthly} onChange={(e) => setForm({ ...form, agentMonthly: e.target.value })} dir="ltr" />
          </Field>
          <Field label={t('admin.plans.bothMonthly')}>
            <input required inputMode="numeric" value={form.bothMonthly} onChange={(e) => setForm({ ...form, bothMonthly: e.target.value })} dir="ltr" />
          </Field>
          <Field label={t('admin.plans.included')}>
            <input required inputMode="numeric" value={form.includedStaffPerBranch} onChange={(e) => setForm({ ...form, includedStaffPerBranch: e.target.value })} dir="ltr" />
          </Field>
          <Field label={t('admin.plans.extra')}>
            <input required inputMode="numeric" value={form.extraStaffMonthly} onChange={(e) => setForm({ ...form, extraStaffMonthly: e.target.value })} dir="ltr" />
          </Field>
          <Field label={t('admin.plans.effectiveFrom')}>
            <input required type="datetime-local" value={form.effectiveFrom} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })} />
          </Field>
        </div>
        <Field label={t('admin.action.reason')} hint={t('admin.action.reason.required')}>
          <input required maxLength={500} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        </Field>
        {done ? <Notice tone="ok">{t('admin.action.applied')}</Notice> : null}
        <button type="submit" className="btn btn-primary">
          {t('admin.plans.new')}
        </button>
      </form>
    </div>
  );
}
