import { Link } from 'react-router-dom';
import { RIYADE_NAME, riyade } from '../../content/riyade';
import { useI18n } from '../../i18n';
import { pathOf } from '../../site/routes';
import { Band } from './blocks';
import { Icon } from './icons';
import { RichText } from './RichText';

/**
 * Riyade, coming soon (the owner's brief of 2026-10-20): its name, one line, who makes it and its status, and nothing
 * else (`content/riyade.ts`). It has no approved logo, so its mark is its name set in type — the same letters and the
 * same face in every language — and its one picture is an abstract drawing of rings and points made of the site's own
 * colours. Dukan ERP keeps the larger presentation: Riyade is listed after it, with a lighter card and no feature.
 */

/** The name as a wordmark: no symbol, no invented logo; the same Latin letters on English, French and Arabic pages. */
export function RiyadeMark({ size }: { size: 'lg' | 'xl' }) {
  return <span className={`riyade-mark riyade-mark-${size}`}>{RIYADE_NAME}</span>;
}

/** "Coming soon", said in words — never by a colour alone — on every surface. `inline` inside a line of text or a link. */
export function RiyadeStatus({ inline = false }: { inline?: boolean }) {
  const { lang } = useI18n();
  const Tag = inline ? 'span' : 'p';
  return (
    <Tag className="riyade-status">
      <span className="riyade-status-dot" aria-hidden="true" />
      {riyade[lang].status}
    </Tag>
  );
}

/**
 * Rings around a centre, a few points on them and two quiet links between them: the "simply connected" of the line
 * under the name, drawn without a school, a screen or a word. Decorative, so hidden from assistive technology, and the
 * same in both directions. Its colours are the context's tokens (public.css), so it follows the band and the theme.
 */
export function RiyadeArt({ className }: { className?: string }) {
  return (
    <svg className={['riyade-art', className].filter(Boolean).join(' ')} viewBox="0 0 400 400" aria-hidden="true" focusable="false">
      <circle className="ra-ring ra-ring-3" cx="200" cy="200" r="168" />
      <circle className="ra-ring ra-ring-2" cx="200" cy="200" r="116" />
      <circle className="ra-ring ra-ring-1" cx="200" cy="200" r="64" />
      {/* Each point sits on its ring; the two links run from the centre outward, ring by ring. */}
      <path className="ra-link" d="M200 200 L245 155 L296 62" />
      <path className="ra-link" d="M200 200 L91 160 L55 284" />
      <circle className="ra-halo" cx="200" cy="200" r="30" />
      <circle className="ra-core" cx="200" cy="200" r="13" />
      <circle className="ra-node" cx="245" cy="155" r="8" />
      <circle className="ra-node" cx="296" cy="62" r="10" />
      <circle className="ra-node" cx="91" cy="160" r="9" />
      <circle className="ra-node" cx="55" cy="284" r="7" />
      <circle className="ra-node ra-node-quiet" cx="240" cy="309" r="7" />
      <circle className="ra-node ra-node-quiet" cx="362" cy="244" r="6" />
      <circle className="ra-node ra-node-quiet" cx="159" cy="249" r="5" />
    </svg>
  );
}

/**
 * The Products page's card: after Dukan ERP's, with the same parts in a lighter form — its mark as the heading, its line,
 * who makes it, its status and one secondary button to its page. No feature list, no contact or other action.
 */
export function RiyadeCard() {
  const { lang } = useI18n();
  const c = riyade[lang];
  return (
    <li className="card product-card riyade-card elevated" data-reveal="">
      <div className="riyade-card-copy">
        <h2>
          <RiyadeMark size="lg" />
        </h2>
        <p className="riyade-card-tagline">{c.tagline}</p>
        <p className="lead">
          <RichText text={c.attribution} />
        </p>
        <RiyadeStatus />
        <div className="row">
          <Link className="btn" to={pathOf('riyade', lang)}>
            {RIYADE_NAME}
            <Icon name="arrow" size={16} className="icon-arrow" />
          </Link>
        </div>
      </div>
      <RiyadeArt className="riyade-card-art" />
    </li>
  );
}

/**
 * On the home page, under the featured Dukan ERP card: one quiet row that leads to Riyade's page. The whole row is the
 * link, and its words are its name: Riyade, who makes it and for whom, coming soon.
 */
export function RiyadeRow() {
  const { lang } = useI18n();
  const c = riyade[lang];
  return (
    <Band tone="tint" className="band-follow" aria-labelledby="riyade-row-name">
      <div className="card riyade-row elevated" data-reveal="">
        <Link className="riyade-row-link" to={pathOf('riyade', lang)}>
          <span id="riyade-row-name" className="riyade-row-name">
            <RiyadeMark size="lg" />
          </span>
          <span className="riyade-row-text">
            <RichText text={c.attribution} />
          </span>
          <span className="riyade-row-end">
            <RiyadeStatus inline />
            <Icon name="arrow" size={18} className="icon-arrow" />
          </span>
        </Link>
      </div>
    </Band>
  );
}
