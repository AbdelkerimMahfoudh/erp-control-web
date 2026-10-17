import { Link } from 'react-router-dom';
import { homeFor } from '../../content';
import { SURFACE } from '../../config/site';
import { ComingSoon } from '../../components/ComingSoon';
import { useI18n } from '../../i18n';
import { pathOf } from '../../site/routes';
import { ProductMark } from '../../components/public/blocks';
import { RichText } from '../../components/public/RichText';
import { AccountLink } from '../../components/AccountLink';

/**
 * The TSX-MR home page (docs/74 §4): the organization first, then its product. Every sentence comes from
 * `content/home.ts`, in the page's language; every link stays in that language.
 */
export function Home() {
  const { lang } = useI18n();
  const c = homeFor(lang, SURFACE);
  const to = (id: Parameters<typeof pathOf>[0]) => pathOf(id, lang);
  return (
    <div className="public-page home">
      <section className="hero-band" aria-labelledby="hero-h">
        <h1 id="hero-h">
          <RichText text={c.hero.title} />
        </h1>
        <p className="lead">
          <RichText text={c.hero.lead} />
        </p>
        <div className="row">
          <Link className="btn btn-primary" to={to('dukanErp')}>
            <RichText text={c.hero.primary} />
          </Link>
          <Link className="btn" to={to('contact')}>
            <RichText text={c.hero.secondary} />
          </Link>
        </div>
      </section>

      <section className="product-feature" aria-labelledby="product-h">
        <p className="kicker">
          <RichText text={c.product.kicker} />
        </p>
        <h2 id="product-h">
          <ProductMark size="lg" />
        </h2>
        <p className="lead">
          <RichText text={c.product.lead} />
        </p>
        <ComingSoon />
        <Link className="btn btn-primary" to={to('dukanErp')}>
          <RichText text={c.product.cta} />
        </Link>
      </section>

      <section aria-labelledby="problems-h">
        <h2 id="problems-h">
          <RichText text={c.problems.title} />
        </h2>
        <ul className="card-grid">
          {c.problems.items.map((item) => (
            <li key={item.title} className="card">
              <h3>
                <RichText text={item.title} />
              </h3>
              <p>
                <RichText text={item.body} />
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="capabilities-h">
        <h2 id="capabilities-h">
          <RichText text={c.capabilities.title} />
        </h2>
        <p className="muted">
          <RichText text={c.capabilities.lead} />
        </p>
        <ul className="card-grid card-grid-3">
          {c.capabilities.items.map((item) => (
            <li key={item.title} className="card feature-card">
              <h3>
                <RichText text={item.title} />
              </h3>
              <p>
                <RichText text={item.body} />
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="split" aria-labelledby="security-h">
        <div>
          <h2 id="security-h">
            <RichText text={c.security.title} />
          </h2>
          <p className="muted">
            <RichText text={c.security.lead} />
          </p>
          <Link to={to('privacy')}>
            <RichText text={c.security.link} />
          </Link>
        </div>
        <ul className="check-list">
          {c.security.items.map((item) => (
            <li key={item}>
              <RichText text={item} />
            </li>
          ))}
        </ul>
      </section>

      <section className="card band" aria-labelledby="languages-h">
        <h2 id="languages-h">
          <RichText text={c.languages.title} />
        </h2>
        <p>
          <RichText text={c.languages.body} />
        </p>
        <p className="muted">
          <RichText text={c.languages.access} />
        </p>
      </section>

      <section className="cta-band" aria-labelledby="cta-h">
        <h2 id="cta-h">
          <RichText text={c.cta.title} />
        </h2>
        <p>
          <RichText text={c.cta.body} />
        </p>
        <div className="row">
          <AccountLink id="apply" lang={lang} className="btn btn-primary">
            <RichText text={c.cta.apply} />
          </AccountLink>
          <AccountLink id="login" lang={lang} className="btn">
            <RichText text={c.cta.signIn} />
          </AccountLink>
          <Link className="btn" to={to('contact')}>
            <RichText text={c.cta.contact} />
          </Link>
        </div>
      </section>
    </div>
  );
}
