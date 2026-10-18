import base from './playwright.config';

/**
 * The website's own public browser suite (e2e/public-site.spec.ts, Chromium) against a deployed origin instead of a
 * local `dist/`: `E2E_SURFACE=public E2E_BASE_URL=https://…`. No local server; one retry absorbs a transient network
 * error only. As ops/verify-production's playwright.production.config.ts, copied beside playwright.config.ts.
 */
export default {
  ...base,
  use: { ...base.use, baseURL: process.env.E2E_BASE_URL },
  webServer: undefined,
  retries: 1,
};
