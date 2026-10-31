import { useState, type FormEvent } from 'react';
import type { BusinessDetail } from '../../api/types';
import { adminRequest } from '../../auth/admin';
import { Badge, ErrorNotice, Field, Notice } from '../../components/ui';
import { useI18n, type Key } from '../../i18n';
import { arabicNameProblem, latinNameProblem, nameProblemKey, normalizeName } from '../../lib/names';

type Ask = () => Promise<string | null>;
type Target = { kind: 'business' | 'store' | 'person'; id: string; name: string; nameAr: string | null };

/**
 * A business's, its stores' and its people's two names (D225): the Latin-alphabet name read in French and English, and
 * the Arabic name read in Arabic. Records created before the Arabic names existed are marked; completing one changes
 * what screens show from now on — receipts already issued keep the names they were issued under. Each change asks
 * why and for the administrator's password, and is in the platform audit.
 */
export function BusinessNames({ business, ask, onDone }: { business: BusinessDetail; ask: Ask; onDone: () => Promise<void> }) {
  const { t } = useI18n();
  const targets: Target[] = [
    { kind: 'business', id: business.id, name: business.name, nameAr: business.nameAr ?? null },
    ...business.branches.map((b) => ({ kind: 'store' as const, id: b.id, name: b.name, nameAr: b.nameAr ?? null })),
    ...business.people.map((p) => ({ kind: 'person' as const, id: p.id, name: p.name, nameAr: p.nameAr ?? null })),
  ];
  const missing = targets.filter((x) => !x.nameAr).length;
  return (
    <section className="card stack" aria-labelledby="names-title">
      <h2 id="names-title">{t('admin.names.title')}</h2>
      <p className="muted small">{t('admin.names.lead')}</p>
      {missing > 0 ? <Notice tone="warn">{t('admin.names.missing', { count: String(missing) })}</Notice> : null}
      {targets.map((target) => (
        <NameRow key={`${target.kind}:${target.id}`} business={business} target={target} ask={ask} onDone={onDone} />
      ))}
    </section>
  );
}

function NameRow({ business, target, ask, onDone }: { business: BusinessDetail; target: Target; ask: Ask; onDone: () => Promise<void> }) {
  const { t } = useI18n();
  const [name, setName] = useState(target.name);
  const [nameAr, setNameAr] = useState(target.nameAr ?? '');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);
  const [problems, setProblems] = useState<{ name?: Key; nameAr?: Key; reason?: Key }>({});
  const path =
    target.kind === 'business'
      ? `platform/businesses/${business.id}/names`
      : target.kind === 'store'
        ? `platform/businesses/${business.id}/stores/${target.id}/names`
        : `platform/businesses/${business.id}/accounts/${target.id}/names`;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    // The API's own rules, said beside the field in the operator's language. An empty Arabic name changes nothing.
    const latin = latinNameProblem(name);
    const arabic = normalizeName(nameAr) ? arabicNameProblem(nameAr) : null;
    const next = {
      name: latin ? nameProblemKey(latin) : undefined,
      nameAr: arabic ? nameProblemKey(arabic) : undefined,
      reason: reason.trim() ? undefined : ('form.required' as Key),
    };
    setProblems(next);
    if (next.name || next.nameAr || next.reason) return;
    // Each name on its own: only what changed is sent, and the server never touches the other.
    const body: Record<string, string> = { reason: reason.trim() };
    if (name.trim() !== target.name) body.name = name.trim();
    if (nameAr.trim() && nameAr.trim() !== (target.nameAr ?? '')) body.nameAr = nameAr.trim();
    if (!body.name && !body.nameAr) return;
    const confirmPassword = await ask();
    if (!confirmPassword) return;
    setBusy(true);
    try {
      await adminRequest(path, { method: 'PATCH', body: { ...body, confirmPassword } });
      setSaved(true);
      setReason('');
      await onDone();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="stack" onSubmit={submit} noValidate>
      <p className="small">
        <strong>{t(`admin.names.kind.${target.kind}`)}</strong> {!target.nameAr ? <Badge tone="warn">{t('admin.names.incomplete')}</Badge> : null}
      </p>
      <div className="grid">
        <Field label={t('admin.names.latin')} error={problems.name ? t(problems.name) : null}>
          <input required maxLength={160} dir="ltr" value={name} aria-invalid={problems.name ? true : undefined} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label={t('admin.names.arabic')} error={problems.nameAr ? t(problems.nameAr) : null}>
          <input maxLength={160} dir="rtl" lang="ar" value={nameAr} aria-invalid={problems.nameAr ? true : undefined} onChange={(e) => setNameAr(e.target.value)} />
        </Field>
        <Field label={t('admin.action.reason')} error={problems.reason ? t(problems.reason) : null}>
          <input required maxLength={500} value={reason} aria-invalid={problems.reason ? true : undefined} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </div>
      {saved ? <Notice tone="ok">{t('admin.names.saved')}</Notice> : null}
      <ErrorNotice error={error} />
      <div>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {t('admin.names.save')}
        </button>
      </div>
    </form>
  );
}
