import { useEffect, useState } from 'react';
import { apiBase, requestFile } from '../api/client';
import { useI18n } from '../i18n';
import { ErrorNotice, Loading, Notice } from './ui';

/**
 * A payment proof shown where it is decided (0136, owner 2026-11-11): an image inline, fitted, with a zoom toggle and a
 * full-size view; a PDF in the browser's own viewer; anything else named by its type. The bytes are fetched with the
 * session's credentials (`requestFile`) and shown from memory, never on the API's origin. The revision is part of what
 * is fetched, so a correction the Owner made is what appears. Download stays its own action.
 */
export function ProofViewer({ path, revision, fileName, downloadHref }: { path: string; revision: number; fileName: string; downloadHref: string }) {
  const { t } = useI18n();
  const [shown, setShown] = useState<{ url: string; type: string } | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    let live = true;
    let url: string | null = null;
    setShown(null);
    setError(null);
    setZoomed(false);
    requestFile(`${path}?r=${revision}`)
      .then(({ blob, type }) => {
        if (!live) return;
        url = URL.createObjectURL(blob);
        setShown({ url, type });
      })
      .catch((e: unknown) => live && setError(e));
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [path, revision]);

  const download = (
    <a className="btn" href={downloadHref} rel="noreferrer" download={fileName}>
      {t('admin.proofs.download')}
    </a>
  );
  if (error) return <div className="stack-tight"><ErrorNotice error={error} />{download}</div>;
  if (!shown) return <Loading />;
  const image = shown.type === 'image/png' || shown.type === 'image/jpeg';
  const pdf = shown.type === 'application/pdf';
  return (
    <div className="proof-viewer stack-tight" data-testid="proof-viewer">
      <p className="muted small">
        <span className="ltr" dir="ltr">{fileName}</span> · {t('admin.proofs.version', { revision: String(revision) })}
      </p>
      {image ? (
        <button type="button" className={zoomed ? 'proof-image zoomed' : 'proof-image'} onClick={() => setZoomed(!zoomed)} aria-pressed={zoomed} aria-label={zoomed ? t('admin.proofs.zoomOut') : t('admin.proofs.zoomIn')}>
          <img src={shown.url} alt={t('admin.proofs.imageAlt')} />
        </button>
      ) : pdf ? (
        <iframe className="proof-pdf" src={shown.url} title={t('admin.proofs.pdfTitle')} />
      ) : (
        <Notice tone="warn">{t('admin.proofs.unsupported', { type: shown.type || '?' })}</Notice>
      )}
      <div className="row">
        {image || pdf ? (
          <a className="btn" href={shown.url} target="_blank" rel="noreferrer">
            {t('admin.proofs.fullSize')}
          </a>
        ) : null}
        {download}
      </div>
    </div>
  );
}

/** The API address of a proof's file — as a download (the browser saves it under its name). */
export function proofFileHref(path: string): string {
  return `${apiBase()}/${path}`;
}
