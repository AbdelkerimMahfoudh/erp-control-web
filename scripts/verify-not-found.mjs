// The "Page not found" behaviour of a DEPLOYED site, checked over the network (the owner's brief of 2026-10-17): every
// unknown address answers with a 404 status — never a redirect home, never a 200 — and the body is the custom page in
// the address's language (the nearest 404.html: /fr/… → fr/404.html, /in-app/… → in-app/404.html with the app's frame);
// every file that page loads answers 200 from any depth; known pages still answer 200. Dependency-free (Node 22).
//
//   node scripts/verify-not-found.mjs <origin> <out.json>
//
// Rows marked `info` are recorded, not judged: what the host does there is its own rule (an address that is a
// directory, the error page's own address), so the record says it rather than this script guessing it.
import { writeFileSync } from 'node:fs';

const [origin, out] = process.argv.slice(2);
if (!/^https?:\/\/[^/]+$/.test(origin ?? '') || !out) {
  console.error('Usage: node scripts/verify-not-found.mjs https://<host> <out.json>');
  process.exit(2);
}

const TITLE = { en: 'Page not found', fr: 'Page introuvable', ar: 'الصفحة غير موجودة' };
const CASES = [
  { path: '/qx7-missing', status: 404, lang: 'en', frame: 'public' },
  { path: '/a/b/c/d/e/missing-deep', status: 404, lang: 'en', frame: 'public' },
  { path: '/fr/inexistante', status: 404, lang: 'fr', frame: 'public' },
  { path: '/fr/a/b/c', status: 404, lang: 'fr', frame: 'public' },
  { path: '/ar/x/y/z', status: 404, lang: 'ar', frame: 'public' },
  { path: '/ar/%D8%BA%D9%8A%D8%B1-%D9%85%D9%88%D8%AC%D9%88%D8%AF', status: 404, lang: 'ar', frame: 'public' },
  { path: '/account', status: 404, lang: 'en', frame: 'public' },
  { path: '/account/trial', status: 404, lang: 'en', frame: 'public' },
  { path: '/admin', status: 404, lang: 'en', frame: 'public' },
  { path: '/admin/businesses', status: 404, lang: 'en', frame: 'public' },
  { path: '/in-app/nope', status: 404, lang: 'en', frame: 'in-app' },
  { path: '/in-app/a/b', status: 404, lang: 'en', frame: 'in-app' },
  { path: '/fr/in-app/nope', status: 404, lang: 'fr', frame: 'in-app' },
  { path: '/ar/in-app/nope', status: 404, lang: 'ar', frame: 'in-app' },
  { path: '/missing?q=%3Cscript%3Ealert(1)%3C%2Fscript%3E', status: 404, lang: 'en', frame: 'public' },
  { path: '/', status: 200 },
  { path: '/about', status: 200 },
  { path: '/fr', status: 200 },
  { path: '/ar', status: 200 },
  { path: '/fr/privacy', status: 200 },
  { path: '/ar/terms', status: 200 },
  { path: '/products/dukan-erp', status: 200 },
  { path: '/in-app/privacy', status: 200 },
  { path: '/fr/in-app/support', status: 200 },
  { path: '/ar/in-app/legal', status: 200 },
  { path: '/in-app/', info: true },
  { path: '/fr/in-app', info: true },
  { path: '/404', info: true },
];

const results = [];
const assetStatus = new Map();
async function asset(url) {
  if (!assetStatus.has(url)) {
    try {
      assetStatus.set(url, (await fetch(url, { redirect: 'manual' })).status);
    } catch (e) {
      assetStatus.set(url, `error ${e.cause?.code ?? e.message}`);
    }
  }
  return assetStatus.get(url);
}

for (const c of CASES) {
  let status;
  let location = null;
  let body = '';
  try {
    const r = await fetch(origin + c.path, { redirect: 'manual' });
    status = r.status;
    location = r.headers.get('location');
    body = await r.text();
  } catch (e) {
    status = `error ${e.cause?.code ?? e.message}`;
  }
  const lang = body.match(/<html lang="([a-z]+)" dir="(ltr|rtl)"/);
  const h1 = body.match(/<h1[^>]*>([^<]*)</)?.[1] ?? null;
  const frame = body.includes('in-app-header') ? 'in-app' : 'public';
  const robots = body.match(/<meta name="robots" content="([^"]+)"/)?.[1] ?? null;
  const files = [...body.matchAll(/(?:src|href)="(\/(?:assets\/[^"]+|theme-boot\.js|fonts\/[^"]+))"/g)].map((m) => m[1]);
  const fileStatus = {};
  for (const f of files) fileStatus[f] = await asset(origin + f);
  const row = { path: c.path, status, location, lang: lang?.[1] ?? null, dir: lang?.[2] ?? null, h1, frame, robots, files: fileStatus, echoed: /alert\(1\)/.test(body) };
  const problems = [];
  if (!c.info) {
    if (status !== c.status) problems.push(`status ${status}, expected ${c.status}${location ? ` (location ${location})` : ''}`);
    for (const [f, s] of Object.entries(fileStatus)) if (s !== 200) problems.push(`${f} answered ${s}`);
    if (c.status === 404) {
      if (row.lang !== c.lang) problems.push(`lang ${row.lang}, expected ${c.lang}`);
      if (row.dir !== (c.lang === 'ar' ? 'rtl' : 'ltr')) problems.push(`dir ${row.dir}`);
      if (h1 !== TITLE[c.lang]) problems.push(`h1 "${h1}"`);
      if (frame !== c.frame) problems.push(`frame ${frame}, expected ${c.frame}`);
      if (robots !== 'noindex, nofollow') problems.push(`robots ${robots}`);
      if (row.echoed) problems.push('the query string was shown back');
      if (!files.length) problems.push('no stylesheet or script referenced');
    }
  }
  row.ok = c.info ? null : problems.length === 0;
  row.problems = problems;
  results.push(row);
  console.log(`${c.info ? 'INFO' : row.ok ? 'PASS' : 'FAIL'}  ${c.path}  ${status}${location ? ` → ${location}` : ''}  ${row.lang ?? '-'}/${row.dir ?? '-'}  ${frame}  ${h1 ?? ''}${problems.length ? `  — ${problems.join('; ')}` : ''}`);
}

writeFileSync(out, JSON.stringify({ origin, checkedAt: new Date().toISOString(), results }, null, 2));
const failed = results.filter((r) => r.ok === false).length;
console.log(`\n${results.filter((r) => r.ok).length} passed, ${failed} failed, ${results.filter((r) => r.ok === null).length} recorded (info) — ${origin}`);
process.exit(failed ? 1 : 0);
