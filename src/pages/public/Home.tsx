import { Link } from 'react-router-dom';
import { homeFor } from '../../content';
import { SURFACE } from '../../config/site';
import { ComingSoon } from '../../components/ComingSoon';
import { useI18n } from '../../i18n';
import { LANGUAGE_LABELS, type Language } from '../../i18n/languages';
import { pathOf, type PublicRouteId } from '../../site/routes';
import { Band, SectionHead } from '../../components/public/blocks';
import { Icon, type IconName } from '../../components/public/icons';
import { ProductVisual } from '../../components/public/ProductVisual';
import { RichText } from '../../components/public/RichText';
import { AccountLink, accountHref } from '../../components/AccountLink';

/**
 * The TSX-MR home page (docs/74 §4; redesigned 2026-10-17): the product first — what it holds together, drawn in the
 * hero — then what it replaces, its six parts, the two activities, how it works, the screens, the three languages,
 * trust, and one call to action. Every sentence comes from `content/home.ts`, in the page's language; every link stays
 * in that language. Nothing here states a figure, a client or an availability the code does not have.
 */
const PROOF_ICONS: IconName[] = ['scan', 'check-circle', 'store'];
const PROBLEM_ICONS: IconName[] = ['notebook', 'messages', 'box', 'coins', 'lock'];
const CAPABILITY_ART = ['stock', 'sales', 'debts', 'cash', 'team', 'reports'] as const;
const PREVIEW_ART = ['sell', 'stock', 'close'] as const;
/** The language cards, in the order a Mauritanian reader meets them: Arabic, French, English. */
const LANGUAGE_CARDS: Language[] = ['ar', 'fr', 'en'];
const BAR_HEIGHTS = ['b40', 'b55', 'b48', 'b70', 'b62', 'b84', 'b100'];

export function Home() {
  const { lang } = useI18n();
  const c = homeFor(lang, SURFACE);
  const to = (id: PublicRouteId) => pathOf(id, lang);
  const accountLinks = accountHref('apply', lang) !== null;
  return (
    <div className="public-page home">
      <section className="band band-dark hero" aria-labelledby="hero-h">
        <div className="container hero-grid">
          <div className="hero-copy">
            <ComingSoon />
            <h1 id="hero-h" className="hero-title">
              <HeroTitle text={c.hero.title} />
            </h1>
            <p className="lead hero-lead">
              <RichText text={c.hero.lead} />
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary btn-lg" to={to('dukanErp')}>
                <span>
                  <RichText text={c.hero.primary} />
                </span>
                <Icon name="arrow" size={18} className="icon-arrow" />
              </Link>
              <Link className="btn btn-ghost btn-lg" to={to('contact')}>
                {/* One element for the sentence: the button's gap would otherwise split it around the inserted name. */}
                <span>
                  <RichText text={c.hero.secondary} />
                </span>
              </Link>
            </div>
          </div>
          <div className="hero-stage">
            <ProductVisual />
          </div>
        </div>
        {/* The three proofs as one row under the whole hero at desktop width, stacked on a phone. */}
        <ul className="container proofs">
          {c.proofs.map((proof, i) => (
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
        <SectionHead id="problems-h" title={c.problems.title} lead={c.problems.lead} />
        <ul className="problem-grid stagger">
          {c.problems.items.map((item, i) => (
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
        <SectionHead id="capabilities-h" title={c.capabilities.title} lead={c.capabilities.lead} />
        <ul className="bento stagger">
          {c.capabilities.items.map((item, i) => {
            const kind = CAPABILITY_ART[i] ?? 'reports';
            return (
              <li key={item.title} className={`tile tile-${kind} elevated`} data-reveal="">
                <h3>
                  <RichText text={item.title} />
                </h3>
                <p>
                  <RichText text={item.body} />
                </p>
                <TileArt kind={kind} v={c.visual} />
              </li>
            );
          })}
        </ul>
      </Band>

      <Band tone="light" aria-labelledby="activities-h">
        <SectionHead id="activities-h" title={c.activities.title} lead={c.activities.lead} />
        <div className="activities stagger">
          {[
            [c.activities.retail, 'store'],
            [c.activities.agent, 'swap'],
          ].map(([activity, icon]) => {
            const a = activity as typeof c.activities.retail;
            return (
              <article key={a.title} className="card activity elevated" data-reveal="">
                <span className="icon-badge">
                  <Icon name={icon as IconName} />
                </span>
                <h3>
                  <RichText text={a.title} />
                </h3>
                <p className="muted">
                  <RichText text={a.lead} />
                </p>
                <ul className="check-list">
                  {a.points.map((point) => (
                    <li key={point}>
                      <RichText text={point} />
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </Band>

      <Band tone="dark" className="how" aria-labelledby="how-h">
        <SectionHead id="how-h" title={c.how.title} lead={c.how.lead} />
        <ol className="how-steps stagger">
          {c.how.steps.map((step, i) => (
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

      <Band tone="light" aria-labelledby="previews-h">
        <SectionHead id="previews-h" title={c.previews.title} lead={c.previews.lead} />
        <ul className="previews stagger">
          {c.previews.items.map((item, i) => (
            <li key={item.title} className="card elevated" data-reveal="">
              <PreviewArt kind={PREVIEW_ART[i] ?? 'sell'} v={c.visual} />
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

      <Band tone="tint" aria-labelledby="local-h">
        <div className="local-grid">
          <div>
            <h2 id="local-h">
              <RichText text={c.local.title} />
            </h2>
            <p className="lead">
              <RichText text={c.local.body} />
            </p>
            <ul className="check-list">
              {c.local.points.map((point) => (
                <li key={point}>
                  <RichText text={point} />
                </li>
              ))}
            </ul>
          </div>
          <ul className="lang-cards stagger">
            {LANGUAGE_CARDS.map((l) => {
              const other = homeFor(l, SURFACE).visual;
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
              <RichText text={c.trust.title} />
            </h2>
            <p className="lead">
              <RichText text={c.trust.lead} />
            </p>
            <div className="row trust-links">
              <Link className="btn" to={to('privacy')}>
                <RichText text={c.trust.privacy} />
              </Link>
              <Link className="btn" to={to('security')}>
                <RichText text={c.trust.security} />
              </Link>
              <Link className="btn" to={to('support')}>
                <RichText text={c.trust.support} />
              </Link>
            </div>
          </div>
          <ul className="check-list trust-list">
            {c.trust.items.map((item) => (
              <li key={item}>
                <RichText text={item} />
              </li>
            ))}
          </ul>
        </div>
      </Band>

      <Band tone="dark" className="band-cta" aria-labelledby="cta-h">
        <div className="cta-grid">
          <div>
            <h2 id="cta-h">
              <RichText text={c.cta.title} />
            </h2>
            <p>
              <RichText text={c.cta.body} />
            </p>
          </div>
          <div className="hero-actions">
            <AccountLink id="apply" lang={lang} className="btn btn-primary btn-lg">
              <RichText text={c.cta.apply} />
            </AccountLink>
            <AccountLink id="login" lang={lang} className="btn btn-ghost btn-lg">
              <RichText text={c.cta.signIn} />
            </AccountLink>
            <Link className={accountLinks ? 'btn btn-ghost btn-lg' : 'btn btn-primary btn-lg'} to={to('contact')}>
              <span>
                <RichText text={c.cta.contact} />
              </span>
            </Link>
          </div>
        </div>
      </Band>
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

type Visual = ReturnType<typeof homeFor>['visual'];

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
