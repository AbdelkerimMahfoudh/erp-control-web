import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { request } from '../../api/client';
import type { AcquisitionLookup } from '../../api/types';
import { Notice } from '../../components/ui';
import { SITE, SURFACE } from '../../config/site';
import { useI18n } from '../../i18n';
import { localizedPath } from '../../site/routes';

/** The router state the application form reads a registration link's token from — memory, never the address. */
export interface JoinState {
  referralToken: string;
}

type Lookup = { kind: 'checking' } | { kind: 'none' } | { kind: 'answer'; answer: AcquisitionLookup };

/**
 * Where a registration link lands (0103, D221): `<portal>/join?r=<token>`, from a promoter's QR card or a user's
 * invitation. On a phone with the app, the operating system opens the app instead (once its association files are
 * published); this page is the browser's way.
 *
 * Opening it creates nothing — no account, no agreement, no consent, no subscription. The token leaves the address at
 * once (so it is in no later history entry, bookmark or screenshot) and is asked about by POST, never logged. The page
 * says what the link is — a promoter's code with their display name, or an invitation — or, for one no longer usable,
 * a short notice; either way the person goes on to the ordinary registration, carrying the token in memory:
 *
 *  - a full build has the application form: it opens with the code or invitation prefilled and removable;
 *  - the portal has none: it continues in the Dukan ERP app in a browser where that is published, or asks for the app.
 */
export function Join() {
  const { t, lang } = useI18n();
  const token = useRef<string | null>(null);
  const [lookup, setLookup] = useState<Lookup>({ kind: 'checking' });

  useEffect(() => {
    if (token.current === null) {
      const r = new URLSearchParams(window.location.search).get('r');
      token.current = r && r.length <= 64 ? r : '';
      // Out of the address bar and the history entry; it lives in this page's memory from here on.
      window.history.replaceState(window.history.state, '', window.location.pathname);
    }
    const r = token.current;
    if (!r) {
      setLookup({ kind: 'none' });
      return;
    }
    let live = true;
    request<AcquisitionLookup>('platform/acquisition/link', { method: 'POST', body: { token: r } })
      .then((answer) => live && setLookup({ kind: 'answer', answer }))
      .catch(() => live && setLookup({ kind: 'answer', answer: { usable: false } }));
    return () => {
      live = false;
    };
  }, []);

  const usable = lookup.kind === 'answer' && lookup.answer.usable ? lookup.answer : null;
  const carried = usable ? token.current : null;
  const appWeb = SITE.appWebOrigin;

  return (
    <div className="stack">
      <section className="hero">
        <h1>{t('join.title')}</h1>
        <p className="lead">{t('join.lead')}</p>
      </section>
      <div aria-live="polite">
        {lookup.kind === 'checking' ? (
          <p className="muted" role="status">
            {t('join.checking')}
          </p>
        ) : usable?.source === 'promoter' ? (
          <Notice tone="ok">{t('promo.from', { name: usable.promoterName })}</Notice>
        ) : usable?.source === 'user_invite' ? (
          <Notice tone="ok">{t('promo.invited')}</Notice>
        ) : lookup.kind === 'answer' ? (
          <Notice tone="warn">{t('promo.linkInvalid')}</Notice>
        ) : null}
      </div>
      {lookup.kind === 'checking' ? null : SURFACE === 'full' ? (
        <div className="row">
          <Link className="btn btn-primary" to={localizedPath(lang, '/apply')} state={carried ? ({ referralToken: carried } satisfies JoinState) : undefined}>
            {t('join.continue')}
          </Link>
        </div>
      ) : appWeb ? (
        <div className="row">
          <a className="btn btn-primary" href={`${appWeb}/register${carried ? `?r=${encodeURIComponent(carried)}` : ''}`} rel="noreferrer">
            {t('join.continue')}
          </a>
        </div>
      ) : (
        <p>{t('join.app')}</p>
      )}
      <p className="muted small">{t('join.nothing')}</p>
    </div>
  );
}
