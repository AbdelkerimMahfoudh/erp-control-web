/**
 * The prerenderer's entry (docs/74 §5): built with `vite build --ssr` in the same mode as the page, so it reads the
 * same inputs. `scripts/prerender.mjs` calls `render` for every public page in every language and writes the files
 * the host serves, with the generated robots, sitemap, headers and rewrites.
 */
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { App } from './app';
import { BUILD_MODE, FILLED_INPUTS, IS_PREVIEW, SITE } from './config/site';
import { I18nProvider } from './i18n';
import type { Language } from './i18n/languages';
import { ThemeProvider } from './theme/theme';
import { plainText, textValues } from './components/public/RichText';
import { headFor, headHtml } from './site/head';
import { metaFor } from './site/meta';
import { publicRoutesFor, type PublicRouteId } from './site/routes';

export { BUILD_MODE, IS_PREVIEW, SITE, FILLED_INPUTS };
export { LANGUAGES, isRtl } from './i18n/languages';
export { IN_APP_ROUTE_IDS, inAppPathOf, pathOf } from './site/routes';

/** What this build publishes (`schema.ts` SURFACES, docs/95), and so the public pages it prerenders. */
export const SURFACE = SITE.siteSurface === 'public' ? 'public' : 'full';
export const ROUTES = publicRoutesFor(SURFACE);
export { APP_SHELL, fileForPath, headersFile, redirectsFile, robotsTxt, securityTxt, sitemapXml, webManifest } from './site/generated';
export { translate } from './i18n';

export function render(url: string, lang: Language): string {
  return renderToString(
    <StrictMode>
      <I18nProvider fixed={lang}>
        <ThemeProvider>
          <StaticRouter location={url}>
            <App />
          </StaticRouter>
        </ThemeProvider>
      </I18nProvider>
    </StrictMode>,
  );
}

/** The head of a public page, as markup — or of its in-app variant: never indexed, the public page canonical. */
export function headOf(id: PublicRouteId, lang: Language, inApp = false): string {
  const meta = metaFor(id, lang);
  const values = textValues(lang);
  return headHtml(
    headFor({
      id,
      lang,
      title: plainText(meta.title, values),
      description: plainText(meta.description, values),
      site: SITE,
      filled: FILLED_INPUTS,
      preview: IS_PREVIEW,
      productName: 'Dukan ERP',
      inApp,
    }),
  );
}
