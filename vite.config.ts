import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * The control website: public subscription site, Owner account area and
 * Super Admin console (docs/68). Built from scratch on 2026-10-05.
 *
 * `VITE_API_BASE` points a build at the API; without it the site talks to the
 * API on its own hostname, port 3010 — the administrator session cookie is
 * `SameSite=Lax`, so a page on `localhost` talking to `127.0.0.1` would be
 * cross-site and the browser would withhold the cookie (docs/38).
 */
export default defineConfig({
  plugins: [react()],
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
