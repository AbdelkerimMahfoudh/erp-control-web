import { riyade } from '../../content/riyade';
import { useI18n } from '../../i18n';
import { RiyadeArt, RiyadeMark, RiyadeStatus } from '../../components/public/riyade';
import { RichText } from '../../components/public/RichText';

/**
 * Riyade's page (the owner's brief of 2026-10-20): a deliberately small announcement, not a product page. One navy band
 * with the name, its line, who makes it and its status, beside an abstract drawing — and nothing to do: no feature, no
 * screen, no price, no date, no sign-up, no waiting list, no documentation and no form. It reads the same without a
 * script, and its words are the approved copy in the page's language (`content/riyade.ts`).
 */
export function Riyade() {
  const { lang } = useI18n();
  const c = riyade[lang];
  return (
    <div className="public-page riyade-page">
      <section className="band band-dark hero riyade-hero" aria-labelledby="riyade-h">
        <div className="container hero-grid riyade-grid">
          <div className="hero-copy riyade-copy">
            <h1 id="riyade-h" className="riyade-title">
              <RiyadeMark size="xl" />
            </h1>
            <p className="riyade-tagline">{c.tagline}</p>
            <p className="lead riyade-lead">
              <RichText text={c.attribution} />
            </p>
            <RiyadeStatus />
          </div>
          <div className="hero-stage riyade-stage">
            <RiyadeArt />
          </div>
        </div>
      </section>
    </div>
  );
}
