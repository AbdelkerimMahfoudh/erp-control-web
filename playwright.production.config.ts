import base from './playwright.config';

/**
 * The public browser suite (e2e/public-site.spec.ts) against the deployed site instead of a local `dist/`: run with
 * `E2E_SURFACE=public E2E_BASE_URL=https://tsxmr.com` from a machine that can reach the domain
 * (.github/workflows/verify-production.yml). No local server; one retry absorbs a transient network error only. It sits
 * beside playwright.config.ts so the inherited relative paths (tests, output) resolve the same way.
 */
export default {
  ...base,
  use: { ...base.use, baseURL: process.env.E2E_BASE_URL ?? 'https://tsxmr.com' },
  webServer: undefined,
  retries: 1,
};
