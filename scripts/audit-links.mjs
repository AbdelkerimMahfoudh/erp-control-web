// Broken-link audit of the built site (docs/74 §9): every href and src in every prerendered page must resolve the way
// the host resolves it (a file, `<path>.html`, `<path>/index.html`, or a `_redirects` 200 rewrite); every in-page
// anchor must name an element of that page. External links are listed, not fetched. Exits 1 on any broken link.
//
//   node scripts/audit-links.mjs [dist]
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const dist = resolve(process.argv[2] ?? 'dist');
const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
const pages = walk(dist).filter((f) => f.endsWith('.html'));
const rewrites = existsSync(join(dist, '_redirects'))
  ? readFileSync(join(dist, '_redirects'), 'utf8').split('\n').filter(Boolean).map((l) => l.split(/\s+/)[0])
  : [];
const rewritten = (p) => rewrites.some((r) => (r.endsWith('/*') ? p === r.slice(0, -2) || p.startsWith(r.slice(0, -1)) : r === p));
const exists = (p) => {
  const clean = p.split('#')[0].split('?')[0];
  if (clean === '/') return existsSync(join(dist, 'index.html'));
  const rel = clean.replace(/^\//, '');
  return [rel, `${rel}.html`, join(rel, 'index.html')].some((c) => existsSync(join(dist, c)) && statSync(join(dist, c)).isFile()) || rewritten(clean);
};

const broken = [];
const external = new Set();
let checked = 0;
for (const file of pages) {
  const html = readFileSync(file, 'utf8');
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const url = m[1].replace(/&amp;/g, '&');
    checked++;
    if (/^(mailto:|tel:)/.test(url)) continue;
    if (/^https?:\/\//.test(url)) {
      external.add(url);
      continue;
    }
    if (url.startsWith('#')) {
      if (url.length > 1 && !ids.has(url.slice(1))) broken.push({ page: relative(dist, file), url, why: 'no element with this id' });
      continue;
    }
    if (url.startsWith('/') && !url.startsWith('//')) {
      if (!exists(url)) broken.push({ page: relative(dist, file), url, why: 'no file and no rewrite' });
      const hash = url.split('#')[1];
      if (hash) {
        const target = url.split('#')[0];
        const targetFile = [`${target.replace(/^\//, '')}.html`, target === '/' ? 'index.html' : ''].map((c) => join(dist, c)).find((c) => c !== dist && existsSync(c));
        if (targetFile && !readFileSync(targetFile, 'utf8').includes(`id="${hash}"`)) broken.push({ page: relative(dist, file), url, why: 'anchor not on the target page' });
      }
      continue;
    }
    broken.push({ page: relative(dist, file), url, why: 'relative URL (every link should be absolute-path)' });
  }
}
console.log(`pages ${pages.length}, links checked ${checked}, broken ${broken.length}`);
for (const b of broken) console.log(`BROKEN ${b.page}: ${b.url} — ${b.why}`);
console.log(`external links (${external.size}, listed, not fetched):`);
for (const e of [...external].sort()) console.log(`  ${e}`);
process.exit(broken.length ? 1 : 0);
