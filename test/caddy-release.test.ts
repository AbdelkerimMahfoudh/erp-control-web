import { describe, expect, it } from 'vitest';
import { caddyRoutes, parseHeaders, parseRedirects } from '../scripts/caddy-rules.ts';
import { headersFile, redirectsFile } from '../src/site/generated';

/**
 * The private test console is served by Caddy on the production edge, not by Pages (D217; backend docs/100 §16): the
 * build's own `_headers` and `_redirects` are translated, never rewritten by hand, and anything the translation does
 * not understand is refused rather than dropped.
 */
describe('the build’s Pages rules as Caddy directives', () => {
  const headers = `/*
  Content-Security-Policy: default-src 'self'; connect-src 'self' https://api.tsxmr.com
  X-Robots-Tag: noindex, nofollow

/admin/*
  Cache-Control: no-store
  ! X-Frame-Options
`;
  const redirects = `/ /subscription 302
/admin /app-shell.html 200
/admin/* /app-shell.html 200
/account/* /subscription 301
`;

  it('reads every header block, detaches included', () => {
    expect(parseHeaders(headers)).toEqual([
      {
        path: '/*',
        set: [
          ['Content-Security-Policy', "default-src 'self'; connect-src 'self' https://api.tsxmr.com"],
          ['X-Robots-Tag', 'noindex, nofollow'],
        ],
        remove: [],
      },
      { path: '/admin/*', set: [['Cache-Control', 'no-store']], remove: ['X-Frame-Options'] },
    ]);
  });

  it('reads every redirect, a missing status being 302 as Pages reads it', () => {
    expect(parseRedirects(redirects)).toEqual([
      { from: '/', to: '/subscription', status: 302 },
      { from: '/admin', to: '/app-shell.html', status: 200 },
      { from: '/admin/*', to: '/app-shell.html', status: 200 },
      { from: '/account/*', to: '/subscription', status: 301 },
    ]);
    expect(parseRedirects('/x /y')).toEqual([{ from: '/x', to: '/y', status: 302 }]);
  });

  it('refuses what it cannot translate faithfully', () => {
    expect(() => parseRedirects('/blog/:slug /posts/:slug 301')).toThrow(/unsupported rule/);
    expect(() => parseRedirects('/a/* /b/:splat 301')).toThrow(/unsupported rule/);
    expect(() => parseRedirects('/a /b 404')).toThrow(/unsupported rule/);
    expect(() => parseRedirects('/a /b 302 Country=mr')).toThrow(/unsupported rule/);
    expect(() => parseHeaders('/*/admin\n  X: y\n')).toThrow(/unsupported path/);
    expect(() => parseHeaders('  X: y\n')).toThrow(/before any path/);
  });

  it('writes one route: headers on every answer, the first matching rule, a file, else the 404 page', () => {
    const out = caddyRoutes(parseHeaders(headers), parseRedirects(redirects));
    expect(out).toContain('\theader {\n\t\tContent-Security-Policy "default-src \'self\'; connect-src \'self\' https://api.tsxmr.com"');
    expect(out).toContain('\t@h1 path /admin/*\n\theader @h1 {\n\t\tCache-Control "no-store"\n\t\t-X-Frame-Options\n\t}');
    expect(out).toContain('\t@r0 path /\n\thandle @r0 {\n\t\tredir * /subscription 302\n\t}');
    expect(out).toContain('\t@r2 path /admin/*\n\thandle @r2 {\n\t\trewrite * /app-shell.html\n\t\tfile_server\n\t}');
    // Headers before any handler, rules in file order, then files, then the not-found page with its status.
    const at = (s: string) => out.indexOf(s);
    expect(at('header {')).toBeLessThan(at('handle @r0'));
    expect(at('handle @r0')).toBeLessThan(at('handle @r3'));
    expect(at('handle @r3')).toBeLessThan(at('handle @file'));
    expect(out).toMatch(/handle \{\n\t\trewrite \* \/404\.html\n\t\tfile_server \{\n\t\t\tstatus 404/);
  });

  it('translates the portal build’s own generated files whole', () => {
    // The generator's output for the portal surface: every line understood, nothing dropped.
    const portal = { apiBase: 'https://api.tsxmr.com/api/v1', siteSurface: 'portal' };
    const h = parseHeaders(headersFile(portal, true));
    const r = parseRedirects(redirectsFile(portal));
    expect(h.length).toBeGreaterThan(0);
    expect(r.some((x) => x.from === '/admin/*' && x.status === 200)).toBe(true);
    expect(() => caddyRoutes(h, r)).not.toThrow();
  });
});
