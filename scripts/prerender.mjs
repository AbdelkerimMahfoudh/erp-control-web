// Writes the public site as static files (docs/74 §5), after `vite build` (the page) and `vite build --ssr` (this
// renderer), both in the same mode. Every public page in every language becomes its own HTML file with its own
// language, direction and head; the protected areas get an empty, never-indexed shell; robots, sitemap, the host's
// headers and rewrites, security.txt and the manifest are generated from the same inputs.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');
const ssr = await import(pathToFileURL(join(root, 'dist-ssr', 'entry-server.js')).href);
const template = readFileSync(join(dist, 'index.html'), 'utf8');
if (!template.includes('<!--app-->') || !template.includes('<!--head-->')) throw new Error('dist/index.html is not the unrendered template');

const write = (rel, content) => {
  const file = join(dist, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
};
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const page = (lang, head, app) =>
  template
    .replace('<html lang="en" dir="ltr">', `<html lang="${lang}" dir="${ssr.isRtl(lang) ? 'rtl' : 'ltr'}">`)
    .replace('<!--head-->', head)
    .replace('<!--app-->', app);

// 1. The shell of the protected areas: no content, never indexed (written before the home page replaces index.html).
//    A public build (docs/95) has no protected area, so no shell.
if (ssr.SURFACE === 'full') write(ssr.APP_SHELL.slice(1), page('en', `<title>${esc(ssr.SITE.displayName)}</title>\n    <meta name="robots" content="noindex, nofollow" />`, ''));

// 2. Every public page, in every language.
let pages = 0;
for (const lang of ssr.LANGUAGES) {
  for (const route of ssr.ROUTES) {
    const url = ssr.pathOf(route.id, lang);
    write(ssr.fileForPath(url), page(lang, ssr.headOf(route.id, lang), ssr.render(url, lang)));
    pages++;
  }
}

// 2b. The legal and support pages as the mobile app opens them: same texts, no navigation, never indexed.
for (const lang of ssr.LANGUAGES) {
  for (const id of ssr.IN_APP_ROUTE_IDS) {
    const url = ssr.inAppPathOf(id, lang);
    write(ssr.fileForPath(url), page(lang, ssr.headOf(id, lang, true), ssr.render(url, lang)));
    pages++;
  }
}

// 3. The page for any other address. Cloudflare Pages answers an address it has no file for with a 404 status and
//    the NEAREST 404.html up the address's directories, so there is one per language directory (`/fr/…` → fr/404.html)
//    and one per language for the app's pages (`/in-app/…` → in-app/404.html, which keeps their frame). Each is
//    rendered at an address of its own directory, so the page that hydrates it at the real address renders the same.
let notFound = 0;
for (const lang of ssr.LANGUAGES) {
  const prefix = lang === 'en' ? '' : `/${lang}`;
  const head = `<title>${esc(`${ssr.translate(lang, 'notFound.title')} — ${ssr.SITE.displayName}`)}</title>\n    <meta name="robots" content="noindex, nofollow" />`;
  for (const dir of [prefix, `${prefix}/in-app`]) {
    write(`${dir.slice(1)}${dir ? '/' : ''}404.html`, page(lang, head, ssr.render(`${dir}/404`, lang)));
    notFound++;
  }
}

// 4. The generated files.
const builtAt = new Date();
write('robots.txt', ssr.robotsTxt(ssr.SITE, ssr.IS_PREVIEW));
if (ssr.SITE.publicSiteOrigin) write('sitemap.xml', ssr.sitemapXml(ssr.SITE, builtAt.toISOString().slice(0, 10)));
write('_headers', ssr.headersFile(ssr.SITE, ssr.IS_PREVIEW));
write('_redirects', ssr.redirectsFile(ssr.SITE));
const security = ssr.securityTxt(ssr.SITE, builtAt);
if (security) write('.well-known/security.txt', security);
// The manifest's colours are the light theme's background and text (theme/tokens.css).
write('site.webmanifest', ssr.webManifest(ssr.SITE, '#172033', '#f7f8fb'));

console.log(`prerendered ${pages} pages and ${notFound} not-found pages (${ssr.LANGUAGES.length} languages), mode ${ssr.BUILD_MODE}, surface ${ssr.SURFACE}${ssr.IS_PREVIEW ? ' — PREVIEW: test values, noindex' : ''}`);
