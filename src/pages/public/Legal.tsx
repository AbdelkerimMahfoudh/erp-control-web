import { Link } from 'react-router-dom';
import { about, accountDeletion, applicationStatus, contact, legalNotice, login, privacy, privacyChoices, products, security, support, terms } from '../../content';
import { useI18n } from '../../i18n';
import { pathOf } from '../../site/routes';
import { ContactAddresses, LegalLinks, LegalView, OrgDetails, PageIntro, ProductMark, Sections, useLegalPath } from '../../components/public/blocks';
import { RichText } from '../../components/public/RichText';

/**
 * The text pages of the public site (docs/74 §4): each renders its document from `content/`, so its words are the
 * same three-language structure the parity test checks; the company details and addresses come from the inputs.
 */

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

export function Products() {
  const { t, lang } = useI18n();
  const doc = products[lang];
  return (
    <div className="public-page">
      <PageIntro title={doc.title} summary={doc.summary} />
      <ul className="card-grid">
        {doc.sections.map((s) => (
          <li key={s.id} className="card product-card">
            <h2>
              <ProductMark />
            </h2>
            {s.blocks.map((b, i) =>
              b.kind === 'p' ? (
                <p key={i}>
                  <RichText text={b.text} />
                </p>
              ) : null,
            )}
            <Link className="btn btn-primary" to={pathOf('dukanErp', lang)}>
              {t('nav.dukanErp')}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Contact() {
  const { t, lang } = useI18n();
  const doc = contact[lang];
  return (
    <article className="public-page doc">
      <PageIntro title={doc.title} summary={doc.summary} />
      <Sections
        doc={doc}
        after={{
          write: (
            <>
              <h3>{t('contact.addresses')}</h3>
              <ContactAddresses />
            </>
          ),
        }}
      />
      <section className="doc-section" aria-labelledby="org-h">
        <h2 id="org-h">{t('org.title')}</h2>
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
              <Link to={to('accountDeletion')}>
                <RichText text={accountDeletion[lang].title} />
              </Link>
            </p>
          ),
          security: (
            <p>
              <Link to={to('security')}>
                <RichText text={security[lang].title} />
              </Link>
            </p>
          ),
          contact: <ContactAddresses />,
        }}
      />
    </article>
  );
}

export function Privacy() {
  const { lang } = useI18n();
  return <LegalView doc={privacy[lang]} after={{ contact: <ContactAddresses /> }} />;
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
  return <LegalView doc={privacyChoices[lang]} after={{ contact: <ContactAddresses /> }} />;
}

/** The publisher: who TSX-MR is, as it registered — never more than it supplied — and every policy. */
export function LegalNotice() {
  const { lang } = useI18n();
  return <LegalView doc={legalNotice[lang]} after={{ entity: <OrgDetails />, contact: <ContactAddresses />, policies: <LegalLinks /> }} />;
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
