import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import type { BusinessDetail, DeferredAccount, ProvisioningStatus } from '../src/api/types';
import { en } from '../src/i18n/en';
import { BRANCHES, LINES, SLOW_WAIT, mount, serve, subscription, useActivityHarness, type Handler } from './activity-fixtures';

useActivityHarness();

/*
 * Deferred WhatsApp verification in the console (D224, docs/109; amended 2026-10-29): Required is the default, Deferred
 * is offered per account, for an ordinary business, while the server's switch is on — with its reason, confirmation,
 * review date and warning; a deferred number reads Deferred, never verified; provisioned staff and the lifecycle.
 */
const ADMIN = { id: 'a1', email: 'admin@example.test', name: 'Admin' };
const ID = '0192f000-0000-7000-8000-0000000000d1';
const STORE = '0192f000-0000-7000-8000-0000000000e1';
const USER = '0192f000-0000-7000-8000-0000000000f1';
const TOKEN = 'setup-code-shown-once-abcdefghijklmnopqrstu';
const CODE = { token: TOKEN, expiresAt: '2026-10-31T08:00:00.000Z', delivery: 'manual' as const };

function setup(over: Partial<ProvisioningStatus> = {}): ProvisioningStatus {
  return {
    isTest: false,
    testMarkedAt: null,
    testMarkedBy: null,
    customerActivation: 'closed',
    createdBy: 'console',
    provisioning: 'ready',
    owner: { name: 'Store Owner', passwordSet: true, phone: { present: true, verified: false, verification: 'deferred_by_platform', whatsappConsent: 'none' }, email: { present: false, verified: false }, lastLoginAt: null },
    invitation: { state: 'none', issuedAt: null, issuedBy: null, expiresAt: null, acceptedAt: null, revokedAt: null },
    activation: { status: 'activated', complimentaryUntil: '2026-11-28T00:00:00.000Z' },
    ...over,
  };
}

function detail(over: Partial<BusinessDetail> = {}): BusinessDetail {
  const sub = subscription(BRANCHES, LINES);
  return {
    id: ID,
    name: 'Dar Electronics',
    publicStoreId: 'PL12CD34EF',
    city: 'Nouakchott',
    createdAt: '2026-10-28T08:00:00.000Z',
    branches: [{ id: STORE, name: 'Main Store', type: 'store', activity: 'electronics', activityNext: null } as BusinessDetail['branches'][number]],
    people: [
      { id: USER, name: 'Sidi Employee', email: null, phone: '+22200000011', emailVerified: false, phoneVerified: false, phoneVerification: 'deferred_by_platform', isActive: true, status: 'active', lastLoginAt: null },
    ],
    entitlement: { ...(sub.entitlement as BusinessDetail['entitlement'] & object), state: 'complimentary', status: 'activated', trial: null },
    pricing: null,
    version: 3,
    events: [],
    payments: [],
    trial: null,
    isTest: false,
    setup: setup(),
    ...over,
  };
}

const DEFERRED: DeferredAccount = {
  companyId: ID,
  business: 'Dar Electronics',
  userId: USER,
  name: 'Sidi Employee',
  role: 'store_employee',
  stores: ['Main Store'],
  phoneVerification: 'deferred_by_platform',
  grantedBy: ADMIN.email,
  grantedAt: '2026-10-28T09:00:00.000Z',
  reason: 'WhatsApp Business API not live yet',
  reviewAt: '2026-11-04T23:59:00.000Z',
  setupCode: 'used',
  activated: true,
};

async function stepUp(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText('Password'), 'step-up-password');
  await user.type(screen.getByLabelText('Code from your authenticator'), '123456');
  await user.click(within(screen.getByRole('dialog', { hidden: true })).getByRole('button', { name: 'Confirm', hidden: true }));
}

function serveConsole(opts: { deferral: boolean; business?: BusinessDetail; deferred?: DeferredAccount[] }, extra?: Handler) {
  return serve((url, body) => {
    const own = extra?.(url, body);
    if (own) return own;
    if (url.endsWith('/platform/admin/me')) return { body: ADMIN };
    if (url.endsWith('/platform/capabilities')) return { body: { phoneVerificationDeferral: opts.deferral } };
    if (url.includes('/platform/phone-verification/deferred')) return { body: { accounts: opts.deferred ?? [] } };
    if (opts.business && url.endsWith(`/platform/businesses/${ID}`)) return { body: opts.business };
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

async function fillBusiness(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText('Business name', undefined, SLOW_WAIT), 'Dar Electronics');
  await user.type(screen.getByLabelText('Owner’s name'), 'Store Owner');
  await user.type(screen.getByLabelText(/Owner’s WhatsApp number/), '+22200000010');
  await user.type(screen.getByLabelText(/^Reason/), 'Store set-up from the console');
}

describe('creating a business: WhatsApp verification', () => {
  it('is Required by default, and a Required request sends no deferral', async () => {
    const sent = serveConsole({ deferral: true }, (url) => (url.endsWith('/platform/businesses') ? { status: 201, body: { companyId: ID, publicStoreId: 'PL12CD34EF', created: true, invitation: { ...CODE, owner: { name: 'Store Owner', destinationMasked: '***0010' } }, setup: setup() } } : undefined));
    mount('/admin/businesses/new');
    const user = userEvent.setup();
    await fillBusiness(user);
    const choice = await screen.findByTestId('verification-choice');
    expect((within(choice).getByLabelText(en['admin.deferral.required']) as HTMLInputElement).checked).toBe(true);
    expect(screen.queryByText(en['admin.deferral.warning'])).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Create the business' }));
    await stepUp(user);
    await screen.findByTestId('setup-code');
    const post = sent.find((r) => r.url.endsWith('/platform/businesses'))!.body as Record<string, unknown>;
    expect(post.verification).toBe('required');
    expect(post.deferral).toBeUndefined();
  }, 20_000);

  it('Deferred asks for a reason and the controlled-test confirmation, shows the warning word for word, and shows the Owner’s setup code', async () => {
    const sent = serveConsole({ deferral: true }, (url) =>
      url.endsWith('/platform/businesses') ? { status: 201, body: { companyId: ID, publicStoreId: 'PL12CD34EF', created: true, invitation: null, setupCode: CODE, ownerPhoneVerification: 'deferred_by_platform', setup: setup() } } : undefined,
    );
    mount('/admin/businesses/new');
    const user = userEvent.setup();
    await fillBusiness(user);
    await user.click(within(await screen.findByTestId('verification-choice')).getByLabelText(en['admin.deferral.deferred']));
    expect(screen.getByText(en['admin.deferral.warning'])).toBeTruthy();
    const submit = screen.getByRole('button', { name: 'Create the business' });
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    await user.type(screen.getByLabelText(new RegExp(en['admin.deferral.reason'])), 'WhatsApp Business API not live yet');
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    await user.click(screen.getByLabelText(en['admin.deferral.confirm']));
    expect((submit as HTMLButtonElement).disabled).toBe(false);
    await user.click(submit);
    await stepUp(user);
    expect((await screen.findByTestId('setup-code')).textContent).toBe(TOKEN);
    const post = sent.find((r) => r.url.endsWith('/platform/businesses'))!.body as Record<string, unknown>;
    expect(post).toMatchObject({ isTest: true, verification: 'deferred_by_platform', deferral: { reason: 'WhatsApp Business API not live yet', confirmUnverified: true } });
    expect(JSON.stringify(post)).not.toMatch(/"password"/);
  }, 20_000);

  it('while the switch is off, the choice never appears', async () => {
    serveConsole({ deferral: false });
    mount('/admin/businesses/new');
    const user = userEvent.setup();
    await fillBusiness(user);
    await screen.findByRole('button', { name: 'Create the business' });
    expect(screen.queryByTestId('verification-choice')).toBeNull();
  }, 20_000);

  it('the server’s refusal is said in words', async () => {
    serveConsole({ deferral: true }, (url) => (url.endsWith('/platform/businesses') ? { status: 403, body: { statusCode: 403, code: 'deferral_mfa_required', message: 'x' } } : undefined));
    mount('/admin/businesses/new');
    const user = userEvent.setup();
    await fillBusiness(user);
    await user.click(within(await screen.findByTestId('verification-choice')).getByLabelText(en['admin.deferral.deferred']));
    await user.type(screen.getByLabelText(new RegExp(en['admin.deferral.reason'])), 'reason');
    await user.click(screen.getByLabelText(en['admin.deferral.confirm']));
    await user.click(screen.getByRole('button', { name: 'Create the business' }));
    await stepUp(user);
    expect(await screen.findByText(en['admin.provisioning.error.deferral_mfa_required'])).toBeTruthy();
  }, 20_000);
});

describe('a business’s page', () => {
  it('a deferred number reads Deferred — not verified — never Verified', async () => {
    serveConsole({ deferral: true, business: detail(), deferred: [DEFERRED] });
    mount(`/admin/businesses/${ID}`);
    const people = (await screen.findByRole('heading', { name: en['admin.business.people'] }, SLOW_WAIT)).closest('section')!;
    expect(within(people).getByText(en['admin.deferral.badge'])).toBeTruthy();
    expect(within(people).queryByText(en['admin.business.verified'])).toBeNull();
    const panel = screen.getByRole('heading', { name: en['admin.setup.title'] }).closest('section')!;
    expect(within(panel).getByText(en['admin.deferral.badge'])).toBeTruthy();
  });

  it('lists each deferred account with who granted it, when and why — and offers no way to mark it verified', async () => {
    serveConsole({ deferral: true, business: detail(), deferred: [DEFERRED] });
    mount(`/admin/businesses/${ID}`);
    const card = (await screen.findByRole('heading', { name: en['admin.deferred.title'] }, SLOW_WAIT)).closest('section')!;
    expect(within(card).getByText(ADMIN.email)).toBeTruthy();
    expect(within(card).getByText(DEFERRED.reason)).toBeTruthy();
    expect(within(card).getByText(en['admin.deferred.code.used'])).toBeTruthy();
    expect(within(card).getByRole('button', { name: en['admin.deferred.require'] })).toBeTruthy();
    expect(within(card).queryByRole('button', { name: /verified|vérifié/i })).toBeNull();
  });

  it('requires verification after a step-up, with a reason, and sends nothing to the number', async () => {
    const sent = serveConsole({ deferral: true, business: detail(), deferred: [DEFERRED] }, (url) => (url.endsWith(`/accounts/${USER}/require-verification`) ? { body: { userId: USER, phoneVerification: 'required', sent: 'nothing' } } : undefined));
    mount(`/admin/businesses/${ID}`);
    const user = userEvent.setup();
    const card = (await screen.findByRole('heading', { name: en['admin.deferred.title'] }, SLOW_WAIT)).closest('section')!;
    await user.click(within(card).getByRole('button', { name: en['admin.deferred.require'] }));
    expect(within(card).getByText(en['admin.deferred.require.note'])).toBeTruthy();
    await user.type(within(card).getByRole('textbox'), 'WhatsApp API is live');
    await user.click(within(card).getByRole('button', { name: en['action.confirm'] }));
    await stepUp(user);
    await screen.findByRole('heading', { name: en['admin.deferred.title'] });
    expect(sent.find((r) => r.url.endsWith('/require-verification'))!.body).toEqual({ reason: 'WhatsApp API is live', confirmPassword: 'step-up-password' });
  });

  it('adds a deferred Employee with a store, and shows their setup code once', async () => {
    const sent = serveConsole({ deferral: true, business: detail({ people: [] }) }, (url) =>
      url.endsWith(`/platform/businesses/${ID}/provisioned-staff`)
        ? { status: 201, body: { user: { id: USER, name: 'Sidi Employee', role: 'store_employee', stores: ['Main Store'], phoneVerification: 'deferred_by_platform', status: 'pending' }, setupCode: CODE } }
        : undefined,
    );
    mount(`/admin/businesses/${ID}`);
    const user = userEvent.setup();
    const card = (await screen.findByRole('heading', { name: en['admin.testStaff.title'] }, SLOW_WAIT)).closest('section')!;
    await user.type(within(card).getByLabelText(en['admin.testStaff.name']), 'Sidi Employee');
    await user.type(within(card).getByLabelText(new RegExp(en['admin.testStaff.phone'])), '+22200000011');
    await user.click(within(card).getByLabelText('Main Store'));
    await user.click(within(card).getByLabelText(en['admin.deferral.deferred']));
    await user.type(within(card).getByLabelText(new RegExp(en['admin.deferral.reason'])), 'New staff member');
    await user.click(within(card).getByLabelText(en['admin.deferral.confirm']));
    await user.click(within(card).getByRole('button', { name: en['admin.testStaff.submit'] }));
    await stepUp(user);
    expect((await within(card).findByTestId('setup-code')).textContent).toBe(TOKEN);
    expect(sent.find((r) => r.url.endsWith('/provisioned-staff'))!.body).toMatchObject({
      name: 'Sidi Employee',
      phone: '+22200000011',
      role: 'store_employee',
      branchIds: [STORE],
      verification: 'deferred_by_platform',
      deferral: { reason: 'New staff member', confirmUnverified: true },
    });
    await user.click(within(card).getByRole('button', { name: en['admin.setup.code.done'] }));
    expect(document.body.textContent).not.toContain(TOKEN);
  }, 20_000);

});

describe('the businesses list', () => {
  it('filters to businesses with deferred verification', async () => {
    const sent = serveConsole({ deferral: true }, (url) => (url.includes('/platform/businesses?') ? { body: { rows: [], total: 0, page: 1, pageSize: 25 } } : undefined));
    mount('/admin/businesses');
    const user = userEvent.setup();
    await user.click(await screen.findByLabelText(en['admin.businesses.deferredOnly'], undefined, SLOW_WAIT));
    await waitFor(() => expect(sent.some((r) => r.url.includes('verification=deferred'))).toBe(true));
  });
});

describe('an ordinary business', () => {
  it('offers the choice with the test-business box unticked, and sends no test or pilot field', async () => {
    const sent = serveConsole({ deferral: true }, (url) => (url.endsWith('/platform/businesses') ? { status: 201, body: { companyId: ID, publicStoreId: 'PL12CD34EF', created: true, invitation: null, setupCode: CODE, setup: setup() } } : undefined));
    mount('/admin/businesses/new');
    const user = userEvent.setup();
    await fillBusiness(user);
    await user.click(screen.getAllByRole('checkbox')[0]!);
    const choice = await screen.findByTestId('verification-choice');
    await user.click(within(choice).getByLabelText(en['admin.deferral.deferred']));
    await user.type(screen.getByLabelText(new RegExp(en['admin.deferral.reason'])), 'WhatsApp Business API not live yet');
    await user.click(screen.getByLabelText(en['admin.deferral.confirm']));
    await user.click(screen.getByRole('button', { name: 'Create the business' }));
    await stepUp(user);
    await screen.findByTestId('setup-code');
    const post = sent.find((r) => r.url.endsWith('/platform/businesses'))!.body as Record<string, unknown>;
    expect(post).toMatchObject({ isTest: false, verification: 'deferred_by_platform' });
    expect(JSON.stringify(post)).not.toMatch(/pilot/i);
  }, 20_000);

  it('has no pilot mark anywhere on its page', async () => {
    serveConsole({ deferral: true, business: detail() });
    mount(`/admin/businesses/${ID}`);
    await screen.findByRole('heading', { name: en['admin.business.people'] }, SLOW_WAIT);
    expect(document.body.textContent).not.toMatch(/pilot/i);
    expect(screen.getByRole('heading', { name: en['admin.testStaff.title'] })).toBeTruthy();
  });
});
