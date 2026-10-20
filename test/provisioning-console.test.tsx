import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import type { BusinessDetail, ProvisioningStatus } from '../src/api/types';
import { ar } from '../src/i18n/ar';
import { en } from '../src/i18n/en';
import { fr } from '../src/i18n/fr';
import { BRANCHES, LINES, SLOW_WAIT, mount, serve, subscription, useActivityHarness, type Handler } from './activity-fixtures';

useActivityHarness();

/*
 * Platform-superadmin provisioning in the console (D217): a business and its Owner created with a one-time setup
 * code shown once, a persistent test business marked everywhere, its setup and its access told apart, its stores
 * opened under its grant — every decision after a step-up, every answer the server's.
 */
const ADMIN = { id: 'a1', email: 'admin@example.test', name: 'Admin' };
const ID = '0192f000-0000-7000-8000-0000000000c1';
const TOKEN = 'setup-token-shown-once-0123456789abcdefghijk';

function setup(over: Partial<ProvisioningStatus> = {}): ProvisioningStatus {
  return {
    isTest: true,
    testMarkedAt: '2026-10-20T08:00:00.000Z',
    testMarkedBy: ADMIN.email,
    customerActivation: 'closed',
    createdBy: 'console',
    provisioning: 'awaiting_owner_setup',
    owner: { name: 'Mariem', passwordSet: false, phone: { present: true, verified: false, whatsappConsent: 'none' }, email: { present: false, verified: false }, lastLoginAt: null },
    invitation: { state: 'none', issuedAt: null, issuedBy: null, expiresAt: null, acceptedAt: null, revokedAt: null },
    activation: { status: 'pending_activation', complimentaryUntil: null },
    ...over,
  };
}

function detail(over: Partial<BusinessDetail> = {}): BusinessDetail {
  const sub = subscription(BRANCHES, LINES);
  return {
    id: ID,
    name: 'Labo Test',
    publicStoreId: 'AB12CD34EF',
    city: 'Nouakchott',
    createdAt: '2026-10-20T08:00:00.000Z',
    branches: [],
    people: [],
    entitlement: { ...(sub.entitlement as BusinessDetail['entitlement'] & object), state: 'complimentary', status: 'activated', trial: null },
    pricing: null,
    version: 2,
    events: [],
    payments: [],
    trial: null,
    isTest: true,
    setup: setup(),
    ...over,
  };
}

async function stepUp(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText('Password'), 'step-up-password');
  await user.type(screen.getByLabelText('Code from your authenticator'), '123456');
  await user.click(within(screen.getByRole('dialog', { hidden: true })).getByRole('button', { name: 'Confirm', hidden: true }));
}

function serveBusiness(d: BusinessDetail, extra?: Handler) {
  return serve((url, body) => {
    const own = extra?.(url, body);
    if (own) return own;
    if (url.endsWith('/platform/admin/me')) return { body: ADMIN };
    if (url.endsWith(`/platform/businesses/${ID}`)) return { body: d };
    if (url.endsWith(`/platform/businesses/${ID}/seat-requests`)) return { body: [] };
    if (url.endsWith(`/platform/businesses/${ID}/notices`)) return { status: 404, body: { message: 'Not Found' } };
    return undefined;
  });
}

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
});

describe('creating a business and its Owner', () => {
  it('sends a test business by default with its key and no password, and shows the setup code once', async () => {
    const created = { companyId: ID, publicStoreId: 'AB12CD34EF', created: true, invitation: { token: TOKEN, expiresAt: '2026-10-23T08:00:00.000Z', delivery: 'manual', owner: { name: 'Mariem', destinationMasked: '***0001' } }, setup: setup() };
    const sent = serve((url) => {
      if (url.endsWith('/platform/admin/me')) return { body: ADMIN };
      if (url.endsWith('/platform/businesses')) return { status: 201, body: created };
      return undefined;
    });
    mount('/admin/businesses/new');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Business name', undefined, SLOW_WAIT), 'Labo Test');
    await user.type(screen.getByLabelText('Owner’s name'), 'Mariem');
    await user.type(screen.getByLabelText(/Owner’s WhatsApp number/), '+22200000001');
    await user.type(screen.getByLabelText(/^Reason/), 'Phone-browser test');
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Create the business' }));
    await stepUp(user);

    const code = await screen.findByTestId('setup-code');
    expect(code.textContent).toBe(TOKEN);
    expect(screen.getByText(en['admin.new.created'])).toBeTruthy();
    const post = sent.find((r) => r.url.endsWith('/platform/businesses'))!;
    expect(post.body).toMatchObject({ businessName: 'Labo Test', ownerName: 'Mariem', phone: '+22200000001', isTest: true, reason: 'Phone-browser test', confirmPassword: 'step-up-password' });
    expect(typeof (post.body as { idempotencyKey: string }).idempotencyKey).toBe('string');
    expect(JSON.stringify(post.body)).not.toMatch(/"password"/);

    // Handed over: gone from the page, and nothing on it can show it again.
    await user.click(screen.getByRole('button', { name: en['admin.setup.code.done'] }));
    expect(screen.queryByTestId('setup-code')).toBeNull();
    expect(document.body.textContent).not.toContain(TOKEN);
  });

  it('keeps its key when the same answers are sent again after a lost answer, and says a customer cannot be created while activation is closed', async () => {
    let calls = 0;
    const sent = serve((url) => {
      if (url.endsWith('/platform/admin/me')) return { body: ADMIN };
      if (url.endsWith('/platform/businesses')) {
        calls += 1;
        return calls === 1
          ? new Response('', { status: 502 })
          : { status: 403, body: { statusCode: 403, code: 'customer_activation_closed', message: 'Customer activation is closed.' } };
      }
      return undefined;
    });
    mount('/admin/businesses/new');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Business name', undefined, SLOW_WAIT), 'Real Shop');
    await user.type(screen.getByLabelText('Owner’s name'), 'Ahmed');
    await user.type(screen.getByLabelText(/Owner’s WhatsApp number/), '+22200000002');
    await user.type(screen.getByLabelText(/^Reason/), 'By phone');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Create the business' }));
    await stepUp(user);
    await screen.findByRole('alert');
    await user.click(screen.getByRole('button', { name: 'Create the business' }));
    await stepUp(user);
    expect(await screen.findByText(en['admin.provisioning.error.customer_activation_closed'])).toBeTruthy();
    const posts = sent.filter((r) => r.url.endsWith('/platform/businesses'));
    expect(posts).toHaveLength(2);
    expect((posts[0]!.body as { idempotencyKey: string }).idempotencyKey).toBe((posts[1]!.body as { idempotencyKey: string }).idempotencyKey);
    expect(posts[1]!.body).toMatchObject({ isTest: false });
  });
});

describe('a test business’s page', () => {
  it('is marked unmistakably, tells setup and access apart, and offers no payment', async () => {
    serveBusiness(detail());
    mount(`/admin/businesses/${ID}`);
    expect(await screen.findByText(en['admin.test.bannerTitle'], undefined, SLOW_WAIT)).toBeTruthy();
    expect(screen.getAllByText(en['admin.test.badge']).length).toBeGreaterThan(0);
    const panel = screen.getByRole('heading', { name: en['admin.setup.title'] }).closest('section')!;
    expect(within(panel).getByText(en['admin.setup.provisioning.awaiting_owner_setup'])).toBeTruthy();
    expect(within(panel).getByText(en['admin.setup.activation.pending_activation'])).toBeTruthy();
    expect(within(panel).getByText(en['admin.setup.invitation.none'])).toBeTruthy();
    expect(within(panel).getByText(en['admin.business.unverified'])).toBeTruthy();
    expect(within(panel).getByText(en['admin.setup.consent.none'])).toBeTruthy();
    const decisions = screen.getByRole('heading', { name: 'Decisions' }).closest('section')!;
    expect(within(decisions).queryByRole('button', { name: en['admin.action.payment'] })).toBeNull();
    expect(within(decisions).getByRole('button', { name: en['admin.action.grant'] })).toBeTruthy();
  });

  it('issues the Owner’s setup code after a step-up and shows it once', async () => {
    const sent = serveBusiness(detail(), (url) =>
      url.endsWith(`/platform/businesses/${ID}/owner-invitation`)
        ? { status: 201, body: { token: TOKEN, expiresAt: '2026-10-23T08:00:00.000Z', delivery: 'manual', owner: { name: 'Mariem', destinationMasked: '***0001' }, replaced: 0 } }
        : undefined,
    );
    mount(`/admin/businesses/${ID}`);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: en['admin.setup.issue'] }, SLOW_WAIT));
    await stepUp(user);
    expect((await screen.findByTestId('setup-code')).textContent).toBe(TOKEN);
    expect(sent.find((r) => r.url.endsWith('/owner-invitation'))!.body).toMatchObject({ confirmPassword: 'step-up-password' });
  });

  it('opens a store under the grant, and a retry with the same name says nothing new was made', async () => {
    let first = true;
    const sent = serveBusiness(detail(), (url) => {
      if (!url.endsWith(`/platform/businesses/${ID}/stores`)) return undefined;
      const created = first;
      first = false;
      return { body: { mode: 'granted', created, allocation: { id: 's1', status: 'granted', monthlyAmount: 0 } } };
    });
    mount(`/admin/businesses/${ID}`);
    const user = userEvent.setup();
    const card = (await screen.findByRole('heading', { name: en['admin.store.title'] }, SLOW_WAIT)).closest('section')!;
    expect(within(card).getByText(en['admin.store.test'])).toBeTruthy();
    const [name, reason] = within(card).getAllByRole('textbox');
    await user.type(name!, 'Annexe');
    await user.type(reason!, 'Second test store');
    await user.click(within(card).getByRole('button', { name: en['admin.store.submit'] }));
    await stepUp(user);
    expect(await within(card).findByText('The store “Annexe” is open, under the grant.')).toBeTruthy();
    expect(sent.find((r) => r.url.endsWith('/stores'))!.body).toMatchObject({ name: 'Annexe', activity: 'electronics', reason: 'Second test store' });
    const [again, why] = within(card).getAllByRole('textbox');
    await user.type(again!, 'Annexe');
    await user.type(why!, 'Second test store');
    await user.click(within(card).getByRole('button', { name: en['admin.store.submit'] }));
    await stepUp(user);
    expect(await within(card).findByText(en['admin.store.same'])).toBeTruthy();
  });

  it('says a test status refusal in words', async () => {
    serveBusiness(detail({ isTest: false, setup: setup({ isTest: false, customerActivation: 'closed' }) }), (url) =>
      url.endsWith('/test-status') ? { status: 409, body: { statusCode: 409, code: 'test_status_connected', message: 'x' } } : undefined,
    );
    mount(`/admin/businesses/${ID}`);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: en['admin.test.mark'] }, SLOW_WAIT));
    const card = screen.getByRole('heading', { name: en['admin.test.title'] }).closest('section')!;
    await user.type(within(card).getByRole('textbox'), 'QA');
    await user.click(within(card).getByRole('button', { name: 'Confirm' }));
    await stepUp(user);
    expect(await within(card).findByText(en['admin.provisioning.error.test_status_connected'])).toBeTruthy();
  });
});

describe('lists and figures', () => {
  it('marks a test business in the list and says the dashboard leaves test businesses out', async () => {
    serve((url) => {
      if (url.endsWith('/platform/admin/me')) return { body: ADMIN };
      if (url.includes('/platform/businesses?')) {
        return { body: { rows: [{ id: ID, name: 'Labo Test', publicStoreId: 'AB12CD34EF', city: null, createdAt: '2026-10-20T08:00:00.000Z', branches: 1, users: 1, state: 'pending', status: 'pending_activation', periodEnd: null, isTest: true, version: 1 }], total: 1, page: 1, pageSize: 25 } };
      }
      return undefined;
    });
    mount('/admin/businesses');
    const row = (await screen.findByRole('link', { name: 'Labo Test' }, SLOW_WAIT)).closest('tr')!;
    expect(within(row).getByText(en['admin.test.badge'])).toBeTruthy();
    expect(screen.getByRole('link', { name: en['admin.new.title'] }).getAttribute('href')).toBe('/admin/businesses/new');
  });

  it('dashboard', async () => {
    serve((url) => {
      if (url.endsWith('/platform/admin/me')) return { body: ADMIN };
      if (url.endsWith('/platform/dashboard')) return { body: { byState: {}, businesses: 0, branches: 0, activeUsers: 0, pendingSeatRequests: 0, pendingStaff: 0, testBusinesses: 2, revenue: null, calculatedAt: '2026-10-20T08:00:00.000Z' } };
      return undefined;
    });
    mount('/admin');
    expect(await screen.findByText('2 test businesses are not counted in these figures.', undefined, SLOW_WAIT)).toBeTruthy();
  });
});

describe('in French and Arabic', () => {
  it.each([
    ['fr', fr],
    ['ar', ar],
  ] as const)('%s: the test banner and the setup panel in its words, the page in its direction', async (lang, cat) => {
    localStorage.setItem('erp.web.language', lang);
    serveBusiness(detail());
    mount(`/admin/businesses/${ID}`);
    expect(await screen.findByText(cat['admin.test.bannerTitle'], undefined, SLOW_WAIT)).toBeTruthy();
    expect(screen.getByRole('heading', { name: cat['admin.setup.title'] })).toBeTruthy();
    expect(screen.getByText(cat['admin.setup.provisioning.awaiting_owner_setup'])).toBeTruthy();
    expect(document.documentElement.getAttribute('dir')).toBe(lang === 'ar' ? 'rtl' : 'ltr');
  });
});
