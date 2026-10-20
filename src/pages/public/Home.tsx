import { Link } from 'react-router-dom';
import { brandFor } from '../../content';
import { ComingSoon } from '../../components/ComingSoon';
import { useI18n } from '../../i18n';
import { pathOf, type PublicRouteId } from '../../site/routes';
import { Band, ProductMark, SectionHead } from '../../components/public/blocks';
import { BrandVisual, ClientWork, ContactCta, SERVICE_ICONS } from '../../components/public/brand';
import { DukanShowcase } from '../../components/public/DukanShowcase';
import { RiyadeRow } from '../../components/public/riyade';
import { Icon } from '../../components/public/icons';
import { RichText } from '../../components/public/RichText';

/**
 * The TSX-MR home page (the owner's brief of 2026-10-17, fourth): the brand first — an independent development brand
 * and what it builds for clients — then its own product, Dukan ERP, as a featured card that leads to the product's
 * page, with the phone showcase of its two activities (2026-10-18), Riyade under it as a coming-soon row (2026-10-20),
 * how a project runs, and one invitation to get in touch. The product's detail lives on its own page. Every sentence
 * comes from `content/brand.ts` (the showcase's from `content/dukan-demo.ts`, Riyade's from `content/riyade.ts`) in the
 * page's language; nothing here states a team, a client, a figure or a guarantee.
 */

export function Home() {
  const { lang } = useI18n();
  const c = brandFor(lang);
  const to = (id: PublicRouteId) => pathOf(id, lang);
  return (
    <div className="public-page home">
      <section className="band band-dark hero" aria-labelledby="hero-h">
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">
              <RichText text={c.hero.eyebrow} />
            </p>
            <h1 id="hero-h" className="hero-title">
              <HeroTitle text={c.hero.title} />
            </h1>
            <p className="lead hero-lead">
              <RichText text={c.hero.lead} />
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary btn-lg" to={to('contact')}>
                <span>
                  <RichText text={c.hero.primary} />
                </span>
                <Icon name="arrow" size={18} className="icon-arrow" />
              </Link>
              <Link className="btn btn-ghost btn-lg" to={to('services')}>
                <span>
                  <RichText text={c.hero.secondary} />
                </span>
              </Link>
            </div>
          </div>
          <div className="hero-stage">
            <BrandVisual />
          </div>
        </div>
      </section>

      <Band tone="light" aria-labelledby="services-h">
        <SectionHead id="services-h" title={c.services.title} lead={c.services.lead} />
        <ul className="card-grid services-grid stagger">
          {c.services.items.map((item, i) => (
            <li key={item.title} className="card service-card elevated" data-reveal="">
              <span className="icon-badge">
                <Icon name={SERVICE_ICONS[i] ?? 'globe'} />
              </span>
              <h3>
                <RichText text={item.title} />
              </h3>
              <p>
                <RichText text={item.body} />
              </p>
            </li>
          ))}
        </ul>
        <ClientWork />
        <p className="section-more">
          <Link className="text-action" to={to('services')}>
            <RichText text={c.services.more} />
            <Icon name="arrow" size={16} className="icon-arrow" />
          </Link>
        </p>
      </Band>

      <Band tone="tint" aria-labelledby="product-h">
        <article className="card featured-product elevated" data-reveal="">
          <div className="featured-copy">
            <p className="featured-eyebrow">
              <RichText text={c.product.eyebrow} />
            </p>
            <h2 id="product-h">
              <ProductMark size="lg" />
            </h2>
            <p className="lead">
              <RichText text={c.product.body} />
            </p>
            <ComingSoon />
            <Link className="btn btn-primary" to={to('dukanErp')}>
              <span>
                <RichText text={c.product.link} />
              </span>
              <Icon name="arrow" size={18} className="icon-arrow" />
            </Link>
          </div>
          <DukanShowcase />
        </article>
      </Band>
      {/* TSX-MR's second own product, coming soon: one quiet row under the featured one (2026-10-20). */}
      <RiyadeRow />

      <Band tone="light" aria-labelledby="process-h">
        <SectionHead id="process-h" title={c.process.title} lead={c.process.lead} />
        <ol className="how-steps how-steps-light how-steps-4 stagger">
          {c.process.steps.map((step, i) => (
            <li key={step.title} className="elevated" data-reveal="">
              <span className="step-num num">{i + 1}</span>
              <h3>
                <RichText text={step.title} />
              </h3>
              <p>
                <RichText text={step.body} />
              </p>
            </li>
          ))}
        </ol>
      </Band>

      <ContactCta />
    </div>
  );
}

/** The headline with its closing phrase highlighted: the text up to the dash, then the rest in the warm accent. */
function HeroTitle({ text }: { text: string }) {
  const at = text.indexOf(' — ');
  if (at < 0) return <RichText text={text} />;
  return (
    <>
      <RichText text={text.slice(0, at)} />
      {' — '}
      <em className="hl">
        <RichText text={text.slice(at + 3)} />
      </em>
    </>
  );
}
