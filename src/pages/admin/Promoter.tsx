import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { AcquisitionReport, PromoterDetail } from '../../api/types';
import { adminRequest } from '../../auth/admin';
import { drawQr, QrCode } from '../../components/qr';
import { Badge, Empty, ErrorNotice, Field, Loading, Notice, Table } from '../../components/ui';
import { isRtl, LANGUAGE_LABELS, LANGUAGES, translate, useI18n, type Language } from '../../i18n';
import { formatDate, formatDateTime, formatInt } from '../../lib/format';
import { Pager } from './Promoters';
import { AcquisitionStatus } from './RegistrationSources';
import { useStepUp } from './useStepUp';

/**
 * One promoter (0103, D221), for the platform administrator: their details — the full WhatsApp number and the private
 * note appear here and nowhere else — their code and QR card, the decisions on them, the code's history and the
 * businesses that registered through them.
 *
 * Every decision asks for the password and a code. Generating is an explicit click: no code exists until it is
 * confirmed. Regenerating is confirmed twice — what it does first, then the step-up — because it retires the code and
 * every printed card at once. The card shows the display name, the code, the QR and one instruction, and nothing else.
 */
export function Promoter() {
  const { id = '' } = useParams();
  const { t, lang } = useI18n();
  const { ask, dialog } = useStepUp();
  const [promoter, setPromoter] = useState<PromoterDetail | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [actionError, setActionError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);

  const load = useCallback(() => {
    adminRequest<PromoterDetail>(`platform/promoters/${encodeURIComponent(id)}`)
      .then((p) => {
        setPromoter(p);
        setError(null);
      })
      .catch(setError);
  }, [id]);
  useEffect(load, [load]);

  /** One decision: the step-up, the request, and the promoter as the server now has it. */
  const decide = async (path: string, body: Record<string, unknown> = {}) => {
    setActionError(null);
    const confirmPassword = await ask();
    if (!confirmPassword) return;
    setBusy(true);
    try {
      setPromoter(await adminRequest<PromoterDetail>(`platform/promoters/${encodeURIComponent(id)}${path}`, { method: 'POST', body: { ...body, confirmPassword } }));
    } catch (e) {
      setActionError(e);
    } finally {
      setBusy(false);
    }
  };

  if (!promoter) return error ? <ErrorNotice error={error} /> : <Loading />;
  const p = promoter;

  return (
    <div className="stack">
      {dialog}
      <Link to="/admin/promoters" className="small">
        ‹ {t('admin.promoter.back')}
      </Link>
      <div className="row spread">
        <h1>{p.displayName}</h1>
        <Badge tone={p.isActive ? 'ok' : 'muted'}>{t(p.isActive ? 'admin.promoters.active' : 'admin.promoters.inactive')}</Badge>
      </div>
      {!p.isActive ? <Notice tone="warn">{t('admin.promoter.inactive.notice')}</Notice> : null}
      <ErrorNotice error={actionError} />

      <section className="card stack" aria-labelledby="promoter-code">
        <h2 id="promoter-code">{t('admin.promoter.code')}</h2>
        {p.code ? (
          <>
            <p className="code-big ltr" aria-label={p.code.code.split('').join(' ')}>
              {p.code.code}
            </p>
            <div className="row">
              <CopyButton text={p.code.code} label={t('admin.promoter.copy')} />
              {p.qrLink ? <CopyButton text={p.qrLink} label={t('admin.promoter.copyLink')} /> : null}
              <button type="button" className="btn" disabled={busy} onClick={() => setConfirmRegenerate(true)}>
                {t('admin.promoter.regenerate')}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="muted">{t('admin.promoter.generate.lead')}</p>
            <div className="row">
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void decide('/code', { regenerate: false })}>
                {t('admin.promoter.generate')}
              </button>
            </div>
          </>
        )}
      </section>

      {p.code ? (
        p.qrLink ? (
          <PromoterCard name={p.displayName} code={p.code.code} link={p.qrLink} />
        ) : (
          <Notice tone="warn">{t('admin.promoter.linkUnavailable')}</Notice>
        )
      ) : null}

      <section className="card stack">
        <h2>{t('admin.business.actions')}</h2>
        <div className="row">
          {p.isActive ? (
            <button type="button" className="btn" disabled={busy} onClick={() => void decide('/deactivate')}>
              {t('admin.promoter.deactivate')}
            </button>
          ) : (
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void decide('/activate')}>
              {t('admin.promoter.activate')}
            </button>
          )}
        </div>
      </section>

      <Details promoter={p} onSaved={setPromoter} ask={ask} />

      <section className="card stack">
        <h2>{t('admin.promoter.history')}</h2>
        {p.codeHistory.length === 0 ? (
          <Empty />
        ) : (
          <ul className="stack-tight list-plain">
            {p.codeHistory.map((h) => (
              <li key={h.version} className="row">
                <bdi className="ltr code-digits">{h.code}</bdi>
                <span className="muted small">{t('admin.business.version', { n: formatInt(h.version, lang) })}</span>
                <span className="muted small">{formatDateTime(h.issuedAt, lang)}</span>
                {h.retiredAt ? (
                  <Badge tone="muted">{t('admin.promoter.history.retired', { date: formatDateTime(h.retiredAt, lang) })}</Badge>
                ) : (
                  <Badge tone="ok">{t('admin.promoter.history.current')}</Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Businesses id={p.id} />

      <RegenerateDialog
        open={confirmRegenerate}
        code={p.code?.code ?? ''}
        onCancel={() => setConfirmRegenerate(false)}
        onConfirm={() => {
          setConfirmRegenerate(false);
          void decide('/code', { regenerate: true });
        }}
      />
    </div>
  );
}

function Details({ promoter, onSaved, ask }: { promoter: PromoterDetail; onSaved: (p: PromoterDetail) => void; ask: () => Promise<string | null> }) {
  const { t, lang } = useI18n();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ displayName: promoter.displayName, whatsappNumber: promoter.whatsappNumber, note: promoter.note ?? '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => setForm({ displayName: promoter.displayName, whatsappNumber: promoter.whatsappNumber, note: promoter.note ?? '' }), [promoter]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const confirmPassword = await ask();
    if (!confirmPassword) return;
    setBusy(true);
    try {
      onSaved(
        await adminRequest<PromoterDetail>(`platform/promoters/${encodeURIComponent(promoter.id)}`, {
          method: 'POST',
          body: { displayName: form.displayName.trim(), whatsappNumber: form.whatsappNumber.trim(), note: form.note.trim(), confirmPassword },
        }),
      );
      setEditing(false);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  return (
    <section className="card stack">
      <div className="row spread">
        <h2>{t('admin.promoter.details')}</h2>
        {editing ? null : (
          <button type="button" className="btn btn-sm" onClick={() => setEditing(true)}>
            {t('admin.promoter.edit')}
          </button>
        )}
      </div>
      {editing ? (
        <form className="stack" onSubmit={save}>
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
          <ErrorNotice error={error} />
          <div className="row">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {t('admin.promoter.save')}
            </button>
            <button type="button" className="btn" onClick={() => setEditing(false)}>
              {t('action.cancel')}
            </button>
          </div>
        </form>
      ) : (
        <dl className="facts">
          <dt>{t('admin.promoters.number')}</dt>
          <dd>
            <bdi className="ltr">{promoter.whatsappNumber}</bdi>
          </dd>
          <dt>{t('admin.promoters.note')}</dt>
          <dd>{promoter.note ?? '—'}</dd>
          <dt>{t('admin.promoters.col.registrations')}</dt>
          <dd>{formatInt(promoter.completedRegistrations, lang)}</dd>
          <dt>{t('admin.promoters.col.created')}</dt>
          <dd>{t('admin.promoter.created', { who: promoter.createdBy, date: formatDate(promoter.createdAt, lang) })}</dd>
        </dl>
      )}
    </section>
  );
}

function Businesses({ id }: { id: string }) {
  const { t, lang } = useI18n();
  const [page, setPage] = useState(0);
  const [data, setData] = useState<AcquisitionReport | null>(null);
  useEffect(() => {
    adminRequest<AcquisitionReport>(`platform/promoters/${encodeURIComponent(id)}/businesses?page=${page}`)
      .then(setData)
      .catch(() => setData({ total: 0, page: 0, pageSize: 50, rows: [] }));
  }, [id, page]);
  return (
    <section className="card stack">
      <h2>{t('admin.promoter.businesses')}</h2>
      {!data ? (
        <Loading />
      ) : data.rows.length === 0 ? (
        <Empty />
      ) : (
        <>
          <Table
            columns={[
              {
                label: t('apply.business'),
                render: (r) => (
                  <Link to={`/admin/businesses/${r.companyId}`}>
                    <strong>{r.businessName ?? '—'}</strong>
                  </Link>
                ),
              },
              { label: t('admin.sources.col.registered'), render: (r) => <bdi>{formatDate(r.registeredAt, lang)}</bdi> },
              { label: t('admin.sources.col.source'), render: (r) => (r.mechanism ? t(`admin.sources.mechanism.${r.mechanism}`) : '—') },
              { label: t('admin.sources.col.finished'), render: (r) => <AcquisitionStatus row={r} /> },
            ]}
            rows={data.rows}
            keyOf={(r) => r.companyId}
          />
          <Pager page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
        </>
      )}
    </section>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const { t } = useI18n();
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn"
      onClick={() => {
        void navigator.clipboard
          ?.writeText(text)
          .then(() => {
            setDone(true);
            setTimeout(() => setDone(false), 2000);
          })
          .catch(() => undefined);
      }}
    >
      {done ? t('admin.promoter.copied') : label}
    </button>
  );
}

function RegenerateDialog({ open, code, onCancel, onConfirm }: { open: boolean; code: string; onCancel: () => void; onConfirm: () => void }) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className="modal" onCancel={onCancel} aria-labelledby="regenerate-title">
      <div className="body stack">
        <h2 id="regenerate-title">{t('admin.promoter.regenerate.title')}</h2>
        <p>{t('admin.promoter.regenerate.body', { code })}</p>
        <div className="row">
          <button type="button" className="btn btn-danger" onClick={onConfirm}>
            {t('admin.promoter.regenerate.confirm')}
          </button>
          <button type="button" className="btn" onClick={onCancel} autoFocus>
            {t('action.cancel')}
          </button>
        </div>
      </div>
    </dialog>
  );
}

// ── The card ─────────────────────────────────────────────────────────────────

const BRAND = 'Dukan ERP';

/**
 * The promoter's card: the brand, the display name, the QR, the code and one instruction, in the language chosen for
 * it (not necessarily the console's). On screen, printed (only the card prints), downloaded as a PNG, or shared as one
 * where the browser can share files. Never the number, the note, an id or a customer.
 */
export function PromoterCard({ name, code, link }: { name: string; code: string; link: string }) {
  const { t, lang } = useI18n();
  const [cardLang, setCardLang] = useState<Language>(lang);
  const dir = isRtl(cardLang) ? 'rtl' : 'ltr';
  const instruction = translate(cardLang, 'card.instruction');
  const codeLabel = translate(cardLang, 'card.codeLabel');
  const canShareFiles = typeof navigator !== 'undefined' && typeof navigator.canShare === 'function';

  const png = () => renderCardPng({ name, code, link, instruction, codeLabel, dir });

  const download = async () => {
    const blob = await png();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dukan-erp-card-${code}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const share = async () => {
    const file = new File([await png()], `dukan-erp-card-${code}.png`, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: BRAND }).catch(() => undefined);
  };

  return (
    <section className="card stack" aria-labelledby="promoter-card">
      <div className="row spread">
        <h2 id="promoter-card">{t('admin.promoter.card.title')}</h2>
        <select className="compact" value={cardLang} onChange={(e) => setCardLang(e.target.value as Language)} aria-label={t('admin.promoter.card.language')}>
          {LANGUAGES.map((l) => (
            <option key={l} value={l}>
              {LANGUAGE_LABELS[l]}
            </option>
          ))}
        </select>
      </div>
      <p className="muted small">{t('admin.promoter.card.lead')}</p>
      <div className="print-card" dir={dir} lang={cardLang} data-testid="promoter-card">
        <p className="print-card-brand">{BRAND}</p>
        <p className="print-card-name">{name}</p>
        <QrCode text={link} label={translate(cardLang, 'admin.promoter.qr.label', { code })} />
        <p className="print-card-label">{codeLabel}</p>
        <p className="print-card-code ltr">{code}</p>
        <p className="print-card-instruction">{instruction}</p>
      </div>
      <div className="row">
        <button type="button" className="btn btn-primary" onClick={() => void download()}>
          {t('admin.promoter.download')}
        </button>
        <button type="button" className="btn" onClick={() => window.print()}>
          {t('admin.promoter.print')}
        </button>
        {canShareFiles ? (
          <button type="button" className="btn" onClick={() => void share()}>
            {t('admin.promoter.share')}
          </button>
        ) : null}
      </div>
    </section>
  );
}

/** The card as a 1200×1700 PNG: black on white, the QR at whole-pixel modules. */
function renderCardPng(c: { name: string; code: string; link: string; instruction: string; codeLabel: string; dir: 'ltr' | 'rtl' }): Promise<Blob> {
  const W = 1200;
  const H = 1700;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = 'black';
  const font = (px: number, weight = 600) => `${weight} ${px}px system-ui, -apple-system, "Segoe UI", "Noto Sans Arabic", sans-serif`;
  ctx.direction = 'ltr';
  ctx.font = font(64, 800);
  ctx.fillText(BRAND, W / 2, 140);
  ctx.direction = c.dir;
  ctx.font = font(56, 600);
  ctx.fillText(c.name, W / 2, 250, W - 160);
  drawQr(ctx, c.link, 200, 320, 800);
  ctx.fillStyle = 'dimgray';
  ctx.font = font(44, 500);
  ctx.fillText(c.codeLabel, W / 2, 1220);
  ctx.direction = 'ltr';
  ctx.fillStyle = 'black';
  ctx.font = font(120, 800);
  ctx.fillText(c.code.split('').join('\u2009'), W / 2, 1360);
  ctx.direction = c.dir;
  ctx.fillStyle = 'dimgray';
  ctx.font = font(40, 500);
  wrap(ctx, c.instruction, W / 2, 1470, W - 200, 54);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('png'))), 'image/png'));
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lineHeight: number) {
  const words = text.split(' ');
  let line = '';
  let at = y;
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > max && line) {
      ctx.fillText(line, x, at);
      line = word;
      at += lineHeight;
    } else line = next;
  }
  if (line) ctx.fillText(line, x, at);
}
