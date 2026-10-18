import { defineConfig, devices } from '@playwright/test';

/**
 * verify/e2e-preview in WebKit, under two iPhone profiles and desktop Safari (.github/workflows/verify-preview.yml).
 * `PREVIEW_ORIGIN=local` serves the commit's own production build on the runner (scripts/serve-dist.mjs, `_headers`
 * included); an https origin points the same checks at the deployed preview. Copied into the website checkout, beside
 * its playwright.config.ts, so the relative paths resolve the same way.
 */
const ORIGIN = process.env.PREVIEW_ORIGIN ?? 'local';
const LOCAL = ORIGIN === 'local';
const EV = process.env.EV ?? 'webkit-evidence';

export default defineConfig({
  testDir: 'e2e-preview',
  outputDir: `${EV}/webkit-output`,
  timeout: 120_000,
  fullyParallel: true,
  workers: 3,
  retries: LOCAL ? 0 : 1,
  reporter: [['list'], ['json', { outputFile: `${EV}/webkit-results.json` }]],
  use: { baseURL: LOCAL ? 'http://127.0.0.1:4173' : ORIGIN },
  webServer: LOCAL ? { command: 'node scripts/serve-dist.mjs 4173', url: 'http://127.0.0.1:4173/', reuseExistingServer: false, timeout: 30_000 } : undefined,
  projects: [
    { name: 'webkit-iphone-17', use: { ...devices['iPhone 17'] } },
    { name: 'webkit-iphone-se-3', use: { ...devices['iPhone SE (3rd gen)'] } },
    { name: 'webkit-desktop-safari', use: { ...devices['Desktop Safari'], viewport: { width: 1280, height: 900 } } },
  ],
});
