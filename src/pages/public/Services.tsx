import { Link } from 'react-router-dom';
import { brandFor } from '../../content';
import { useI18n } from '../../i18n';
import { pathOf } from '../../site/routes';
import { Band, PageIntro, ProductMark } from '../../components/public/blocks';
import { ContactCta, SERVICE_ICONS } from '../../components/public/brand';
import { Icon } from '../../components/public/icons';
import { RichText } from '../../components/public/RichText';

/**
 * The services TSX-MR offers to clients (the owner's brief of 2026-10-17, fourth): websites, mobile applications and
 * business tools, each with what it covers; what helps before getting in touch; and, set apart, the one product
 * TSX-MR builds as its own, so the work done for clients and the product are never confused. No client work is shown
 * until its owner allows it (docs/21).
 */
export function Services() {
  const { lang } = useI18n();
  const c = brandFor(lang);
  const page = c.servicesPage;
  return (
    <div className="public-page services">
      <PageIntro title={page.title} summary={page.summary}>
        <div className="row">
          <Link className="btn btn-primary btn-lg" to={pathOf('contact', lang)}>
            <span>
              <RichText text={c.hero.primary} />
            </span>
            <Icon name="arrow" size={18} className="icon-arrow" />
          </Link>
        </div>
      </PageIntro>

      <Band tone="light">
        <ul className="card-grid services-grid stagger">
          {c.services.items.map((item, i) => (
            <li key={item.title} className="card service-card elevated" data-reveal="">
              <span className="icon-badge">
                <Icon name={SERVICE_ICONS[i] ?? 'globe'} />
              </span>
              <h2>
                <RichText text={item.title} />
              </h2>
              <p>
                <RichText text={item.body} />
              </p>
              <ul className="check-list">
                {item.points.map((point) => (
                  <li key={point}>
                    <RichText text={point} />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </Band>

      <Band tone="tint" aria-labelledby="prepare-h">
        <div className="split services-split">
          <div>
            <h2 id="prepare-h">
              <RichText text={page.prepare.title} />
            </h2>
            <ul className="check-list">
              {page.prepare.items.map((item) => (
                <li key={item}>
                  <RichText text={item} />
                </li>
              ))}
            </ul>
          </div>
          <aside className="card own-product elevated" aria-labelledby="own-product-h">
            <h2 id="own-product-h" className="own-product-title">
              <RichText text={page.product.title} />
            </h2>
            <ProductMark />
            <p>
              <RichText text={page.product.body} />
            </p>
            <Link className="text-action" to={pathOf('dukanErp', lang)}>
              <RichText text={page.product.link} />
              <Icon name="arrow" size={16} className="icon-arrow" />
            </Link>
          </aside>
        </div>
      </Band>

      <ContactCta />
    </div>
  );
}
