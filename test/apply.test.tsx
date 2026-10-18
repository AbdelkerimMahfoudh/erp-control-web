import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ar } from '../src/i18n/ar';
import { en, type Catalogue } from '../src/i18n/en';
import { fr } from '../src/i18n/fr';
import { PLAN_V3, SLOW_WAIT, THROTTLED, mount, serve, useActivityHarness, type Handler } from './activity-fixtures';

useActivityHarness();

/*
 * The application's refusals and retries (2026-10-15; the WhatsApp number required since 2026-10-18, docs/101): every
 * contact given at registration must be verified, so the server refuses before saving anything when any of them cannot
 * receive its code now (C10); and one attempt keeps one idempotency key — a retry is replayed — while a form changed
 * since is a new attempt with a new key (the twin of the app's R5-7). The server accepts keys of
 * /^[A-Za-z0-9._:-]{1,80}$/ only (C11): the page's are UUIDs.
 */
const SERVER_KEY = /^[A-Za-z0-9._:-]{1,80}$/;

/** A test that types the form key by key, which a busy machine slows several times over, has fifteen seconds. */
const FILLING = 15_000;

const verifying = {
  status: 201,
  body: {
    status: 'pending',
    created: true,
    publicStoreId: 'ST-7Q4K',
    activity: 'electronics',
    verification: { destination: 'o•••@example.test', channel: 'email' },
    continuation: { token: 'continuation-for-tests', expiresAt: '2026-10-15T10:00:00.000Z', expiresInSeconds: 900 },
    next: 'verify_contact',
  },
};
const unavailable = (named?: string[]) => ({
  status: 503,
  body: { statusCode: 503, code: 'registration_unavailable', message: 'Registration is not available right now.', ...(named ? { unavailableContacts: named } : {}) },
});

function apply(register: Handler) {
  const sent = serve((url, body) => {
    if (url.endsWith('/platform/plan')) return { body: PLAN_V3 };
    if (url.endsWith('/platform/register')) return register(url, body);
    return undefined;
  });
  mount('/apply');
  const registrations = () => sent.filter((r) => r.url.endsWith('/platform/register')).map((r) => r.body as Record<string, string>);
  return registrations;
}

/** The form filled in: the WhatsApp number always (it is required), an email address when one is given. */
async function fill(contacts: { email?: string; phone?: string } = {}) {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText('Your name', {}, SLOW_WAIT), 'Aminetou');
  await user.type(screen.getByLabelText('Business name'), 'Boutique Test');
  await user.type(screen.getByLabelText('First store name'), 'Centre');
  await user.type(screen.getByLabelText(/WhatsApp number/), contacts.phone ?? '+22212345678');
  if (contacts.email) await user.type(screen.getByLabelText(/Email address/), contacts.email);
  await user.type(screen.getByLabelText(/^Password/), 'a-long-password');
  await user.click(screen.getByRole('radio', { name: /Electronics store/ }));
  return user;
}

describe('Apply: the WhatsApp number is required, an email address optional (docs/101)', () => {
  it('without the WhatsApp number nothing is sent, and the page says what is missing', async () => {
    const registrations = apply(() => verifying);
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Your name', {}, SLOW_WAIT), 'Aminetou');
    await user.type(screen.getByLabelText('Business name'), 'Boutique Test');
    await user.type(screen.getByLabelText('First store name'), 'Centre');
    await user.type(screen.getByLabelText(/Email address/), 'owner@example.test');
    await user.type(screen.getByLabelText(/^Password/), 'a-long-password');
    await user.click(screen.getByRole('radio', { name: /Electronics store/ }));
    await user.click(screen.getByRole('button', { name: 'Send my application' }));
    expect(await screen.findByText(en['apply.error.contact'], {}, SLOW_WAIT)).toBeTruthy();
    expect(registrations()).toEqual([]);
  }, FILLING);

  it('the WhatsApp number alone is an application; an email address goes with it when given', async () => {
    const registrations = apply(() => verifying);
    const user = await fill({ email: 'owner@example.test' });
    await user.click(screen.getByRole('button', { name: 'Send my application' }));
    expect(await screen.findByLabelText('Verification code', {}, SLOW_WAIT)).toBeTruthy();
    expect(registrations()[0]).toMatchObject({ phone: '+22212345678', email: 'owner@example.test' });
  }, FILLING);
});

describe('Apply: a contact whose code cannot be sent now (C10)', () => {
  it.each([
    ['the WhatsApp number', {}, ['phone']],
    ['the email', { email: 'owner@example.test' }, ['email']],
    ['both', { email: 'owner@example.test' }, ['email', 'phone']],
    ['none named', {}, undefined],
  ] as const)('the general refusal, nothing saved: %s', async (_case, contacts, named) => {
    apply(() => unavailable(named ? [...named] : undefined));
    const user = await fill(contacts);
    await user.click(screen.getByRole('button', { name: 'Send my application' }));
    expect(await screen.findByText(en['apply.unavailable.title'], {}, SLOW_WAIT)).toBeTruthy();
    expect(screen.getByText(en['apply.unavailable.body'])).toBeTruthy();
  }, FILLING);
});

describe('Apply: one attempt, one key (C11; the app’s R5-7)', () => {
  it('a retry of the same form keeps its key, so the server replays; a corrected field is a new attempt with a new key', async () => {
    let calls = 0;
    const registrations = apply(() => {
      calls += 1;
      if (calls === 1) throw new TypeError('Failed to fetch');
      return calls === 2 ? { status: 502, body: { message: 'Bad gateway' } } : verifying;
    });
    const user = await fill({ email: 'owner@example.test' });
    await user.click(screen.getByRole('button', { name: 'Send my application' }));
    expect(await screen.findByText(en['error.network'], {}, SLOW_WAIT)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Send my application' }));
    expect(await screen.findByText(en['error.generic'], {}, SLOW_WAIT)).toBeTruthy();
    await user.type(screen.getByLabelText('Business name'), ' Ksar');
    await user.click(screen.getByRole('button', { name: 'Send my application' }));
    expect(await screen.findByLabelText('Verification code', {}, SLOW_WAIT)).toBeTruthy();
    const keys = registrations().map((b) => b.idempotencyKey);
    expect(keys).toHaveLength(3);
    expect(keys[1]).toBe(keys[0]);
    expect(keys[2]).not.toBe(keys[0]);
    expect(registrations()[2]).toMatchObject({ businessName: 'Boutique Test Ksar' });
    for (const key of keys) expect(key).toMatch(SERVER_KEY);
  }, FILLING);
});

/*
 * The code check after a confirmation that got no answer (the website's twin of R2-1 / C14; the app's 5e7fe7e): the
 * server may have made the account with that code and spent it, and it refuses a registration it has already finished
 * exactly as it refuses a wrong code — one 400, "That code did not match." — so that code refused again is never called
 * wrong. The page says the account may be ready and offers sign-in, for as long as it is open. Any other code refused
 * is wrong, said in the page's own words in every language — never the server's English sentence.
 */
describe('Apply: a code check that got no answer is never called a wrong code (R2-1 / C14 on the website)', () => {
  const SERVER_WRONG = 'That code did not match.';
  const refused = { status: 400, body: { statusCode: 400, message: SERVER_WRONG, error: 'Bad Request' } };
  const session = { body: { accessToken: 'new-owner-session', refreshToken: 'refresh-for-tests', expiresIn: 900 } };
  const LANGS = [
    ['English', en, ''],
    ['French', fr, '/fr'],
    ['Arabic', ar, '/ar'],
  ] as const;
  const literally = (text: string) => new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  /**
   * An answer whose status arrived and whose body was cut off on its way: a success — the account made, its session
   * issued — that the page never got to read, or a refusal whose words never came.
   */
  const cutOff = (status: number, start: string) =>
    new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(start));
          controller.error(new TypeError('network error'));
        },
      }),
      { status, headers: { 'Content-Type': 'application/json' } },
    );

  /**
   * The application in the address's language, filled and sent, at its code check; each confirmation answered by
   * `confirm`, and each request for a new code by `resend` when one is given.
   */
  async function atCodeCheck(
    cat: Catalogue,
    prefix: string,
    confirm: (code: string) => { status?: number; body: unknown } | Response,
    resend?: () => { status?: number; body: unknown },
  ) {
    const sent = serve((url, body) => {
      if (url.endsWith('/platform/plan')) return { body: PLAN_V3 };
      if (url.endsWith('/platform/register')) return verifying;
      if (url.endsWith('/platform/register/verify/confirm')) return confirm((body as { code: string }).code);
      if (url.endsWith('/platform/register/verify/start') && resend) return resend();
      return undefined;
    });
    mount(`${prefix}/apply`);
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(cat['apply.owner'], {}, SLOW_WAIT), 'Aminetou');
    await user.type(screen.getByLabelText(cat['apply.business']), 'Boutique Test');
    await user.type(screen.getByLabelText(cat['apply.branch']), 'Centre');
    await user.type(screen.getByLabelText(literally(cat['apply.phone'])), '+22212345678');
    await user.type(screen.getByLabelText(new RegExp(`^${literally(cat['apply.password']).source}`)), 'a-long-password');
    await user.click(screen.getByRole('radio', { name: literally(cat['activity.electronics']) }));
    await user.click(screen.getByRole('button', { name: cat['apply.submit'] }));
    const form = (await screen.findByLabelText(cat['apply.verify.code'], {}, SLOW_WAIT)).closest('form')!;
    /** Types `code` in place of what the field holds and confirms it; resolves once the page has the answer. */
    const confirmCode = async (code: string) => {
      const field = within(form).getByLabelText(cat['apply.verify.code']);
      await user.clear(field);
      await user.type(field, code);
      const button = within(form).getByRole('button', { name: cat['apply.verify.submit'] }) as HTMLButtonElement;
      await user.click(button);
      await waitFor(() => expect(button.disabled).toBe(false), SLOW_WAIT);
    };
    const confirmations = () => sent.filter((r) => r.url.endsWith('/platform/register/verify/confirm')).map((r) => (r.body as { code: string }).code);
    const resends = () => sent.filter((r) => r.url.endsWith('/platform/register/verify/start')).length;
    return { form, user, confirmCode, confirmations, resends };
  }

  /**
   * What the code check says now: the lost answer's notice and its sign-in, whether a code is called wrong in the page's
   * words, and whether the server's own sentence shows anywhere else (in English the page's sentence begins with it).
   */
  function said(form: HTMLElement, cat: Catalogue) {
    const text = form.textContent!;
    const signIn = within(form).queryByRole('link', { name: cat['action.signIn'] });
    return {
      lost: within(form).queryByText(cat['apply.verify.lost']) !== null,
      signIn: signIn?.getAttribute('href') ?? null,
      wrong: text.includes(cat['apply.verify.wrong']),
      serverEnglish: text.replace(cat['apply.verify.wrong'], '').includes(SERVER_WRONG),
    };
  }

  it.each([
    ['the network failed', () => new TypeError('Failed to fetch')],
    ['the request was aborted', () => new DOMException('The operation was aborted.', 'AbortError')],
    ['the request timed out', () => new DOMException('The operation timed out.', 'TimeoutError')],
  ])('no answer (%s), then the same code refused: never "That code did not match." — the account may be ready, sign in', async (_case, failure) => {
    let calls = 0;
    const { form, confirmCode, confirmations } = await atCodeCheck(en, '', () => {
      calls += 1;
      if (calls === 1) throw failure();
      return refused;
    });
    await confirmCode('123456');
    // Not "the server could not be reached": it may well have been, and made the account.
    expect(said(form, en)).toEqual({ lost: true, signIn: '/subscription', wrong: false, serverEnglish: false });
    expect(form.textContent).not.toContain(en['error.network']);
    await confirmCode('123456');
    expect(said(form, en)).toEqual({ lost: true, signIn: '/subscription', wrong: false, serverEnglish: false });
    expect(form.textContent).not.toContain('did not match');
    expect(confirmations()).toEqual(['123456', '123456']);
  }, FILLING);

  for (const [name, cat, prefix] of LANGS) {
    it(`in ${name}: after a lost answer that code is never wrong, another code refused is — in the page’s own words — and sign-in stays offered`, async () => {
      let calls = 0;
      const { form, confirmCode, confirmations } = await atCodeCheck(cat, prefix, () => {
        calls += 1;
        if (calls === 1) throw new TypeError('Failed to fetch');
        return refused;
      });
      await confirmCode('123456');
      expect(said(form, cat)).toEqual({ lost: true, signIn: '/subscription', wrong: false, serverEnglish: false });
      // The same code again: refused as a finished registration is — still not wrong.
      await confirmCode('123456');
      expect(said(form, cat)).toEqual({ lost: true, signIn: '/subscription', wrong: false, serverEnglish: false });
      // Another code refused is wrong, in this language; the way to sign in stays.
      await confirmCode('654321');
      expect(said(form, cat)).toEqual({ lost: true, signIn: '/subscription', wrong: true, serverEnglish: false });
      // And the first code once more: never wrong, whatever came between.
      await confirmCode('123456');
      expect(said(form, cat)).toEqual({ lost: true, signIn: '/subscription', wrong: false, serverEnglish: false });
      expect(confirmations()).toEqual(['123456', '123456', '654321', '123456']);
    }, FILLING);

    it(`in ${name}: a success that came back without its body is an answer lost — the account may be ready, sign in — and that code refused again is never wrong`, async () => {
      let calls = 0;
      const { form, confirmCode, confirmations } = await atCodeCheck(cat, prefix, () => {
        calls += 1;
        return calls === 1 ? cutOff(200, '{"accessToken":"new-owner-se') : refused;
      });
      await confirmCode('123456');
      expect(said(form, cat)).toEqual({ lost: true, signIn: '/subscription', wrong: false, serverEnglish: false });
      expect(form.textContent).not.toContain(cat['error.generic']);
      await confirmCode('123456');
      expect(said(form, cat)).toEqual({ lost: true, signIn: '/subscription', wrong: false, serverEnglish: false });
      expect(form.textContent).not.toContain(cat['error.generic']);
      expect(confirmations()).toEqual(['123456', '123456']);
    }, FILLING);

    it(`in ${name}: a wrong code with every answer received is said in the page’s own words, never the server’s English, and promises no account`, async () => {
      const { form, confirmCode } = await atCodeCheck(cat, prefix, () => refused);
      await confirmCode('654321');
      expect(said(form, cat)).toEqual({ lost: false, signIn: null, wrong: true, serverEnglish: false });
      if (cat !== en) expect(form.textContent).not.toMatch(/did not match|Bad Request/);
    }, FILLING);
  }

  it.each([
    ['a gateway got no answer from the API in time (504)', 504],
    ['a gateway got an invalid one (502)', 502],
  ])('%s, then the same code refused: no answer — the account may be ready, sign in, never wrong', async (_case, status) => {
    let calls = 0;
    const { form, confirmCode } = await atCodeCheck(en, '', () => {
      calls += 1;
      return calls === 1 ? { status, body: { message: 'Gateway' } } : refused;
    });
    await confirmCode('123456');
    expect(said(form, en)).toEqual({ lost: true, signIn: '/subscription', wrong: false, serverEnglish: false });
    await confirmCode('123456');
    expect(said(form, en)).toEqual({ lost: true, signIn: '/subscription', wrong: false, serverEnglish: false });
  }, FILLING);

  it('a 503 is an answer — the request was not taken: an error, no account promised', async () => {
    const { form, confirmCode } = await atCodeCheck(en, '', () => ({ status: 503, body: { statusCode: 503, message: 'Service Unavailable' } }));
    await confirmCode('123456');
    expect(said(form, en)).toEqual({ lost: false, signIn: null, wrong: false, serverEnglish: false });
    expect(form.textContent).toContain(en['error.generic']);
  }, FILLING);

  it('a lost answer, then the same code accepted after all: the application ends signed in, as it always does', async () => {
    let calls = 0;
    const { confirmCode } = await atCodeCheck(en, '', () => {
      calls += 1;
      if (calls === 1) throw new TypeError('Failed to fetch');
      return session;
    });
    await confirmCode('123456');
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: en['apply.verify.submit'] }));
    expect(await screen.findByText(en['apply.done.title'], {}, SLOW_WAIT)).toBeTruthy();
  }, FILLING);

  it('an answer is an answer: a server error is said as one, and no account is promised', async () => {
    const { form, confirmCode } = await atCodeCheck(en, '', () => ({ status: 500, body: { statusCode: 500, message: 'Internal server error' } }));
    await confirmCode('123456');
    expect(said(form, en)).toEqual({ lost: false, signIn: null, wrong: false, serverEnglish: false });
    expect(form.textContent).toContain(en['error.generic']);
  }, FILLING);

  it.each([
    ['a refusal is still a refusal: the code is wrong', 400, '{"statusCode":400,"message":"That co', true],
    ['a server error is still an error', 500, '{"statusCode":500,"mes', false],
  ] as const)('an answer whose body was cut off keeps its status — %s, and no account is promised', async (_case, status, start, wrong) => {
    const { form, confirmCode } = await atCodeCheck(en, '', () => cutOff(status, start));
    await confirmCode('654321');
    expect(said(form, en)).toEqual({ lost: false, signIn: null, wrong, serverEnglish: false });
    expect(form.textContent).toContain(en['error.generic']);
  }, FILLING);

  /*
   * The API's rate limit refuses with no code and its class name for a sentence ("ThrottlerException: Too Many
   * Requests"), which the page showed under its error title in every language. Every limit counts one minute, and the
   * page says so in its own words. A refused request is no lost answer and no wrong code.
   */
  describe('a request the rate limit refused', () => {
    const LIMITER = /Throttler|Too Many Requests/i;

    for (const [name, cat, prefix] of LANGS) {
      it(`in ${name}: a new code and a code check refused by the limit say to wait a minute, in the page’s words — never the limiter’s`, async () => {
        const { form, user, confirmCode, confirmations, resends } = await atCodeCheck(cat, prefix, () => THROTTLED, () => THROTTLED);
        await user.click(within(form).getByRole('button', { name: cat['apply.verify.resend'] }));
        expect(await within(form).findByText(cat['error.tooManyRequests'], {}, SLOW_WAIT)).toBeTruthy();
        expect(form.textContent).not.toMatch(LIMITER);
        expect(form.textContent).not.toContain(cat['error.generic']);
        await confirmCode('123456');
        expect(within(form).getByText(cat['error.tooManyRequests'])).toBeTruthy();
        expect(form.textContent).not.toMatch(LIMITER);
        expect(form.textContent).not.toContain(cat['error.generic']);
        expect(said(form, cat)).toEqual({ lost: false, signIn: null, wrong: false, serverEnglish: false });
        expect([resends(), confirmations()]).toEqual([1, ['123456']]);
      }, FILLING);
    }

    it('the application itself refused by the limit: wait a minute, the form kept as it was', async () => {
      const registrations = apply(() => THROTTLED);
      const user = await fill({ email: 'owner@example.test' });
      await user.click(screen.getByRole('button', { name: 'Send my application' }));
      expect(await screen.findByText(en['error.tooManyRequests'], {}, SLOW_WAIT)).toBeTruthy();
      expect(document.body.textContent).not.toMatch(LIMITER);
      expect(screen.queryByText(en['error.generic'])).toBeNull();
      expect(screen.queryByLabelText('Verification code')).toBeNull();
      expect((screen.getByLabelText('Business name') as HTMLInputElement).value).toBe('Boutique Test');
      expect(registrations()).toHaveLength(1);
    }, FILLING);
  });
});

