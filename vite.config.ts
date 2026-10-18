import { fileURLToPath } from 'node:url';
import { loadEnv, type Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { formatProblems, gateOfSurface, readInputs, releaseProblems, surfaceOf, type BuildMode } from './src/config/schema';
import { publishedBlockers, publishedDrafts, publishedPlaceholders } from './src/content';

/**
 * The control website: the TSX-MR public site, the Owner account area and the Super Admin console (docs/68, docs/74).
 *
 * `VITE_API_BASE` points a build at the API; without it (a preview) the site talks to the API on its own hostname,
 * port 3010 — the administrator session cookie is `SameSite=Lax`, so a page on `localhost` talking to `127.0.0.1`
 * would be cross-site and the browser would withhold the cookie (docs/38).
 *
 * Modes: `production` (`npm run build`) refuses to build until every production input is real and every legal blocker
 * is resolved (`releaseGuard`); `preview` (`npm run build:preview`) builds with marked test values, a banner and
 * `noindex` everywhere.
 */
function releaseGuard(): Plugin {
  return {
    name: 'tsx-release-guard',
    apply: 'build',
    configResolved(config) {
      if (config.mode !== 'production') return;
      const env = loadEnv(config.mode, config.root, 'VITE_');
      // Each surface is its own gate (docs/96): a public build is the pre-launch website (PUBLIC_WEBSITE, its pre-launch
      // texts); a full or a portal build is the portal (PORTAL, the service's texts and every input).
      const surface = surfaceOf(env.VITE_SITE_SURFACE);
      const problems = releaseProblems(env, publishedBlockers(surface), { drafts: publishedDrafts(surface), placeholders: publishedPlaceholders(surface) });
      if (problems.length > 0) throw new Error(formatProblems(problems, gateOfSurface(surface)));
    },
  };
}

/*
 * The tests speak of "this browser's zone" as UTC, as CI's runners are: pinned here, before Vitest starts its workers,
 * so a developer in another zone gets the same results. The business-zone dates under test are formatted with explicit
 * zones and never depend on it.
 */
if (process.env.VITEST) process.env.TZ = 'UTC';

/**
 * A public build (`VITE_SITE_SURFACE=public`, docs/95) takes stubs in place of what needs the API, so none of it reaches
 * its bundle — not merely an unlinked route: the protected areas' routes, the API client (no address, no request), the
 * application form and the price table (docs/96). A portal build (`VITE_SITE_SURFACE=portal`, docs/101) takes the
 * reverse: a stub in place of the company site's pages, so none of them, and no link into them, reaches its bundle.
 */
function surfaceAliases(mode: string) {
  const surface = surfaceOf(loadEnv(mode, process.cwd(), 'VITE_').VITE_SITE_SURFACE);
  const stub = (path: string) => fileURLToPath(new URL(path, import.meta.url));
  if (surface === 'portal') return [{ find: /^\.\/public-areas$/, replacement: stub('./src/public-areas.portal.tsx') }];
  if (surface !== 'public') return [];
  return [
    { find: /^\.\/protected-areas$/, replacement: stub('./src/protected-areas.public.tsx') },
    { find: /^(\.{1,2}\/)+api\/client$/, replacement: stub('./src/api/client.public.ts') },
    { find: /^(\.{1,2}\/)+components\/PlanPricing$/, replacement: stub('./src/components/PlanPricing.public.tsx') },
    { find: /^\.\/pages\/public\/Apply$/, replacement: stub('./src/pages/public/Apply.public.tsx') },
  ];
}

/**
 * The inputs as this build reads them, computed here and inlined (`config/site.ts`), so the page carries its values
 * and not the table of rules and preview values that produced them: a production bundle holds no test value at all.
 */
function siteInputs(mode: string) {
  const buildMode: BuildMode = mode === 'production' || mode === 'development' || mode === 'test' ? mode : 'preview';
  return { __SITE_INPUTS__: JSON.stringify({ mode: buildMode, ...readInputs(loadEnv(mode, process.cwd(), 'VITE_'), buildMode) }) };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), releaseGuard()],
  resolve: { alias: surfaceAliases(mode) },
  define: siteInputs(mode),
  server: { port: 5173, host: '127.0.0.1' },
  preview: { port: 4173, host: '127.0.0.1' },
  build: { sourcemap: false, target: 'es2022' },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
    pool: 'threads',
  },
}));
