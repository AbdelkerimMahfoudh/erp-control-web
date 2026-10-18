import { Link } from 'react-router-dom';
import { applicationStatus, documentsFor, dukanOverviewFor, legalDocumentsFor, login } from '../../content';
import { ComingSoon } from '../../components/ComingSoon';
import { Icon, type IconName } from '../../components/public/icons';
import { SITE, SURFACE } from '../../config/site';
import { useI18n } from '../../i18n';
import { pathOf } from '../../site/routes';
import { ContactMethods, INDIVIDUAL_OPERATOR, LegalView, OrgDetails, PageIntro, ProductMark, RelatedPages, Sections, useLegalPath } from '../../components/public/blocks';
import { textValues } from '../../components/public/RichText';
import { RichText } from '../../components/public/RichText';

/**
 * The text pages of the public site (docs/74 §4): each renders its document from `content/`, so its words are the
 * same three-language structure the parity test checks; the company details and addresses come from the inputs.
 * A public build (docs/96) renders the pre-launch texts: nothing in them says an account or a process works today.
 */
const { about, contact, products, support } = documentsFor(SURFACE);
const { accountDeletion, legalNotice, privacy, privacyChoices, security, terms } = legalDocumentsFor(SURFACE);

export function About() {
  const { t, lang } = useI18n();
  const doc = about[lang];
  return (
    <article className="public-page doc">
      <PageIntro title={doc.title} summary={doc.summary} />
      <Sections
        doc={doc}
        after={{
          work: (
            <p>
              <Link className="text-action" to={pathOf('services', lang)}>
                {t('nav.services')}
                <Icon name="arrow" size={16} className="icon-arrow" />
              </Link>
            </p>
          ),
          product: (
            <p>
              <Link className="text-action" to={pathOf('dukanErp', lang)}>
                {t('nav.dukanErp')}
                <Icon name="arrow" size={16} className="icon-arrow" />
              </Link>
            </p>
          ),
          publisher: (
            <p>
              <Link className="text-action" to={pathOf('legalNotice', lang)}>
                {t('footer.legalNotice')}
                <Icon name="arrow" size={16} className="icon-arrow" />
              </Link>
            </p>
          ),
        }}
      />
    </article>
  );
}

/** The six parts of Dukan ERP, as its page names them, each with its icon (`content/dukan-overview.ts` keeps their order). */
const CAPABILITY_ICONS: IconName[] = ['box', 'receipt', 'undo', 'wallet', 'users', 'file'];

export function Products() {
  const { t, lang } = useI18n();
  const doc = products[lang];
  const capabilities = dukanOverviewFor(lang, SURFACE).capabilities.items;
  return (
    <div className="public-page">
      <PageIntro title={doc.title} summary={doc.summary} />
      <ul className="card-grid products-grid">
        {doc.sections.map((s) => (
          <li key={s.id} className="card product-card elevated">
            <h2>
              <ProductMark size="lg" />
            </h2>
            {s.blocks.map((b, i) =>
              b.kind === 'p' ? (
                <p key={i} className="lead">
                  <RichText text={b.text} />
                </p>
              ) : null,
            )}
            <ul className="feature-list">
              {capabilities.map((capability, i) => (
                <li key={capability.title}>
                  <Icon name={CAPABILITY_ICONS[i] ?? 'box'} size={20} />
                  <span>
                    <RichText text={capability.title} />
                  </span>
                </li>
              ))}
            </ul>
            <ComingSoon />
            <div className="row">
              <Link className="btn btn-primary" to={pathOf('dukanErp', lang)}>
                {t('nav.dukanErp')}
              </Link>
              <Link className="btn" to={pathOf('contact', lang)}>
                {t('nav.contact')}
              </Link>
            </div>
          </li>
        ))}
      </ul>
      {/* Owned products and client services, told apart: the other half of what TSX-MR does is one step away. */}
      <p className="products-services">
        <span>{t('products.servicesNote', { name: SITE.displayName })}</span>
        <Link className="text-action" to={pathOf('services', lang)}>
          {t('products.servicesLink')}
          <Icon name="arrow" size={16} className="icon-arrow" />
        </Link>
      </p>
    </div>
  );
}

export function Contact() {
  const { t, lang } = useI18n();
  const doc = contact[lang];
  const postal = textValues(lang).postalAddress;
  return (
    <article className="public-page doc">
      <PageIntro title={doc.title} summary={doc.summary} />
      <Sections
        doc={doc}
        after={{
          write: <ContactMethods />,
        }}
      />
      {postal ? (
        <section className="doc-section" aria-labelledby="post-h">
          <h2 id="post-h">{t(INDIVIDUAL_OPERATOR ? 'org.correspondenceAddress' : 'org.address')}</h2>
          <p>
            <bdi>{postal}</bdi>
          </p>
        </section>
      ) : null}
      <RelatedPages />
    </article>
  );
}

export function Support() {
  const { lang } = useI18n();
  const to = useLegalPath();
  const doc = support[lang];
  return (
    <article className="public-page doc">
      <PageIntro title={doc.title} summary={doc.summary} />
      <Sections
        doc={doc}
        after={{
          deletion: (
            <p>
              <Link className="text-action" to={to('accountDeletion')}>
                <RichText text={accountDeletion[lang].title} />
                <Icon name="arrow" size={16} className="icon-arrow" />
              </Link>
            </p>
          ),
          security: (
            <p>
              <Link className="text-action" to={to('security')}>
                <RichText text={security[lang].title} />
                <Icon name="arrow" size={16} className="icon-arrow" />
              </Link>
            </p>
          ),
          contact: <ContactMethods />,
        }}
      />
      <RelatedPages />
    </article>
  );
}

export function Privacy() {
  const { lang } = useI18n();
  return <LegalView doc={privacy[lang]} after={{ contact: <ContactMethods /> }} />;
}

export function Terms() {
  const { lang } = useI18n();
  return <LegalView doc={terms[lang]} />;
}

export function AccountDeletion() {
  const { lang } = useI18n();
  return <LegalView doc={accountDeletion[lang]} />;
}

export function PrivacyChoices() {
  const { lang } = useI18n();
  return <LegalView doc={privacyChoices[lang]} after={{ contact: <ContactMethods /> }} />;
}

/** The publisher: who operates TSX-MR, as supplied — never more. Every policy is in the page's related pages. */
export function LegalNotice() {
  const { lang } = useI18n();
  return <LegalView doc={legalNotice[lang]} after={{ entity: <OrgDetails />, contact: <ContactMethods /> }} />;
}

export function Security() {
  const { lang } = useI18n();
  return <LegalView doc={security[lang]} />;
}

export function ApplicationStatus() {
  const { t, lang } = useI18n();
  const doc = applicationStatus[lang];
  return (
    <article className="public-page doc">
      <PageIntro title={doc.title} summary={doc.summary}>
        <div className="row">
          <Link className="btn btn-primary" to="/account">
            {t('login.cta')}
          </Link>
        </div>
      </PageIntro>
      <Sections doc={doc} />
    </article>
  );
}

export function Login() {
  const { t, lang } = useI18n();
  const doc = login[lang];
  return (
    <article className="public-page doc">
      <PageIntro title={doc.title} summary={doc.summary} />
      <Sections
        doc={doc}
        after={{
          owners: (
            <div className="row">
              <Link className="btn btn-primary" to="/account">
                {t('login.cta')}
              </Link>
              <Link className="btn" to={pathOf('applicationStatus', lang)}>
                {t('footer.applicationStatus')}
              </Link>
            </div>
          ),
        }}
      />
    </article>
  );
}
