import { Link } from 'react-router-dom';
import { applicationStatus, documentsFor, homeFor, legalDocumentsFor, login } from '../../content';
import { ComingSoon } from '../../components/ComingSoon';
import { Icon, type IconName } from '../../components/public/icons';
import { SURFACE } from '../../config/site';
import { useI18n } from '../../i18n';
import { pathOf } from '../../site/routes';
import { ContactMethods, LegalLinks, LegalView, OrgDetails, PageIntro, ProductMark, Sections, useLegalPath, useOrgTitle } from '../../components/public/blocks';
import { RichText } from '../../components/public/RichText';

/**
 * The text pages of the public site (docs/74 §4): each renders its document from `content/`, so its words are the
 * same three-language structure the parity test checks; the company details and addresses come from the inputs.
 * A public build (docs/96) renders the pre-launch texts: nothing in them says an account or a process works today.
 */
const { about, contact, products, support } = documentsFor(SURFACE);
const { accountDeletion, legalNotice, privacy, privacyChoices, security, terms } = legalDocumentsFor(SURFACE);

export function About() {
  const { lang } = useI18n();
  const doc = about[lang];
  return (
    <article className="public-page doc">
      <PageIntro title={doc.title} summary={doc.summary} />
      <Sections doc={doc} after={{ details: <OrgDetails /> }} />
    </article>
  );
}

/** The six parts of Dukan ERP, as the home page names them, each with its icon (`content/home.ts` keeps their order). */
const CAPABILITY_ICONS: IconName[] = ['box', 'receipt', 'undo', 'wallet', 'users', 'file'];

export function Products() {
  const { t, lang } = useI18n();
  const doc = products[lang];
  const capabilities = homeFor(lang, SURFACE).capabilities.items;
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
    </div>
  );
}

export function Contact() {
  const { t, lang } = useI18n();
  const orgTitle = useOrgTitle();
  const doc = contact[lang];
  return (
    <article className="public-page doc">
      <PageIntro title={doc.title} summary={doc.summary} />
      <Sections
        doc={doc}
        after={{
          write: <ContactMethods />,
        }}
      />
      <section className="doc-section" aria-labelledby="org-h">
        <h2 id="org-h">{orgTitle}</h2>
        <OrgDetails />
      </section>
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

/** The publisher: who TSX-MR is, as it registered — never more than it supplied — and every policy. */
export function LegalNotice() {
  const { lang } = useI18n();
  return <LegalView doc={legalNotice[lang]} after={{ entity: <OrgDetails />, contact: <ContactMethods />, policies: <LegalLinks /> }} />;
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

export function NotFound() {
  const { t, lang } = useI18n();
  return (
    <article className="public-page doc">
      <header className="page-intro">
        <h1>{t('notFound.title')}</h1>
        <p className="lead">{t('notFound.body')}</p>
        <Link className="btn btn-primary" to={pathOf('home', lang)}>
          {t('notFound.home')}
        </Link>
      </header>
    </article>
  );
}
