import { Link } from 'react-router-dom';
import { brandFor } from '../../content';
import { useI18n } from '../../i18n';
import { pathOf } from '../../site/routes';
import { Band } from './blocks';
import { Icon, type IconName } from './icons';
import { RichText } from './RichText';

/** The three services' icons, in the order `content/brand.ts` lists them: websites, mobile applications, business tools. */
export const SERVICE_ICONS: IconName[] = ['globe', 'phone', 'file'];

/**
 * The home page's hero drawing (the owner's brief of 2026-10-17, fourth): the three kinds of work side by side — a
 * browser window, a phone and a small dashboard — sketched in the site's own styles with no text, figure or client in
 * them, so it reads as "what TSX-MR builds" rather than one product's screen. Decorative for assistive technology: the
 * page's text says everything it shows.
 */
export function BrandVisual() {
  return (
    <div className="bv" aria-hidden="true">
      <div className="bv-site">
        <div className="bv-bar">
          <i />
          <i />
          <i />
          <span className="bv-url" />
        </div>
        <div className="bv-site-body">
          <span className="bv-line bv-w60 bv-strong" />
          <span className="bv-line bv-w80" />
          <span className="bv-line bv-w40" />
          <span className="bv-button" />
          <div className="bv-tiles">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
      <div className="bv-app">
        <div className="bv-app-screen">
          <span className="bv-line bv-w50 bv-strong" />
          <span className="bv-app-card" />
          <span className="bv-app-row" />
          <span className="bv-app-row" />
          <span className="bv-app-row" />
        </div>
      </div>
      <div className="bv-tool">
        <span className="bv-tool-ic">
          <Icon name="file" size={18} />
        </span>
        <div className="art-bars bv-bars">
          <i className="b40" />
          <i className="b62" />
          <i className="b55" />
          <i className="b84" />
          <i className="b70" />
          <i className="b100" />
        </div>
      </div>
    </div>
  );
}

/** The closing invitation of the home and Services pages: one action, to the contact page. */
export function ContactCta() {
  const { lang } = useI18n();
  const c = brandFor(lang).cta;
  return (
    <Band tone="dark" className="band-cta" aria-labelledby="cta-h">
      <div className="cta-grid">
        <div>
          <h2 id="cta-h">
            <RichText text={c.title} />
          </h2>
          <p>
            <RichText text={c.body} />
          </p>
        </div>
        <div className="hero-actions">
          <Link className="btn btn-primary btn-lg" to={pathOf('contact', lang)}>
            <span>
              <RichText text={c.action} />
            </span>
            <Icon name="arrow" size={18} className="icon-arrow" />
          </Link>
        </div>
      </div>
    </Band>
  );
}
