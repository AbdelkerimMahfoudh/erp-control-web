import { describe, expect, it } from 'vitest';
import { redirectsFile } from '../src/site/generated';

/** A portal build without the console never routes /admin (post-Build-4): the edge answers it 404, not the shell. */
describe('the portal’s routes', () => {
  it('a console-less portal build (production, customer-audit) does not route /admin; it still routes /claim', () => {
    const file = redirectsFile({ siteSurface: 'portal' } as never, true);
    expect(file).not.toMatch(/^\/admin/m);
    expect(file).toMatch(/^\/claim\/\* \S+ 200$/m);
    expect(file).toMatch(/^\/subscription\/\* \S+ 200$/m);
  });

  it('the password-protected preview keeps its console route', () => {
    expect(redirectsFile({ siteSurface: 'portal' } as never, false)).toMatch(/^\/admin\/\* \S+ 200$/m);
  });
});
