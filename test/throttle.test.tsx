import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ar } from '../src/i18n/ar';
import { en, type Catalogue } from '../src/i18n/en';
import { fr } from '../src/i18n/fr';
import { SLOW_WAIT, THROTTLED, mount, serve, useActivityHarness } from './activity-fixtures';

useActivityHarness();

/*
 * A request the API's rate limit refused. The limiter answers with no code and its class name for a sentence
 * ("ThrottlerException: Too Many Requests"), which every page showed under its error title, in every language. Every
 * limit the API sets counts one minute, so each page says, in its own words, to wait a minute. A refusal of the API's
 * own that carries a code — the console's code lock, fifteen minutes — keeps the server's sentence: "a minute" would be
 * untrue there.
 */
const LIMITER = /Throttler|Too Many Requests/i;

describe('a request the API’s rate limit refused', () => {
  for (const [name, cat, lang] of [
    ['English', en, 'en'],
    ['French', fr, 'fr'],
    ['Arabic', ar, 'ar'],
  ] as [string, Catalogue, string][]) {
    it(`in ${name}: the Owner’s sign-in says to wait a minute, in the page’s words — never the limiter’s`, async () => {
      localStorage.setItem('erp.web.language', lang);
      const sent = serve((url) => {
        if (url.endsWith('/platform/portal/session')) return { status: 401, body: { statusCode: 401, message: 'Unauthorized' } };
        if (url.endsWith('/platform/portal/sign-in')) return THROTTLED;
        return undefined;
      });
      mount('/subscription');
      const user = userEvent.setup();
      await user.type(await screen.findByLabelText(cat['account.identifier'], {}, SLOW_WAIT), 'owner@example.test');
      await user.type(screen.getByLabelText(cat['account.password']), 'a-long-password');
      await user.click(screen.getByRole('button', { name: cat['action.signIn'] }));
      expect(await screen.findByText(cat['error.tooManyRequests'], {}, SLOW_WAIT)).toBeTruthy();
      expect(document.body.textContent).not.toMatch(LIMITER);
      expect(screen.queryByText(cat['error.generic'])).toBeNull();
      expect(screen.queryByText(cat['account.signin.failed'])).toBeNull();
      expect(sent.filter((r) => r.url.endsWith('/platform/portal/sign-in'))).toHaveLength(1);
    });
  }

  it('the console’s sign-in says the same', async () => {
    serve((url) => (url.endsWith('/platform/admin/sign-in') ? THROTTLED : undefined));
    mount('/admin');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(en['admin.email'], {}, SLOW_WAIT), 'admin@example.test');
    await user.type(screen.getByLabelText(en['admin.password']), 'admin-password');
    await user.click(screen.getByRole('button', { name: en['action.signIn'] }));
    expect(await screen.findByText(en['error.tooManyRequests'], {}, SLOW_WAIT)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(LIMITER);
    expect(screen.queryByText(en['error.generic'])).toBeNull();
  });

  it('a refusal of the API’s own, with its code — the code lock — keeps the server’s sentence, never "a minute"', async () => {
    const locked = { status: 429, body: { statusCode: 429, code: 'mfa_locked', message: 'Too many wrong codes. Try again later.', retryAt: '2026-10-15T20:15:00.000Z' } };
    serve((url) => {
      if (url.endsWith('/platform/admin/sign-in')) return { body: { admin: { id: 'a1', email: 'admin@example.test', name: 'Admin' }, expiresAt: 'x', mfa: 'required' } };
      if (url.endsWith('/platform/admin/mfa/verify')) return locked;
      if (url.endsWith('/platform/admin/me')) return { status: 401, body: { code: 'mfa_required', message: 'Enter a code from your authenticator to continue.' } };
      return undefined;
    });
    mount('/admin');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(en['admin.email'], {}, SLOW_WAIT), 'admin@example.test');
    await user.type(screen.getByLabelText(en['admin.password']), 'admin-password');
    await user.click(screen.getByRole('button', { name: en['action.signIn'] }));
    await user.type(await screen.findByLabelText(en['admin.mfa.code'], {}, SLOW_WAIT), '123456');
    await user.click(screen.getByRole('button', { name: en['admin.mfa.verify'] }));
    expect(await screen.findByText('Too many wrong codes. Try again later.', {}, SLOW_WAIT)).toBeTruthy();
    expect(screen.getByText(en['error.generic'])).toBeTruthy();
    expect(screen.queryByText(en['error.tooManyRequests'])).toBeNull();
  });
});
