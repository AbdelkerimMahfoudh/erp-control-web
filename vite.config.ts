import { loadEnv, type Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { formatProblems, releaseProblems } from './src/config/schema';
import { publishedBlockers } from './src/content';

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
      const problems = releaseProblems(env, publishedBlockers());
      if (problems.length > 0) throw new Error(formatProblems(problems));
    },
  };
}

/*
 * The tests speak of "this browser's zone" as UTC, as CI's runners are: pinned here, before Vitest starts its workers,
 * so a developer in another zone gets the same results. The business-zone dates under test are formatted with explicit
 * zones and never depend on it.
 */
if (process.env.VITEST) process.env.TZ = 'UTC';

export default defineConfig({
  plugins: [react(), releaseGuard()],
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
});
