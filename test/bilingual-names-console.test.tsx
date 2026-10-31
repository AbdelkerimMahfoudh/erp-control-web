import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ar } from '../src/i18n/ar';
import { en } from '../src/i18n/en';
import { fr } from '../src/i18n/fr';
import { arabicNameProblem, latinNameProblem } from '../src/lib/names';
import { SLOW_WAIT, mount, serve, useActivityHarness } from './activity-fixtures';

useActivityHarness();
// Typing every name, then the step-up, takes a while on a loaded machine; a test that ran out of time would keep typing into the next.
vi.setConfig({ testTimeout: 30_000 });

/*
 * Creating a business in the console with both names of everything (D225, the owner's report of 2026-10-31): the
 * form had Latin names only, the API required the Arabic ones, and the operator read "ownerNameAr must be a string".
 * Now every name has its Latin and its Arabic field, the API's rules are checked beside each field in the operator's
 * language before anything is sent, a refusal never shows the API's validation wording, and what was typed stays.
 */
const ADMIN = { id: 'a1', email: 'admin@example.test', name: 'Admin' };
const ID = '0192f000-0000-7000-8000-0000000000c1';

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
});

async function stepUp(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText('Password'), 'step-up-password');
  await user.type(screen.getByLabelText('Code from your authenticator'), '123456');
  await user.click(within(screen.getByRole('dialog', { hidden: true })).getByRole('button', { name: 'Confirm', hidden: true }));
}

const input = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
/** What the form says under a field: the message the input itself points to. */
const saidFor = (label: string) => {
  const id = input(label).getAttribute('aria-describedby');
  return id ? document.getElementById(id)?.textContent : undefined;
};

async function fill(user: ReturnType<typeof userEvent.setup>, values: Partial<Record<keyof typeof en, string>>) {
  for (const [key, value] of Object.entries(values)) {
    if (value) await user.type(input(en[key as keyof typeof en]), value);
  }
}

describe('the form', () => {
  it('labels each name with its script; Arabic fields read right to left, Latin ones left to right', async () => {
    serve((url) => (url.endsWith('/platform/admin/me') ? { body: ADMIN } : undefined));
    mount('/admin/businesses/new');
    await screen.findByLabelText(en['admin.new.business'], undefined, SLOW_WAIT);
    for (const key of ['admin.new.business', 'admin.new.owner', 'admin.new.store'] as const) {
      expect(input(en[key]).getAttribute('dir')).toBe('ltr');
      expect(en[key]).toMatch(/Latin letters/);
    }
    for (const key of ['admin.new.businessAr', 'admin.new.ownerAr', 'admin.new.storeAr'] as const) {
      expect(input(en[key]).getAttribute('dir')).toBe('rtl');
      expect(input(en[key]).getAttribute('lang')).toBe('ar');
    }
  });
});

describe('creating a business with both names', () => {
  it('sends every Latin and Arabic name to its own field, the first store\'s two together', async () => {
    const sent = serve((url) => {
      if (url.endsWith('/platform/admin/me')) return { body: ADMIN };
      if (url.endsWith('/platform/businesses')) return { status: 201, body: { companyId: ID, publicStoreId: 'AB12CD34EF', created: true } };
      return undefined;
    });
    mount('/admin/businesses/new');
    const user = userEvent.setup();
    await screen.findByLabelText(en['admin.new.business'], undefined, SLOW_WAIT);
    await fill(user, {
      'admin.new.business': 'Dar Phones',
      'admin.new.businessAr': 'دار الهواتف',
      'admin.new.owner': 'Mariem',
      'admin.new.ownerAr': 'مريم',
      'admin.new.store': 'Centre',
      'admin.new.storeAr': 'الوسط',
    });
    await user.type(screen.getByLabelText(/Owner’s WhatsApp number/), '+22200000001');
    await user.type(screen.getByLabelText(/^Reason/), 'Console test');
    await user.click(screen.getByRole('button', { name: en['admin.new.submit'] }));
    await stepUp(user);
    await screen.findByText(en['admin.new.created']);
    const post = sent.find((r) => r.url.endsWith('/platform/businesses'))!;
    expect(post.body).toMatchObject({
      businessName: 'Dar Phones',
      businessNameAr: 'دار الهواتف',
      ownerName: 'Mariem',
      ownerNameAr: 'مريم',
      branchName: 'Centre',
      branchNameAr: 'الوسط',
    });
  });

  it('missing Arabic names: said beside each field, nothing sent, nothing typed lost', async () => {
    const sent = serve((url) => (url.endsWith('/platform/admin/me') ? { body: ADMIN } : undefined));
    mount('/admin/businesses/new');
    const user = userEvent.setup();
    await screen.findByLabelText(en['admin.new.business'], undefined, SLOW_WAIT);
    await fill(user, { 'admin.new.business': 'Dar Phones', 'admin.new.owner': 'Mariem' });
    await user.type(screen.getByLabelText(/Owner’s WhatsApp number/), '+22200000001');
    await user.type(screen.getByLabelText(/^Reason/), 'Console test');
    await user.click(screen.getByRole('button', { name: en['admin.new.submit'] }));

    expect(saidFor(en['admin.new.businessAr'])).toBe(en['names.problem.name_blank']);
    expect(saidFor(en['admin.new.ownerAr'])).toBe(en['names.problem.name_blank']);
    expect(input(en['admin.new.businessAr']).getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText(en['form.fix'])).toBeTruthy();
    expect(sent.some((r) => r.url.endsWith('/platform/businesses'))).toBe(false);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(input(en['admin.new.business']).value).toBe('Dar Phones');
    expect(input(en['admin.new.owner']).value).toBe('Mariem');
  });

  it('a name in the wrong script, and a store\'s Arabic name without its Latin one, are each named', async () => {
    serve((url) => (url.endsWith('/platform/admin/me') ? { body: ADMIN } : undefined));
    mount('/admin/businesses/new');
    const user = userEvent.setup();
    await screen.findByLabelText(en['admin.new.business'], undefined, SLOW_WAIT);
    await fill(user, {
      'admin.new.business': 'دار',
      'admin.new.businessAr': 'Dar',
      'admin.new.owner': 'Mariem',
      'admin.new.ownerAr': 'مريم',
      'admin.new.storeAr': 'الوسط',
    });
    await user.click(screen.getByRole('button', { name: en['admin.new.submit'] }));
    const said = (key: keyof typeof en) => saidFor(en[key]);
    expect(said('admin.new.business')).toBe(en['names.problem.name_latin_has_arabic']);
    expect(said('admin.new.businessAr')).toBe(en['names.problem.name_ar_needs_arabic']);
    expect(said('admin.new.store')).toBe(en['admin.new.storeLatin.needed']);
    expect(said('admin.new.owner')).toBeUndefined();
  });

  it('a refusal from the API never shows its validation wording, and the form keeps every answer', async () => {
    serve((url) => {
      if (url.endsWith('/platform/admin/me')) return { body: ADMIN };
      if (url.endsWith('/platform/businesses')) {
        return { status: 400, body: { statusCode: 400, message: ['ownerNameAr must be a string', 'businessNameAr must be a string'] } };
      }
      return undefined;
    });
    mount('/admin/businesses/new');
    const user = userEvent.setup();
    await screen.findByLabelText(en['admin.new.business'], undefined, SLOW_WAIT);
    await fill(user, { 'admin.new.business': 'Dar Phones', 'admin.new.businessAr': 'دار', 'admin.new.owner': 'Mariem', 'admin.new.ownerAr': 'مريم' });
    await user.type(screen.getByLabelText(/Owner’s WhatsApp number/), '+22200000001');
    await user.type(screen.getByLabelText(/^Reason/), 'Console test');
    await user.click(screen.getByRole('button', { name: en['admin.new.submit'] }));
    await stepUp(user);
    expect(await screen.findByText(en['error.validation'])).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/must be a string|NameAr/);
    expect(input(en['admin.new.businessAr']).value).toBe('دار');
    expect(input(en['admin.new.ownerAr']).value).toBe('مريم');
  });
});

describe.each([
  ['fr', fr],
  ['ar', ar],
] as const)('in %s', (lang, catalogue) => {
  it('the field messages and the labels are the operator\'s language', async () => {
    localStorage.setItem('erp.web.language', lang);
    serve((url) => (url.endsWith('/platform/admin/me') ? { body: ADMIN } : undefined));
    mount('/admin/businesses/new');
    const user = userEvent.setup();
    await screen.findByLabelText(catalogue['admin.new.business'], undefined, SLOW_WAIT);
    await user.click(screen.getByRole('button', { name: catalogue['admin.new.submit'] }));
    const said = saidFor(catalogue['admin.new.ownerAr']);
    expect(said).toBe(catalogue['names.problem.name_blank']);
    expect(said).not.toBe(en['names.problem.name_blank']);
    expect(document.documentElement.getAttribute('dir') ?? 'ltr').toBe(lang === 'ar' ? 'rtl' : 'ltr');
  });
});

describe('the API\'s rules, mirrored', () => {
  it('match the API on the cases that matter', () => {
    expect(latinNameProblem('  PS5   Center ')).toBeNull();
    expect(latinNameProblem('Électro Kiffa')).toBeNull();
    expect(latinNameProblem('دار')).toBe('name_latin_has_arabic');
    expect(latinNameProblem('...')).toBe('name_latin_needs_letter');
    expect(latinNameProblem('   ')).toBe('name_blank');
    expect(latinNameProblem('a'.repeat(161))).toBe('name_too_long');
    expect(latinNameProblem('Dar‮Phones')).toBe('name_forbidden_character');
    expect(arabicNameProblem('دار الهواتف 2')).toBeNull();
    expect(arabicNameProblem('Dar')).toBe('name_ar_needs_arabic');
  });

  it('every problem has its sentence in all three languages, never English in French or Arabic', () => {
    for (const p of ['name_blank', 'name_too_long', 'name_forbidden_character', 'name_latin_has_arabic', 'name_latin_needs_letter', 'name_ar_needs_arabic']) {
      const key = `names.problem.${p}` as keyof typeof en;
      expect(fr[key]).toBeTruthy();
      expect(ar[key]).toBeTruthy();
      expect(fr[key]).not.toBe(en[key]);
      expect(ar[key]).not.toBe(en[key]);
    }
  });
});
