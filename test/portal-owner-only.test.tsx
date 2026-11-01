import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The production portal, https://dukan.tsxmr.com, serves Owners only (D227). A preview build keeps the console for the
 * password-protected test site; a production portal build swaps it out at build time.
 */
const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

describe('the production portal has no console', () => {
  it('its routes import nothing of the console and name no /admin route', () => {
    const owner = read('src/protected-areas.owner.tsx');
    expect(owner).not.toMatch(/pages\/admin/);
    expect(owner).not.toMatch(/path="\/admin/);
    expect(owner).toMatch(/PortalNotFound/);
  });

  it('a production portal build takes those routes; a preview build does not', () => {
    const config = read('vite.config.ts');
    expect(config).toMatch(/mode === 'production'[\s\S]*protected-areas\.owner\.tsx/);
  });

  it('the bundle audit refuses a production portal build that carries the console', () => {
    // Read whole: this script's patterns contain what the comment stripper would eat.
    expect(readFileSync(join(process.cwd(), 'scripts/audit-bundle.mjs'), 'utf8')).toContain("portalSurface && !preview && /platform\/admin/");
  });
});
