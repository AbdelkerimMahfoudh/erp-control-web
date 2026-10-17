import { Link } from 'react-router-dom';
import { SITE, SURFACE } from '../../config/site';
import { dukanErpFor } from '../../content';
import { ComingSoon } from '../../components/ComingSoon';
import type { ActivityCard } from '../../content/dukan-erp';
import { useI18n } from '../../i18n';
import { pathOf } from '../../site/routes';
import { PlanPricing } from '../../components/PlanPricing';
import { AccountLink, accountHref } from '../../components/AccountLink';
import { Band, ProductMark, SectionHead } from '../../components/public/blocks';
import { Icon, type IconName } from '../../components/public/icons';
import { ProductVisual } from '../../components/public/ProductVisual';
import { RichText } from '../../components/public/RichText';

/**
 * The Dukan ERP product page (docs/74 §4; redesigned 2026-10-17): the product in its hero, its two activities kept
 * apart, what it is not (no provider integration), how a business starts, the mobile app, and — in a full build only —
 * the prices the server publishes (`GET platform/plan`, D140). The pre-launch website (docs/96) sells nothing.
 */
export function DukanErp() {
  const { t, lang } = useI18n();
  const c = dukanErpFor(lang, SURFACE);
  const accountLinks = accountHref('apply', lang) !== null;
  return (
    <div className="public-page product">
      <section className="band band-dark hero hero-product" aria-labelledby="product-h">
        <div className="container hero-grid">
          <div className="hero-copy">
            <ComingSoon />
            <h1 id="product-h">
              <ProductMark size="lg" />
            </h1>
            <p className="lead hero-lead">
              <RichText text={c.summary} />
            </p>
            <p className="hero-intro">
              <RichText text={c.intro} />
            </p>
            <div className="hero-actions">
              <AccountLink id="apply" lang={lang} className="btn btn-primary btn-lg">
                {t('page.apply.title')}
              </AccountLink>
              <AccountLink id="login" lang={lang} className="btn btn-ghost btn-lg">
                {t('nav.signIn')}
              </AccountLink>
              <Link className={accountLinks ? 'btn btn-ghost btn-lg' : 'btn btn-primary btn-lg'} to={pathOf('contact', lang)}>
                {t('nav.contact')}
                {accountLinks ? null : <Icon name="arrow" size={18} className="icon-arrow" />}
              </Link>
            </div>
          </div>
          <div className="hero-stage">
            <ProductVisual />
          </div>
        </div>
      </section>

      <Band tone="light" aria-labelledby="activities-h">
        <SectionHead id="activities-h" title={c.activitiesTitle} lead={c.activitiesLead} />
        <div className="activities stagger">
          <Activity card={c.retail} id="retail" icon="store" />
          <Activity card={c.agent} id="agent" icon="swap" />
        </div>
        <p className="either">
          <RichText text={c.either} />
        </p>
        <aside className="notice tone-info providers" aria-labelledby="providers-h">
          <h3 id="providers-h">
            <RichText text={c.providers.title} />
          </h3>
          <p>
            <RichText text={c.providers.body} />
          </p>
        </aside>
      </Band>

      <Band tone="tint" aria-labelledby="start-h">
        <SectionHead id="start-h" title={c.start.title} />
        <ol className="how-steps how-steps-light stagger">
          {c.start.steps.map((step, i) => (
            <li key={step} className="elevated" data-reveal="">
              <span className="step-num num">{i + 1}</span>
              {/* One element for the whole sentence: a value inside it (e.g. the organization's name) stays in the line. */}
              <p>
                <RichText text={step} />
              </p>
            </li>
          ))}
        </ol>
      </Band>

      <Band tone="light" aria-labelledby="app-h">
        <div className="split app-split">
          <div>
            <span className="icon-badge">
              <Icon name="phone" />
            </span>
            <h2 id="app-h">
              <RichText text={c.app.title} />
            </h2>
            <p className="lead">
              <RichText text={c.app.body} />
            </p>
            {SITE.appleAppStoreUrl || SITE.googlePlayUrl ? (
              <ul className="store-links">
                {SITE.appleAppStoreUrl ? (
                  <li>
                    <a href={SITE.appleAppStoreUrl} rel="noopener">
                      {t('app.store.apple')}
                    </a>
                  </li>
                ) : null}
                {SITE.googlePlayUrl ? (
                  <li>
                    <a href={SITE.googlePlayUrl} rel="noopener">
                      {t('app.store.google')}
                    </a>
                  </li>
                ) : null}
              </ul>
            ) : (
              <p className="muted">
                <RichText text={c.app.noStore} />
              </p>
            )}
          </div>
        </div>
      </Band>

      {/* The pre-launch website (docs/96) sells nothing: no subscription, no prices, and no request to the API. */}
      {SURFACE === 'public' ? null : (
        <Band tone="tint" aria-labelledby="subscription-h">
          <SectionHead id="subscription-h" title={c.subscription.title} lead={c.subscription.body} />
          <PlanPricing />
        </Band>
      )}
    </div>
  );
}

function Activity({ card, id, icon }: { card: ActivityCard; id: string; icon: IconName }) {
  return (
    <article className={`card activity activity-card activity-${id} elevated`} aria-labelledby={`${id}-h`} data-reveal="">
      <span className="icon-badge">
        <Icon name={icon} />
      </span>
      <h3 id={`${id}-h`}>
        <RichText text={card.title} />
      </h3>
      <p className="muted">
        <RichText text={card.lead} />
      </p>
      <ul className="check-list">
        {card.items.map((item) => (
          <li key={item}>
            <RichText text={item} />
          </li>
        ))}
      </ul>
    </article>
  );
}
