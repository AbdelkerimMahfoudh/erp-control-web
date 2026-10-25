import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { PromoterDetail, PromoterList } from '../../api/types';
import { adminRequest } from '../../auth/admin';
import { Badge, Empty, ErrorNotice, Field, Loading, Table } from '../../components/ui';
import { useI18n } from '../../i18n';
import { formatDate, formatInt } from '../../lib/format';
import { useStepUp } from './useStepUp';

const EMPTY = { displayName: '', whatsappNumber: '', note: '' };

/**
 * The platform's promoters (0103, D221): who they are, their code, whether it opens, and how many businesses finished
 * registering through them. The number is masked here; the full number and the private note are on a promoter's own
 * page. Creating one asks for the password and a code like every console decision — and gives them no code yet:
 * that is the explicit "Generate code and QR" on their page.
 */
export function Promoters() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const { ask, dialog } = useStepUp();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<PromoterList | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [createError, setCreateError] = useState<unknown>(null);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page) });
    if (q.trim()) params.set('q', q.trim());
    let live = true;
    adminRequest<PromoterList>(`platform/promoters?${params.toString()}`)
      .then((d) => {
        if (!live) return;
        setData(d);
        setError(null);
      })
      .catch((e) => live && setError(e));
    return () => {
      live = false;
    };
  }, [q, page]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    const confirmPassword = await ask();
    if (!confirmPassword) return;
    setBusy(true);
    try {
      const created = await adminRequest<PromoterDetail>('platform/promoters', {
        method: 'POST',
        body: { displayName: form.displayName.trim(), whatsappNumber: form.whatsappNumber.trim(), note: form.note.trim() || undefined, confirmPassword },
      });
      setForm(EMPTY);
      navigate(`/admin/promoters/${created.id}`);
    } catch (err) {
      setCreateError(err);
    } finally {
      setBusy(false);
    }
  };

  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="stack">
      {dialog}
      <div className="row spread">
        <h1>{t('admin.promoters.title')}</h1>
        {creating ? null : (
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
            {t('admin.promoters.new')}
          </button>
        )}
      </div>
      <p className="lead">{t('admin.promoters.lead')}</p>

      {creating ? (
        <form className="card stack" onSubmit={create} aria-labelledby="new-promoter">
          <h2 id="new-promoter">{t('admin.promoters.new')}</h2>
          <div className="grid">
            <Field label={t('admin.promoters.name')} hint={t('admin.promoters.name.hint')}>
              <input required maxLength={80} value={form.displayName} onChange={set('displayName')} />
            </Field>
            <Field label={t('admin.promoters.number')} hint={t('admin.promoters.number.hint')}>
              <input required inputMode="tel" autoComplete="off" maxLength={24} dir="ltr" value={form.whatsappNumber} onChange={set('whatsappNumber')} />
            </Field>
          </div>
          <Field label={t('admin.promoters.note')} hint={t('admin.promoters.note.hint')}>
            <textarea maxLength={500} rows={2} value={form.note} onChange={set('note')} />
          </Field>
          <ErrorNotice error={createError} />
          <div className="row">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {t('admin.promoters.create')}
            </button>
            <button type="button" className="btn" onClick={() => (setCreating(false), setForm(EMPTY), setCreateError(null))}>
              {t('action.cancel')}
            </button>
          </div>
        </form>
      ) : null}

      <div className="row">
        <input
          type="search"
          className="compact"
          value={q}
          maxLength={80}
          onChange={(e) => (setPage(0), setQ(e.target.value))}
          placeholder={t('admin.promoters.search')}
          aria-label={t('admin.promoters.search')}
        />
      </div>
      <ErrorNotice error={error} />
      {!data ? (
        error ? null : <Loading />
      ) : data.rows.length === 0 ? (
        <Empty />
      ) : (
        <>
          <Table
            columns={[
              {
                label: t('admin.promoters.col.name'),
                render: (r) => (
                  <Link to={`/admin/promoters/${r.id}`}>
                    <strong>{r.displayName}</strong>
                  </Link>
                ),
              },
              { label: t('admin.promoters.number'), render: (r) => <bdi className="ltr">{r.whatsappMasked}</bdi> },
              { label: t('admin.promoters.col.code'), render: (r) => (r.code ? <bdi className="ltr code-digits">{r.code}</bdi> : <span className="muted">{t('admin.promoters.noCode')}</span>) },
              {
                label: t('admin.promoters.col.state'),
                render: (r) => <Badge tone={r.isActive ? 'ok' : 'muted'}>{t(r.isActive ? 'admin.promoters.active' : 'admin.promoters.inactive')}</Badge>,
              },
              { label: t('admin.promoters.col.created'), render: (r) => <bdi>{formatDate(r.createdAt, lang)}</bdi> },
              { label: t('admin.promoters.col.registrations'), render: (r) => formatInt(r.completedRegistrations, lang) },
              {
                label: t('admin.audit.action'),
                render: (r) => (
                  <Link className="btn btn-sm" to={`/admin/promoters/${r.id}`}>
                    {t('admin.promoters.open')}
                  </Link>
                ),
              },
            ]}
            rows={data.rows}
            keyOf={(r) => r.id}
          />
          <Pager page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
        </>
      )}
    </div>
  );
}

/** Zero-based pages, shown from one. */
export function Pager({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const { t, lang } = useI18n();
  if (total <= pageSize) return null;
  return (
    <div className="row">
      <button type="button" className="btn btn-sm" disabled={page <= 0} onClick={() => onPage(page - 1)} aria-label={t('admin.page.previous')}>
        ‹
      </button>
      <span className="muted small">
        {formatInt(page + 1, lang)} / {formatInt(Math.max(1, Math.ceil(total / pageSize)), lang)}
      </span>
      <button type="button" className="btn btn-sm" disabled={(page + 1) * pageSize >= total} onClick={() => onPage(page + 1)} aria-label={t('admin.page.next')}>
        ›
      </button>
    </div>
  );
}
