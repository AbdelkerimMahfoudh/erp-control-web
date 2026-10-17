import { Link } from 'react-router-dom';
import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { BUILD_MODE, FILLED_INPUTS, IS_PREVIEW, SITE, SURFACE } from '../../config/site';
import type { Block, Document, LegalDocument } from '../../content/types';
import { useI18n } from '../../i18n';
import { formatDate } from '../../lib/format';
import { applyHead, headFor } from '../../site/head';
import { inAppPathOf, pathOf, type PublicRouteId } from '../../site/routes';
import { plainText, RichText, textValues } from './RichText';

/** True inside the pages the mobile app opens (`/in-app/…`): their links stay among those pages. */
export const InAppContext = createContext(false);

/** The address of a legal or support page from where the reader is: the public site, or the app's own pages. */
export function useLegalPath(): (id: PublicRouteId) => string {
  const inApp = useContext(InAppContext);
  const { lang } = useI18n();
  return (id) => (inApp ? inAppPathOf(id, lang) : pathOf(id, lang));
}

/** The organization, as a text mark (docs/74 §4: no logo is approved; this component is where one goes). */
export function OrgMark() {
  return (
    <span className="org-mark">
      <span className="org-mark-symbol" aria-hidden="true">
        {SITE.displayName.slice(0, 1)}
      </span>
      <span className="org-mark-name">{SITE.displayName}</span>
    </span>
  );
}

/** The product, visibly distinct from the organization: its own mark and colour. */
export function ProductMark({ size = 'md' }: { size?: 'md' | 'lg' }) {
  return (
    <span className={`product-mark product-mark-${size}`}>
      <span className="product-mark-symbol" aria-hidden="true">
        D
      </span>
      <span className="product-mark-name">Dukan ERP</span>
    </span>
  );
}

export function PreviewBanner() {
  const { t } = useI18n();
  if (!IS_PREVIEW) return null;
  return (
    <div className="preview-banner" role="note" data-mode={BUILD_MODE} data-filled={FILLED_INPUTS.join(' ')}>
      {t('preview.banner')}
    </div>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.kind) {
    case 'p':
      return (
        <p>
          <RichText text={block.text} />
        </p>
      );
    case 'note':
      return (
        <p className="muted small">
          <RichText text={block.text} />
        </p>
      );
    case 'h3':
      return (
        <h3>
          <RichText text={block.text} />
        </h3>
      );
    case 'list':
      return (
        <ul className="prose-list">
          {block.items.map((item, i) => (
            <li key={i}>
              <RichText text={item} />
            </li>
          ))}
        </ul>
      );
  }
}

export function Sections({ doc, after }: { doc: Document; after?: Record<string, ReactNode> }) {
  return (
    <>
      {doc.sections.map((s) => (
        <section key={s.id} id={s.id} className="doc-section" aria-labelledby={`${s.id}-h`}>
          <h2 id={`${s.id}-h`}>
            <RichText text={s.heading} />
          </h2>
          {s.blocks.map((b, i) => (
            <BlockView key={i} block={b} />
          ))}
          {after?.[s.id] ?? null}
        </section>
      ))}
    </>
  );
}

export function PageIntro({ title, summary, children }: { title: string; summary: string; children?: ReactNode }) {
  return (
    <header className="page-intro">
      <h1>
        <RichText text={title} />
      </h1>
      <p className="lead">
        <RichText text={summary} />
      </p>
      {children}
    </header>
  );
}

/**
 * A legal text: what it is, which version, since when, whether TSX-MR has approved it, and its sections with a table
 * of contents. A draft says so at the top in every language and every mode — a production build refuses one, so the
 * real site never shows the label.
 */
export function LegalView({ doc, after }: { doc: LegalDocument; after?: Record<string, ReactNode> }) {
  const { t, lang } = useI18n();
  const effective = SITE.legalEffectiveDate;
  return (
    <article className="doc legal">
      {doc.status === 'draft' ? (
        <p className="notice tone-warn legal-draft" role="note">
          <strong>{t(SURFACE === 'public' ? 'legal.draftPrelaunch' : 'legal.draft')}</strong>
        </p>
      ) : null}
      <PageIntro title={doc.title} summary={doc.summary}>
        <p className="legal-meta">
          <span>{t('legal.version', { version: doc.version })}</span>
          <span aria-hidden="true"> · </span>
          <span>{effective ? t('legal.effective', { date: formatDate(`${effective}T00:00:00Z`, lang) }) : <mark className="pending">{t('legal.effectivePending')}</mark>}</span>
        </p>
      </PageIntro>
      <nav className="toc" aria-labelledby="toc-h">
        <h2 id="toc-h" className="toc-title">
          {t('legal.contents')}
        </h2>
        <ol>
          {doc.sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`}>
                <RichText text={s.heading} />
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <Sections doc={doc} after={after} />
      <footer className="legal-related" aria-labelledby="related-h">
        <h2 id="related-h">{t('legal.related')}</h2>
        <LegalLinks />
      </footer>
    </article>
  );
}

/** The legal and support pages, as links in the current language — on every legal page and the legal notice. */
export function LegalLinks() {
  const { t } = useI18n();
  const to = useLegalPath();
  const pages: [PublicRouteId, string][] = [
    ['privacy', t('footer.privacy')],
    ['privacyChoices', t('footer.privacyChoices')],
    ['terms', t('footer.terms')],
    ['accountDeletion', t('footer.deletion')],
    ['support', t('footer.support')],
    ['security', t('footer.security')],
    ['legalNotice', t('footer.legalNotice')],
  ];
  return (
    <ul className="legal-links">
      {pages.map(([id, label]) => (
        <li key={id}>
          <Link to={to(id)}>{label}</Link>
        </li>
      ))}
    </ul>
  );
}

/** The registered details TSX-MR supplied — never more than it supplied. */
export function OrgDetails() {
  const { t, lang } = useI18n();
  const v = textValues(lang);
  const rows: [string, ReactNode][] = [];
  if (SITE.legalName) rows.push([t('org.legalName'), <bdi key="n">{SITE.legalName}</bdi>]);
  if (SITE.legalForm) rows.push([t('org.legalForm'), <bdi key="f">{SITE.legalForm}</bdi>]);
  if (SITE.registrationNumber) rows.push([t('org.registration'), <bdi key="r">{SITE.registrationNumber}</bdi>]);
  const address = [SITE.address, SITE.city, v.country].filter(Boolean).join(', ');
  if (address) rows.push([t('org.address'), <bdi key="a">{address}</bdi>]);
  if (SITE.phone) rows.push([t('org.phone'), <a key="p" href={`tel:${SITE.phone.replace(/\s+/g, '')}`} className="ltr">{SITE.phone}</a>]);
  return (
    <dl className="org-details">
      {rows.map(([label, value]) => (
        <div key={label} className="org-row">
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The configured addresses, each a mail link; none configured is said, never left as a dead end. */
export function ContactAddresses() {
  const { t } = useI18n();
  const entries: [string, string][] = [
    [t('org.supportEmail'), SITE.supportEmail],
    [t('org.commercialEmail'), SITE.commercialEmail],
    [t('org.privacyEmail'), SITE.privacyEmail],
    [t('org.securityEmail'), SITE.securityEmail],
  ].filter((e): e is [string, string] => Boolean(e[1]));
  if (entries.length === 0 && !SITE.supportWhatsapp && !SITE.phone) return <p className="notice tone-warn">{t('contact.none')}</p>;
  return (
    <ul className="contact-list">
      {entries.map(([label, email]) => (
        <li key={label}>
          <span className="contact-label">{label}</span>
          <a href={`mailto:${email}`}>
            <bdi>{email}</bdi>
          </a>
        </li>
      ))}
      {SITE.supportWhatsapp ? (
        <li>
          <span className="contact-label">{t('org.whatsapp')}</span>
          <span className="ltr">{SITE.supportWhatsapp}</span>
        </li>
      ) : null}
      {SITE.phone ? (
        <li>
          <span className="contact-label">{t('org.phone')}</span>
          <a href={`tel:${SITE.phone.replace(/\s+/g, '')}`} className="ltr">
            {SITE.phone}
          </a>
        </li>
      ) : null}
    </ul>
  );
}

/** Applies the page's head after a navigation; the prerendered file already carries the same tags. */
export function PageHead({ id, title, description }: { id: PublicRouteId; title: string; description: string }) {
  const { lang } = useI18n();
  const inApp = useContext(InAppContext);
  useEffect(() => {
    const values = textValues(lang);
    applyHead(
      headFor({
        id,
        lang,
        title: plainText(title, values),
        description: plainText(description, values),
        site: SITE,
        filled: FILLED_INPUTS,
        preview: IS_PREVIEW,
        productName: 'Dukan ERP',
        inApp,
      }),
    );
  }, [id, lang, title, description, inApp]);
  return null;
}
