import { Link } from 'react-router-dom';
import { SITE } from '../../config/site';
import { dukanErpFor } from '../../content';
import { SURFACE } from '../../config/site';
import { ComingSoon } from '../../components/ComingSoon';
import type { ActivityCard } from '../../content/dukan-erp';
import { useI18n } from '../../i18n';
import { pathOf } from '../../site/routes';
import { PlanPricing } from '../../components/PlanPricing';
import { AccountLink } from '../../components/AccountLink';
import { ProductMark } from '../../components/public/blocks';
import { RichText } from '../../components/public/RichText';

/**
 * The Dukan ERP product page (docs/74 §4): the platform, its two activities kept apart, what it is not (no provider
 * integration), how a business starts, and the prices the server publishes (`GET platform/plan`, D140).
 */
export function DukanErp() {
  const { t, lang } = useI18n();
  const c = dukanErpFor(lang, SURFACE);
  return (
    <div className="public-page">
      <header className="page-intro product-intro">
        <h1>
          <ProductMark size="lg" />
        </h1>
        <p className="lead">
          <RichText text={c.summary} />
        </p>
        <ComingSoon />
        <p>
          <RichText text={c.intro} />
        </p>
        <div className="row">
          <AccountLink id="apply" lang={lang} className="btn btn-primary">
            {t('page.apply.title')}
          </AccountLink>
          <AccountLink id="login" lang={lang} className="btn">
            {t('nav.signIn')}
          </AccountLink>
          <Link className="btn" to={pathOf('contact', lang)}>
            {t('nav.contact')}
          </Link>
        </div>
      </header>

      <section aria-labelledby="activities-h">
        <h2 id="activities-h">
          <RichText text={c.activitiesTitle} />
        </h2>
        <p className="muted">
          <RichText text={c.activitiesLead} />
        </p>
        <div className="card-grid">
          <Activity card={c.retail} id="retail" />
          <Activity card={c.agent} id="agent" />
        </div>
        <p>
          <RichText text={c.either} />
        </p>
        <aside className="notice tone-info" aria-labelledby="providers-h">
          <h3 id="providers-h">
            <RichText text={c.providers.title} />
          </h3>
          <p>
            <RichText text={c.providers.body} />
          </p>
        </aside>
      </section>

      <section aria-labelledby="start-h">
        <h2 id="start-h">
          <RichText text={c.start.title} />
        </h2>
        <ol className="steps">
          {c.start.steps.map((s) => (
            <li key={s}>
              {/* One grid cell for the whole sentence: a value inside it (e.g. the organization's name) must not become its own cell. */}
              <span>
                <RichText text={s} />
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="app-h">
        <h2 id="app-h">
          <RichText text={c.app.title} />
        </h2>
        <p>
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
      </section>

      {/* The pre-launch website (docs/96) sells nothing: no subscription, no prices, and no request to the API. */}
      {SURFACE === 'public' ? null : (
        <section aria-labelledby="subscription-h">
          <h2 id="subscription-h">
            <RichText text={c.subscription.title} />
          </h2>
          <p>
            <RichText text={c.subscription.body} />
          </p>
          <PlanPricing />
        </section>
      )}
    </div>
  );
}

function Activity({ card, id }: { card: ActivityCard; id: string }) {
  return (
    <article className={`card activity-card activity-${id}`} aria-labelledby={`${id}-h`}>
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
