import { defineConfig } from '@playwright/test';

/**
 * Browser checks of the built site (docs/74 §9), run in CI on Linux against `dist/` served the way Cloudflare Pages
 * serves it (scripts/serve-dist.mjs — the `_headers` CSP included). Evidence goes under `$EV` (the CI evidence
 * directory) or `e2e-output/` locally.
 */
const EV = process.env.EV ?? 'e2e-output';
// `E2E_SURFACE=public`: the pre-launch public website (e2e/public-site.spec.ts) against a public build;
// `E2E_SURFACE=portal`: the Dukan ERP portal (e2e/portal.spec.ts) against a portal build; otherwise the full site
// (e2e/site.spec.ts). Each against the `dist/` of its own build (docs/96, docs/101).
const SPECS: Record<string, RegExp> = { public: /public-site\.spec\.ts$/, portal: /portal\.spec\.ts$/ };

export default defineConfig({
  testDir: 'e2e',
  testMatch: SPECS[process.env.E2E_SURFACE ?? ''] ?? /(^|[\\/])site\.spec\.ts$/,
  outputDir: `${EV}/playwright-output`,
  timeout: 60_000,
  fullyParallel: true,
  workers: 4,
  reporter: [['list'], ['json', { outputFile: `${EV}/playwright-results.json` }]],
  use: { baseURL: 'http://127.0.0.1:4173', browserName: 'chromium' },
  webServer: { command: 'node scripts/serve-dist.mjs 4173', url: 'http://127.0.0.1:4173/', reuseExistingServer: false, timeout: 30_000 },
});
