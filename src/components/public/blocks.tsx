import { Link, useLocation } from 'react-router-dom';
import { DukanMark } from './DukanMark';
import { createContext, useContext, useEffect, type HTMLAttributes, type ReactNode } from 'react';
import { BUILD_MODE, FILLED_INPUTS, IS_PREVIEW, SITE, SURFACE } from '../../config/site';
import { phoneList } from '../../config/schema';
import type { Block, Document, LegalDocument } from '../../content/types';
import { useI18n } from '../../i18n';
import { formatDate } from '../../lib/format';
import { applyHead, headFor } from '../../site/head';
import { inAppPathOf, pathOf, type PublicRouteId } from '../../site/routes';
import { Icon, type IconName } from './icons';
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
      <DukanMark className="product-mark-symbol" />
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

/**
 * A page's opening (2026-10-17): a band in the site's navy with the title and its summary, edge to edge; inside the
 * pages the mobile app opens it is a plain light heading (public.css `.in-app`).
 */
export function PageIntro({ title, summary, children }: { title: string; summary: string; children?: ReactNode }) {
  return (
    <header className="page-intro band band-dark">
      <div className="container page-intro-inner">
        <h1>
          <RichText text={title} />
        </h1>
        <p className="lead">
          <RichText text={summary} />
        </p>
        {children}
      </div>
    </header>
  );
}

/** A full-width band of the public pages, in one of three tones, with its content constrained inside. */
export function Band({ tone = 'light', className, children, ...rest }: { tone?: 'light' | 'tint' | 'dark'; className?: string; children: ReactNode } & Omit<HTMLAttributes<HTMLElement>, 'className' | 'children'>) {
  return (
    <section {...rest} className={['band', `band-${tone}`, className].filter(Boolean).join(' ')}>
      <div className="container">{children}</div>
    </section>
  );
}

/** A section's heading and its one-line lead, in the page's language. */
export function SectionHead({ id, title, lead }: { id: string; title: string; lead?: string }) {
  return (
    <div className="section-head">
      <h2 id={id}>
        <RichText text={title} />
      </h2>
      {lead ? (
        <p className="lead">
          <RichText text={lead} />
        </p>
      ) : null}
    </div>
  );
}

/**
 * A legal text: what it is, which version, since when, whether TSX-MR has approved it, and its sections with a table
 * of contents. A draft says so at the top in every language and every mode — a production build refuses one, so the
 * real site never shows the label.
 */
export function LegalView({ doc, after }: { doc: LegalDocument; after?: Record<string, ReactNode> }) {
  const { t, lang } = useI18n();
  const effective = doc.effective ?? SITE.legalEffectiveDate;
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
      {/* The sections as rows, each with its number in a marker; the list keeps its semantics (`role` survives the removed
          bullets in Safari) and the marker is decorative, since a list already says each item's position. */}
      <nav className="toc" aria-labelledby="toc-h">
        <h2 id="toc-h" className="toc-title">
          {t('legal.contents')}
        </h2>
        <ol className="toc-list" role="list">
          {doc.sections.map((s, i) => (
            <li key={s.id}>
              {/* Through the router, so the section opens below the header with focus on it, and Back returns (RouteScroll). */}
              <Link className="toc-link" to={{ hash: s.id }}>
                <span className="toc-num num" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="toc-text">
                  <RichText text={s.heading} />
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </nav>
      <Sections doc={doc} after={after} />
      <RelatedPages />
    </article>
  );
}

/**
 * The one group of quick links a page carries (the owner's brief of 2026-10-17, fourth): the policies and help, at the
 * end of every legal page, of Support and of Contact — never twice on a page, and never as well as another list of the
 * same pages. Inside the pages the app opens, their footer already lists them, so the page itself adds none.
 */
export function RelatedPages() {
  const { t } = useI18n();
  if (useContext(InAppContext)) return null;
  return (
    <nav className="legal-related" aria-labelledby="related-h">
      <h2 id="related-h">{t('legal.related')}</h2>
      <LegalLinks />
    </nav>
  );
}

/**
 * The legal and support pages in the current language, each a compact pill. The page the reader is on is in the list
 * too, so the set never changes shape, but as plain text marked current — not a link that leads back to itself.
 *
 * Account deletion is listed only in the pages the Dukan ERP app opens, where the reader has an account in mind. On the
 * company website it is a Dukan ERP document: the product page's Documentation and Support lead to it (2026-10-19).
 */
export function LegalLinks() {
  const { t } = useI18n();
  const to = useLegalPath();
  const { pathname } = useLocation();
  const inApp = useContext(InAppContext);
  const pages: [PublicRouteId, string][] = [
    ['privacy', t('footer.privacy')],
    ['privacyChoices', t('footer.privacyChoices')],
    ['terms', t('footer.terms')],
    ...(inApp ? ([['accountDeletion', t('footer.deletion')]] as [PublicRouteId, string][]) : []),
    ['support', t('footer.support')],
    ['security', t('footer.security')],
    ['legalNotice', t('footer.legalNotice')],
  ];
  return (
    <ul className="legal-links" role="list">
      {pages.map(([id, label]) => (
        <li key={id}>
          {to(id) === pathname ? (
            <span className="related-link" aria-current="page">
              {label}
            </span>
          ) : (
            <Link className="related-link" to={to(id)}>
              {label}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

/** True while the website's operator is an individual, with no separate company (`VITE_OPERATOR_TYPE`). */
export const INDIVIDUAL_OPERATOR = SITE.operatorType !== 'company';

/**
 * A configured public telephone number as a compact contact row: a call icon and the number, named like the contact
 * cards ("Call +222 …"). None is labelled WhatsApp unless one is configured as such.
 */
function PhoneLink({ phone }: { phone: string }) {
  const { t } = useI18n();
  return (
    <a className="org-phone" href={`tel:${phone.replace(/\s+/g, '')}`} aria-label={t('contact.callName', { value: phone })}>
      <span className="org-phone-icon">
        <Icon name="call" size={16} />
      </span>
      <bdi dir="ltr">{phone}</bdi>
    </a>
  );
}

/**
 * The operator's details, as TSX-MR supplied them — never more — under the legal notice's "Publisher" section, whose
 * sentence already names who operates the website (`{operatorStatus}`); the person responsible for publication is
 * named by its own section. An individual operator: the trading name, the plain statement that there is no company (so
 * no legal form or trade-register number) and a correspondence address. A company: its registered details.
 */
export function OrgDetails() {
  const { t, lang } = useI18n();
  const v = textValues(lang);
  const rows: [string, ReactNode][] = [];
  if (INDIVIDUAL_OPERATOR) {
    rows.push([t('org.tradingName'), <bdi key="t">{SITE.displayName}</bdi>]);
    rows.push([t('org.status'), t('org.statusIndividual')]);
  } else {
    if (SITE.legalName) rows.push([t('org.legalName'), <bdi key="n">{SITE.legalName}</bdi>]);
    if (SITE.legalForm) rows.push([t('org.legalForm'), <bdi key="f">{SITE.legalForm}</bdi>]);
    if (SITE.registrationNumber) rows.push([t('org.registration'), <bdi key="r">{SITE.registrationNumber}</bdi>]);
  }
  if (v.postalAddress) rows.push([t(INDIVIDUAL_OPERATOR ? 'org.correspondenceAddress' : 'org.address'), <bdi key="a">{v.postalAddress}</bdi>]);
  phoneList(SITE.phone).forEach((phone, i) => rows.push([t('org.phone'), <PhoneLink key={`p${i}`} phone={phone} />]));
  return (
    <dl className="org-details">
      {rows.map(([label, value], i) => (
        <div key={`${label}-${i}`} className="org-row">
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * How to reach TSX-MR (the 2026-10-17 refinement): each configured mailbox and number is a card that is itself the link
 * (`mailto:` or `tel:`). Each card shows what it is for, the address or number in full (readable and copyable) and the
 * action, and its accessible name says all three. The emails come first, then the telephones under their own heading.
 * A number has no purpose of its own here (none is documented), so each is simply a number to call, and none is
 * labelled WhatsApp unless `VITE_SUPPORT_WHATSAPP` names one. Nothing configured is said, never left as a dead end.
 */
/**
 * `reveal`: the cards appear as the reader reaches them (lib/reveal.ts) — on the Contact page only, never inside a
 * legal text or a page the app opens.
 */
export function ContactMethods({ reveal = false }: { reveal?: boolean } = {}) {
  const { t } = useI18n();
  const emails: [string, string][] = [
    [t('org.contactEmail'), SITE.contactEmail],
    [t('org.supportEmail'), SITE.supportEmail],
    [t('org.commercialEmail'), SITE.commercialEmail],
    [t('org.privacyEmail'), SITE.privacyEmail],
    [t('org.securityEmail'), SITE.securityEmail],
  ].filter((e): e is [string, string] => Boolean(e[1]));
  const phones = phoneList(SITE.phone);
  if (emails.length === 0 && !SITE.supportWhatsapp && phones.length === 0) return <p className="notice tone-warn">{t('contact.none')}</p>;
  return (
    <div className="contact-methods">
      {emails.length > 0 ? (
        <div className="contact-group">
          <h3 className="contact-group-title">{t('contact.byEmail')}</h3>
          <ul className="contact-grid">
            {emails.map(([purpose, email]) => (
              <ContactCard
                key={purpose}
                icon="mail"
                href={`mailto:${email}`}
                purpose={purpose}
                value={email}
                action={t('contact.write')}
                name={t('contact.writeName', { purpose, value: email })}
                reveal={reveal}
              />
            ))}
          </ul>
        </div>
      ) : null}
      {phones.length > 0 || SITE.supportWhatsapp ? (
        <div className="contact-group">
          <h3 className="contact-group-title">{t('contact.byPhone')}</h3>
          <ul className="contact-grid">
            {phones.map((phone) => (
              <ContactCard
                key={phone}
                icon="call"
                href={`tel:${phone.replace(/\s+/g, '')}`}
                value={phone}
                action={t('contact.call')}
                name={t('contact.callName', { value: phone })}
                reveal={reveal}
              />
            ))}
            {SITE.supportWhatsapp ? (
              <li className="contact-card elevated" data-reveal={reveal ? '' : undefined}>
                <div className="contact-body">
                  <span className="icon-badge contact-icon">
                    <Icon name="messages" />
                  </span>
                  <span className="contact-text">
                    <span className="contact-purpose">{t('org.whatsapp')}</span>
                    <bdi dir="ltr" className="contact-value">
                      {SITE.supportWhatsapp}
                    </bdi>
                  </span>
                </div>
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/** One way to reach TSX-MR: the whole card is the link, the value stays visible and left to right in Arabic. */
function ContactCard({ icon, href, purpose, value, action, name, reveal }: { icon: IconName; href: string; purpose?: string; value: string; action: string; name: string; reveal: boolean }) {
  return (
    <li className="contact-card elevated" data-reveal={reveal ? '' : undefined}>
      <a className="contact-body contact-link" href={href} aria-label={name}>
        <span className="icon-badge contact-icon">
          <Icon name={icon} />
        </span>
        <span className="contact-text">
          {purpose ? <span className="contact-purpose">{purpose}</span> : null}
          <bdi dir="ltr" className="contact-value">
            {value}
          </bdi>
        </span>
        <span className="contact-action">
          <span className="contact-action-text">{action}</span>
          <Icon name="arrow" size={16} className="icon-arrow" />
        </span>
      </a>
    </li>
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
