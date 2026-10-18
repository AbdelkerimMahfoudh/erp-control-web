import { Link } from 'react-router-dom';
import { SITE, SURFACE } from '../../config/site';
import { dukanErpFor, dukanOverviewFor } from '../../content';
import { dukanDemo } from '../../content/dukan-demo';
import { ComingSoon } from '../../components/ComingSoon';
import type { ActivityCard } from '../../content/dukan-erp';
import { useI18n } from '../../i18n';
import { LANGUAGE_LABELS, type Language } from '../../i18n/languages';
import { pathOf, type PublicRouteId } from '../../site/routes';
import { PlanPricing } from '../../components/PlanPricing';
import { AccountLink, accountHref } from '../../components/AccountLink';
import { Band, ProductMark, SectionHead } from '../../components/public/blocks';
import { DukanShowcase } from '../../components/public/DukanShowcase';
import { Icon, type IconName } from '../../components/public/icons';
import { ProductVisual } from '../../components/public/ProductVisual';
import { RichText } from '../../components/public/RichText';

/**
 * The Dukan ERP product page (docs/74 §4; redesigned 2026-10-17): the product in its hero with its three proofs, what it
 * replaces, its six parts, its two activities kept apart and shown at work on the phone (the showcase, 2026-10-18),
 * what it is not (no provider integration), how a business starts, the screens, the mobile app, the three languages,
 * trust, and — in a full build only — the prices the server publishes (`GET platform/plan`, D140). The pre-launch
 * website (docs/96) sells nothing. Since the owner's brief of 2026-10-17 (fourth) the product's detail is here and
 * nowhere else: the home page introduces TSX-MR and features this page.
 */
const PROOF_ICONS: IconName[] = ['scan', 'check-circle', 'store'];
const PROBLEM_ICONS: IconName[] = ['notebook', 'messages', 'box', 'coins', 'lock'];
const CAPABILITY_ART = ['stock', 'sales', 'debts', 'cash', 'team', 'reports'] as const;
const PREVIEW_ART = ['sell', 'stock', 'close'] as const;
/** The language cards, in the order a Mauritanian reader meets them: Arabic, French, English. */
const LANGUAGE_CARDS: Language[] = ['ar', 'fr', 'en'];
const BAR_HEIGHTS = ['b40', 'b55', 'b48', 'b70', 'b62', 'b84', 'b100'];
export function DukanErp() {
  const { t, lang } = useI18n();
  const c = dukanErpFor(lang, SURFACE);
  const o = dukanOverviewFor(lang, SURFACE);
  const demo = dukanDemo[lang];
  const to = (id: PublicRouteId) => pathOf(id, lang);
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
        {/* The three proofs as one row under the whole hero at desktop width, stacked on a phone. */}
        <ul className="container proofs">
          {o.proofs.map((proof, i) => (
            <li key={proof.title}>
              <Icon name={PROOF_ICONS[i] ?? 'check-circle'} size={20} />
              <div>
                <strong>
                  <RichText text={proof.title} />
                </strong>
                <span>
                  <RichText text={proof.body} />
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <Band tone="light" aria-labelledby="problems-h">
        <SectionHead id="problems-h" title={o.problems.title} lead={o.problems.lead} />
        <ul className="problem-grid stagger">
          {o.problems.items.map((item, i) => (
            <li key={item.title} className="card elevated" data-reveal="">
              <span className="icon-badge">
                <Icon name={PROBLEM_ICONS[i] ?? 'box'} />
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
      </Band>

      <Band tone="tint" aria-labelledby="capabilities-h">
        <SectionHead id="capabilities-h" title={o.capabilities.title} lead={o.capabilities.lead} />
        <ul className="bento stagger">
          {o.capabilities.items.map((item, i) => {
            const kind = CAPABILITY_ART[i] ?? 'reports';
            return (
              <li key={item.title} className={`tile tile-${kind} elevated`} data-reveal="">
                <h3>
                  <RichText text={item.title} />
                </h3>
                <p>
                  <RichText text={item.body} />
                </p>
                <TileArt kind={kind} v={o.visual} />
              </li>
            );
          })}
        </ul>
      </Band>

      <Band tone="light" aria-labelledby="activities-h">
        <SectionHead id="activities-h" title={c.activitiesTitle} lead={c.activitiesLead} />
        <div className="activities stagger">
          <Activity card={c.retail} id="retail" icon="store" />
          <Activity card={c.agent} id="agent" icon="swap" />
        </div>
        <p className="either">
          <RichText text={c.either} />
        </p>
        <section className="product-showcase" aria-labelledby="showcase-h" data-reveal="">
          <h3 id="showcase-h">
            <RichText text={demo.title} />
          </h3>
          <p className="lead">
            <RichText text={demo.lead} />
          </p>
          <DukanShowcase />
        </section>
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

      <Band tone="light" aria-labelledby="previews-h">
        <SectionHead id="previews-h" title={o.previews.title} lead={o.previews.lead} />
        <ul className="previews stagger">
          {o.previews.items.map((item, i) => (
            <li key={item.title} className="card elevated" data-reveal="">
              <PreviewArt kind={PREVIEW_ART[i] ?? 'sell'} v={o.visual} />
              <div className="preview-body">
                <h3>
                  <RichText text={item.title} />
                </h3>
                <p>
                  <RichText text={item.body} />
                </p>
              </div>
            </li>
          ))}
        </ul>
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

      <Band tone="tint" aria-labelledby="local-h">
        <div className="local-grid">
          <div>
            <h2 id="local-h">
              <RichText text={o.local.title} />
            </h2>
            <p className="lead">
              <RichText text={o.local.body} />
            </p>
            <ul className="check-list">
              {o.local.points.map((point) => (
                <li key={point}>
                  <RichText text={point} />
                </li>
              ))}
            </ul>
          </div>
          <ul className="lang-cards stagger">
            {LANGUAGE_CARDS.map((l) => {
              const other = dukanOverviewFor(l, SURFACE).visual;
              return (
                <li key={l} lang={l} dir={l === 'ar' ? 'rtl' : 'ltr'} className="card lang-card elevated" data-reveal="">
                  <span className="lang-tag">{LANGUAGE_LABELS[l]}</span>
                  <strong>{other.drawerTitle}</strong>
                  <span>{other.drawerSub}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </Band>

      <Band tone="light" aria-labelledby="trust-h">
        <div className="trust-grid">
          <div>
            <h2 id="trust-h">
              <RichText text={o.trust.title} />
            </h2>
            <p className="lead">
              <RichText text={o.trust.lead} />
            </p>
            <div className="row trust-links">
              <Link className="btn" to={to('privacy')}>
                <RichText text={o.trust.privacy} />
              </Link>
              <Link className="btn" to={to('security')}>
                <RichText text={o.trust.security} />
              </Link>
              <Link className="btn" to={to('support')}>
                <RichText text={o.trust.support} />
              </Link>
            </div>
          </div>
          <ul className="check-list trust-list">
            {o.trust.items.map((item) => (
              <li key={item}>
                <RichText text={item} />
              </li>
            ))}
          </ul>
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

type Visual = ReturnType<typeof dukanOverviewFor>['visual'];

/** The small drawing in each capability tile: made of the site's own styles, with demo values. */
function TileArt({ kind, v }: { kind: (typeof CAPABILITY_ART)[number]; v: Visual }) {
  switch (kind) {
    case 'stock':
      return (
        <div className="art art-stock">
          <div className="barcode-wide" />
          <div className="code num">35 882 7</div>
          <div className="ok">
            <Icon name="check-circle" size={16} />
            <span>{v.imeiTitle}</span>
          </div>
        </div>
      );
    case 'sales':
      return (
        <div className="art art-bars">
          {BAR_HEIGHTS.map((h) => (
            <i key={h} className={h} />
          ))}
        </div>
      );
    case 'debts':
      return (
        <div className="art art-ledger">
          <div>
            <span>{v.owed}</span>
            <span className="num">12 500</span>
          </div>
          <div>
            <span>{v.returnsWord}</span>
            <span className="num">3</span>
          </div>
        </div>
      );
    case 'cash':
      return (
        <div className="art art-ledger">
          <div>
            <span>{v.expected}</span>
            <span className="num">312 000</span>
          </div>
          <div>
            <span>{v.countedLabel}</span>
            <span className="num">312 000</span>
          </div>
          <div className="diff">
            <span>{v.noDifference}</span>
            <span>✓</span>
          </div>
        </div>
      );
    case 'team':
      return (
        <div className="art art-team">
          <span className="avatars">
            <span>A</span>
            <span>M</span>
            <span>S</span>
            <span>K</span>
          </span>
          <span className="role-chips">
            {v.roles.map((role) => (
              <span key={role}>{role}</span>
            ))}
          </span>
        </div>
      );
    case 'reports':
      return (
        <div className="art art-files">
          <span className="file-chip">PDF</span>
          <span className="file-chip xlsx">XLSX</span>
          <span className="file-label">{v.closing}</span>
        </div>
      );
  }
}

/** The dark screen at the top of each preview card: a few rows of an ordinary day, demo values only. */
function PreviewArt({ kind, v }: { kind: (typeof PREVIEW_ART)[number]; v: Visual }) {
  switch (kind) {
    case 'sell':
      return (
        <div className="preview-art">
          {ROWS_SELL.map(([name, amount]) => (
            <div key={name} className="ui-row">
              <span>{name}</span>
              <span className="num">{amount}</span>
            </div>
          ))}
          <div className="ui-total">
            <span>{v.paidCash}</span>
            <span className="num">223 000</span>
          </div>
        </div>
      );
    case 'stock':
      return (
        <div className="preview-art">
          {ROWS_STOCK.map(([name, imei, state]) => (
            <div key={imei} className="ui-row">
              <span>
                {name} <span className="num muted-on-ink">{imei}</span>
              </span>
              <span className={state === 'sold' ? 'chip sold' : 'chip'}>{state === 'sold' ? v.sold : v.inStock}</span>
            </div>
          ))}
        </div>
      );
    case 'close':
      return (
        <div className="preview-art">
          <div className="ui-row">
            <span>{v.expected}</span>
            <span className="num">312 000</span>
          </div>
          <div className="ui-row">
            <span>{v.countedLabel}</span>
            <span className="num">312 000</span>
          </div>
          <div className="ui-total">
            <span>{v.noDifference}</span>
            <span>✓</span>
          </div>
        </div>
      );
  }
}

const ROWS_SELL: [string, string][] = [
  ['Smartphone · 128 GB', '185 000'],
  ['Wireless earbuds', '38 000'],
];
const ROWS_STOCK: [string, string, 'in' | 'sold'][] = [
  ['Smartphone · 128 GB', '···8827', 'in'],
  ['Smartphone · 256 GB', '···4410', 'sold'],
  ['Tablet · 64 GB', '···0193', 'in'],
];
