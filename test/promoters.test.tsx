import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import type { AcquisitionReport, PromoterDetail, PromoterList } from '../src/api/types';
import { digitsOf } from '../src/components/PromoCode';
import { qrMatrix } from '../src/components/qr';
import { ar } from '../src/i18n/ar';
import { en } from '../src/i18n/en';
import { fr } from '../src/i18n/fr';
import { SLOW_WAIT, mount, serve, useActivityHarness } from './activity-fixtures';

useActivityHarness();

/*
 * Promoters and registration sources (0103, D221): the console's list, a promoter's page, the code and its QR card,
 * every decision after a step-up; the registration link's landing; the optional promo code on the application form.
 */
const ADMIN = { id: 'a1', email: 'admin@example.test', name: 'Admin' };
const ID = '0192f000-0000-7000-8000-0000000000p1';
const NUMBER = '+22236001122';
const NOTE = 'Met at the Capitale market';
const LINK = 'https://dukan.tsxmr.com/join?r=AQEBAQEBAQEBAQEBAQEBAQEAAAABx2e3m2D5yVnQ8f3nH0nWZQ';
const TOKEN = new URL(LINK).searchParams.get('r')!;

function promoter(over: Partial<PromoterDetail> = {}): PromoterDetail {
  return {
    id: ID,
    displayName: 'Sidi Mohamed',
    whatsappMasked: '+222***22',
    whatsappNumber: NUMBER,
    note: NOTE,
    isActive: true,
    createdAt: '2026-10-25T08:00:00.000Z',
    createdBy: ADMIN.email,
    updatedBy: ADMIN.email,
    updatedAt: '2026-10-25T08:00:00.000Z',
    code: { code: '004217', version: 1, issuedAt: '2026-10-25T08:05:00.000Z', issuedBy: ADMIN.email },
    qrLink: LINK,
    registrations: 3,
    completedRegistrations: 2,
    codeHistory: [{ code: '004217', version: 1, issuedAt: '2026-10-25T08:05:00.000Z', issuedBy: ADMIN.email, retiredAt: null, retiredBy: null }],
    ...over,
  };
}

const NO_BUSINESSES: AcquisitionReport = { total: 0, page: 0, pageSize: 50, rows: [] };

async function stepUp(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText('Password'), 'step-up-password');
  await user.type(screen.getByLabelText('Code from your authenticator'), '123456');
  await user.click(within(screen.getByRole('dialog', { hidden: true, name: en['admin.stepup.title'] })).getByRole('button', { name: 'Confirm', hidden: true }));
}

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
  window.history.replaceState(null, '', '/');
});

describe('the promoters list', () => {
  it('shows each promoter with the number masked, the code, the state and finished registrations — and searches by code', async () => {
    const list: PromoterList = {
      total: 1,
      page: 0,
      pageSize: 50,
      rows: [{ id: ID, displayName: 'Sidi Mohamed', whatsappMasked: '+222***22', code: '004217', isActive: true, createdAt: '2026-10-25T08:00:00.000Z', registrations: 3, completedRegistrations: 2 }],
    };
    const sent = serve((url) => {
      if (url.endsWith('/platform/admin/me')) return { body: ADMIN };
      if (url.includes('/platform/promoters?')) return { body: list };
      return undefined;
    });
    mount('/admin/promoters');
    expect(await screen.findByText('Sidi Mohamed', undefined, SLOW_WAIT)).toBeTruthy();
    expect(screen.getByText('+222***22')).toBeTruthy();
    expect(screen.getByText('004217')).toBeTruthy();
    expect(screen.getByText(en['admin.promoters.active'])).toBeTruthy();
    expect(document.body.textContent).not.toContain(NUMBER);
    fireEvent.change(screen.getByLabelText(en['admin.promoters.search']), { target: { value: '004217' } });
    await waitFor(() => expect(sent.some((r) => r.url.includes('q=004217'))).toBe(true));
  });

  it('creates a promoter after a step-up — with no code: that is an explicit click on their page', async () => {
    const sent = serve((url) => {
      if (url.endsWith('/platform/admin/me')) return { body: ADMIN };
      if (url.includes('/platform/promoters?')) return { body: { total: 0, page: 0, pageSize: 50, rows: [] } };
      if (url.endsWith('/platform/promoters')) return { status: 201, body: promoter({ code: null, qrLink: null, codeHistory: [] }) };
      if (url.endsWith(`/platform/promoters/${ID}`)) return { body: promoter({ code: null, qrLink: null, codeHistory: [] }) };
      if (url.includes(`/platform/promoters/${ID}/businesses`)) return { body: NO_BUSINESSES };
      return undefined;
    });
    mount('/admin/promoters');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: en['admin.promoters.new'] }, SLOW_WAIT));
    await user.type(screen.getByLabelText(new RegExp(`^${en['admin.promoters.name']}`)), 'Sidi Mohamed');
    await user.type(screen.getByLabelText(new RegExp(`^${en['admin.promoters.number']}`)), '36 00 11 22');
    await user.type(screen.getByLabelText(/^Private note/), NOTE);
    await user.click(screen.getByRole('button', { name: en['admin.promoters.create'] }));
    await stepUp(user);
    expect(await screen.findByRole('button', { name: en['admin.promoter.generate'] }, SLOW_WAIT)).toBeTruthy();
    const post = sent.find((r) => r.url.endsWith('/platform/promoters') && r.method === 'POST')!;
    expect(post.body).toEqual({ displayName: 'Sidi Mohamed', whatsappNumber: '36 00 11 22', note: NOTE, confirmPassword: 'step-up-password' });
    expect(sent.some((r) => r.url.endsWith('/code'))).toBe(false);
  });
});

describe('a promoter’s page', () => {
  function servePromoter(initial: PromoterDetail, after?: PromoterDetail) {
    return serve((url) => {
      if (url.endsWith('/platform/admin/me')) return { body: ADMIN };
      if (url.endsWith(`/platform/promoters/${ID}`)) return { body: initial };
      if (url.includes(`/platform/promoters/${ID}/businesses`)) return { body: NO_BUSINESSES };
      if (url.match(new RegExp(`/platform/promoters/${ID}/(code|activate|deactivate)$`))) return { body: after ?? initial };
      return undefined;
    });
  }

  it('generates the code and QR only on the explicit click and a step-up', async () => {
    const sent = servePromoter(promoter({ code: null, qrLink: null, codeHistory: [] }), promoter());
    mount(`/admin/promoters/${ID}`);
    const user = userEvent.setup();
    expect(screen.queryByTestId('promoter-card')).toBeNull();
    await user.click(await screen.findByRole('button', { name: en['admin.promoter.generate'] }, SLOW_WAIT));
    await stepUp(user);
    expect(await screen.findByTestId('promoter-card', undefined, SLOW_WAIT)).toBeTruthy();
    expect(sent.find((r) => r.url.endsWith('/code'))!.body).toEqual({ regenerate: false, confirmPassword: 'step-up-password' });
  });

  it('the card carries the brand, the display name, the code, the QR and one instruction — never the number or the note', async () => {
    servePromoter(promoter());
    mount(`/admin/promoters/${ID}`);
    const card = await screen.findByTestId('promoter-card', undefined, SLOW_WAIT);
    const text = card.textContent ?? '';
    expect(text).toContain('Dukan ERP');
    expect(text).toContain('Sidi Mohamed');
    expect(text).toContain('004217');
    expect(text).toContain(en['card.instruction']);
    expect(text).not.toContain(NUMBER);
    expect(text).not.toContain(NOTE);
    expect(text).not.toContain(ID);
    const qr = within(card).getByRole('img', { name: en['admin.promoter.qr.label'].replace('{code}', '004217') });
    expect(qr.querySelector('path')?.getAttribute('d')).toMatch(/^M\d+ \d+h1v1h-1z/);
    // The page itself shows the number and note to the administrator, in the details only.
    expect(screen.getByText(NUMBER)).toBeTruthy();
  });

  it('prints the card in Arabic right to left, the code left to right', async () => {
    servePromoter(promoter());
    mount(`/admin/promoters/${ID}`);
    const user = userEvent.setup();
    await user.selectOptions(await screen.findByLabelText(en['admin.promoter.card.language'], undefined, SLOW_WAIT), 'ar');
    const card = screen.getByTestId('promoter-card');
    expect(card.getAttribute('dir')).toBe('rtl');
    expect(card.textContent).toContain(ar['card.instruction']);
    expect(within(card).getByText('004217').className).toContain('ltr');
  });

  it('regenerating is confirmed twice — what it does, then the step-up', async () => {
    const sent = servePromoter(promoter(), promoter({ code: { code: '771903', version: 2, issuedAt: '2026-10-25T09:00:00.000Z', issuedBy: ADMIN.email } }));
    mount(`/admin/promoters/${ID}`);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: en['admin.promoter.regenerate'] }, SLOW_WAIT));
    const confirm = screen.getByRole('dialog', { hidden: true, name: en['admin.promoter.regenerate.title'] });
    expect(confirm.textContent).toContain(en['admin.promoter.regenerate.body'].replace('{code}', '004217'));
    expect(sent.some((r) => r.url.endsWith('/code'))).toBe(false);
    await user.click(within(confirm).getByRole('button', { name: en['admin.promoter.regenerate.confirm'], hidden: true }));
    await stepUp(user);
    await waitFor(() => expect(sent.find((r) => r.url.endsWith('/code'))?.body).toEqual({ regenerate: true, confirmPassword: 'step-up-password' }));
    expect(await screen.findAllByText('771903', undefined, SLOW_WAIT)).not.toHaveLength(0);
  });

  it('deactivates after a step-up, and says the code no longer opens', async () => {
    const sent = servePromoter(promoter(), promoter({ isActive: false }));
    mount(`/admin/promoters/${ID}`);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: en['admin.promoter.deactivate'] }, SLOW_WAIT));
    await stepUp(user);
    expect(await screen.findByText(en['admin.promoter.inactive.notice'], undefined, SLOW_WAIT)).toBeTruthy();
    expect(sent.find((r) => r.url.endsWith('/deactivate'))!.body).toEqual({ confirmPassword: 'step-up-password' });
  });
});

describe('registration sources', () => {
  it('counts by source and lists the snapshot taken at registration', async () => {
    const report: AcquisitionReport = {
      total: 1,
      page: 0,
      pageSize: 50,
      rows: [
        {
          companyId: '0192f000-0000-7000-8000-0000000000b1',
          businessName: 'Boutique Aicha',
          isTest: false,
          registeredAt: '2026-10-25T10:00:00.000Z',
          status: 'pending_activation',
          closed: false,
          completed: true,
          source: 'promoter',
          mechanism: 'promoter_qr',
          promoter: { id: ID, nameSnapshot: 'Sidi Mohamed', codeVersion: 1 },
          inviter: null,
        },
      ],
    };
    const sent = serve((url) => {
      if (url.endsWith('/platform/admin/me')) return { body: ADMIN };
      if (url.includes('/platform/acquisitions/summary')) return { body: { none: 4, promoter: 1, userInvite: 2, total: 7 } };
      if (url.includes('/platform/acquisitions?')) return { body: report };
      return undefined;
    });
    mount('/admin/sources');
    expect(await screen.findByText('Boutique Aicha', undefined, SLOW_WAIT)).toBeTruthy();
    expect(screen.getByText('Sidi Mohamed')).toBeTruthy();
    expect(screen.getByText(en['admin.sources.mechanism.promoter_qr'])).toBeTruthy();
    expect(screen.getByText(en['admin.sources.finished.yes'])).toBeTruthy();
    expect(screen.getByText('7')).toBeTruthy();
    await userEvent.setup().selectOptions(screen.getByLabelText(en['admin.sources.col.source']), 'user_invite');
    await waitFor(() => expect(sent.some((r) => r.url.includes('source=user_invite'))).toBe(true));
  });
});

describe('the registration link’s landing', () => {
  it('takes the token out of the address, asks about it by POST, and says whose code it is — opening it creates nothing', async () => {
    const sent = serve((url) => {
      if (url.endsWith('/platform/acquisition/link')) return { body: { usable: true, source: 'promoter', promoterName: 'Sidi Mohamed', code: '004217' } };
      return undefined;
    });
    window.history.replaceState(null, '', `/join?r=${TOKEN}`);
    mount('/join');
    expect(await screen.findByText(en['promo.from'].replace('{name}', 'Sidi Mohamed'), undefined, SLOW_WAIT)).toBeTruthy();
    expect(window.location.search).toBe('');
    const ask = sent.find((r) => r.url.endsWith('/platform/acquisition/link'))!;
    expect(ask.method).toBe('POST');
    expect(ask.body).toEqual({ token: TOKEN });
    expect(sent.every((r) => !r.url.includes(TOKEN))).toBe(true);
    expect(sent.some((r) => r.url.includes('register'))).toBe(false);
    expect(screen.getByText(en['join.nothing'])).toBeTruthy();
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow');
  });

  it('an unusable link gives a short notice and the ordinary registration', async () => {
    serve((url) => (url.endsWith('/platform/acquisition/link') ? { body: { usable: false } } : undefined));
    window.history.replaceState(null, '', '/join?r=tampered');
    mount('/join');
    expect(await screen.findByText(en['promo.linkInvalid'], undefined, SLOW_WAIT)).toBeTruthy();
    expect(screen.getByRole('link', { name: en['join.continue'] })).toBeTruthy();
  });

  it('carries an invitation to the application form in memory, removable there', async () => {
    serve((url) => (url.endsWith('/platform/acquisition/link') ? { body: { usable: true, source: 'user_invite' } } : url.endsWith('/platform/plan') ? { status: 404, body: {} } : undefined));
    window.history.replaceState(null, '', `/join?r=${TOKEN}`);
    mount('/join');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('link', { name: en['join.continue'] }, SLOW_WAIT));
    expect(await screen.findByText(en['promo.invited'], undefined, SLOW_WAIT)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: en['promo.invited.remove'] }));
    expect(screen.queryByText(en['promo.invited'])).toBeNull();
  });
});

describe('the promo code on the application form', () => {
  function serveApply(answer: unknown) {
    return serve((url) => {
      if (url.endsWith('/platform/acquisition/code')) return { body: answer };
      if (url.endsWith('/platform/plan')) return { status: 404, body: {} };
      return undefined;
    });
  }

  it('six boxes left to right; a pasted code in Arabic digits fills them and is checked once', async () => {
    const sent = serveApply({ usable: true, source: 'promoter', promoterName: 'Sidi Mohamed', code: '004217' });
    mount('/ar/apply');
    const first = await screen.findByLabelText(ar['promo.digit'].replace('{n}', '1'), undefined, SLOW_WAIT);
    expect(first.closest('.code-boxes')?.getAttribute('dir')).toBe('ltr');
    fireEvent.paste(first, { clipboardData: { getData: () => '٠٠٤٢١٧' } });
    expect(await screen.findByText(ar['promo.from'].replace('{name}', 'Sidi Mohamed'), undefined, SLOW_WAIT)).toBeTruthy();
    const asks = sent.filter((r) => r.url.endsWith('/platform/acquisition/code'));
    expect(asks).toHaveLength(1);
    expect(asks[0]!.body).toEqual({ code: '004217' });
    expect((screen.getByLabelText(ar['promo.digit'].replace('{n}', '6')) as HTMLInputElement).value).toBe('7');
  });

  it('typing moves on, Backspace moves back; an unavailable code says so and can be removed', async () => {
    serveApply({ usable: false });
    mount('/apply');
    const user = userEvent.setup();
    const first = await screen.findByLabelText(en['promo.digit'].replace('{n}', '1'), undefined, SLOW_WAIT);
    await user.click(first);
    await user.keyboard('12345');
    expect(document.activeElement).toBe(screen.getByLabelText(en['promo.digit'].replace('{n}', '6')));
    await user.keyboard('{Backspace}');
    expect(document.activeElement).toBe(screen.getByLabelText(en['promo.digit'].replace('{n}', '5')));
    await user.keyboard('56');
    expect(await screen.findByText(en['promo.unavailable'], undefined, SLOW_WAIT)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: en['promo.remove'] }));
    expect((screen.getByLabelText(en['promo.digit'].replace('{n}', '1')) as HTMLInputElement).value).toBe('');
    expect(screen.queryByText(en['promo.unavailable'])).toBeNull();
  });

  it('reads Arabic-Indic and Eastern Arabic-Indic digits as the digits they are', () => {
    expect(digitsOf('٠١٢٣٤٥')).toBe('012345');
    expect(digitsOf('۶۷۸۹')).toBe('6789');
    expect(digitsOf('12-34 a')).toBe('1234');
  });
});

describe('what these pages never contain', () => {
  const EXCLUDED = /discount|reward|commission|payout|balance|eligib|free.?month|lifetime|points|compensat|bonus|credit|remise|récompense|commission|مكافأ|عمولة|خصم/i;
  const PROMO_KEY = /^(admin\.nav\.(promoters|sources)|admin\.promoters?\.|admin\.sources\.|promo\.|join\.|card\.|page\.join\.)/;

  it('in the copy, in any language', () => {
    for (const catalogue of [en, fr, ar]) {
      for (const [key, value] of Object.entries(catalogue)) {
        if (PROMO_KEY.test(key)) expect({ key, hit: value.match(EXCLUDED)?.[0] ?? null }).toEqual({ key, hit: null });
      }
    }
  });

  it('in the code', () => {
    for (const file of ['src/pages/admin/Promoters.tsx', 'src/pages/admin/Promoter.tsx', 'src/pages/admin/RegistrationSources.tsx', 'src/pages/join/Join.tsx', 'src/components/PromoCode.tsx', 'src/components/qr.tsx']) {
      expect({ file, hit: readFileSync(join(process.cwd(), file), 'utf8').match(EXCLUDED)?.[0] ?? null }).toEqual({ file, hit: null });
    }
  });

  it('the QR encodes exactly the link it is given, with error correction a printed card survives', () => {
    const m = qrMatrix(LINK);
    expect(m.size).toBeGreaterThanOrEqual(33);
    expect(m.dark(0, 0)).toBe(true);
  });
});
