import { describe, expect, it } from 'vitest';
import { en } from '../src/i18n/en';
import { fr } from '../src/i18n/fr';
import { ar } from '../src/i18n/ar';

/**
 * Words that are legitimately the same in every language. `{from} → {to}` is
 * no word at all — two placeholders and an arrow (the activity change, docs/73
 * §6); Arabic still writes its own, pointing the way the line reads.
 */
const SAME_EVERYWHERE = new Set([
  'WhatsApp', 'E-mail', 'Email', 'MRU', 'Mobile money', 'Action', 'Version {n}', '{from} → {to}',
  // The public site (docs/74): names (the product, the stores) and words French writes as English does.
  'Dukan ERP', 'App Store', 'Google Play', 'Menu', 'Contact', 'Version {version}', '© {year} {name}', 'Administration — {name}',
]);

/**
 * The one key allowed to name a provider (D154, docs/73 §6): what a money
 * services agent DOES — exchange cash for Bankily, Sedad or other providers'
 * digital credit. That is the shop's own trade, not a way to pay the platform,
 * so it is checked below to carry no payment wording at all. Every other key
 * still may not name a provider: the payment boundary is unchanged.
 */
const NAMES_THE_AGENT_TRADE = new Set(['activity.money_agent.body']);

/**
 * The free trial (2026-10-13) replaced "there is no free trial": one 7-day trial per self-registered business, claimed
 * on this website by its Owner, nothing paid. Its words may appear in the trial's own keys and in the few public
 * sentences that say what it is — anywhere else a trial would be promised by accident, so a new mention elsewhere
 * fails here until it is added on purpose. No trial sentence names an amount: the trial is free, and paid access is
 * arranged apart from it. The history tells the trial's own events (`event.trial_*`) in words of their own.
 */
const TRIAL_KEY = /^(trial\.|status\.trial_|status\.explain\.trial_|admin\.trial\.|event\.trial_)/;
const DESCRIBES_THE_TRIAL = new Set(['home.pricing.rules', 'apply.lead', 'apply.done.trial', 'page.apply.description']);
const TRIAL_WORD = /\btrial|essai|تجريب/;

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

describe('the three catalogues', () => {
  it('carry exactly the same keys', () => {
    const keys = Object.keys(en).sort();
    expect(Object.keys(fr).sort()).toEqual(keys);
    expect(Object.keys(ar).sort()).toEqual(keys);
  });

  it('never leave a French or Arabic string merely copied from English', () => {
    for (const [key, value] of Object.entries(en)) {
      if (SAME_EVERYWHERE.has(value)) continue;
      expect({ key, fr: fr[key as keyof typeof en] }).not.toEqual({ key, fr: value });
      expect({ key, ar: ar[key as keyof typeof en] }).not.toEqual({ key, ar: value });
    }
  });

  it('keep every placeholder in every language', () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect({ key, fr: placeholders(fr[key]) }).toEqual({ key, fr: placeholders(en[key]) });
      expect({ key, ar: placeholders(ar[key]) }).toEqual({ key, ar: placeholders(en[key]) });
    }
  });

  it('has no empty string anywhere', () => {
    for (const cat of [en, fr, ar]) for (const [key, value] of Object.entries(cat)) expect({ key, empty: value.trim() === '' }).toEqual({ key, empty: false });
  });

  it('names the free trial only where it is described on purpose, and never a pay button or a provider', () => {
    for (const cat of [en, fr, ar]) {
      for (const [key, value] of Object.entries(cat)) {
        const v = value.toLowerCase();
        if (TRIAL_WORD.test(v)) expect({ key, describesTheTrial: TRIAL_KEY.test(key) || DESCRIBES_THE_TRIAL.has(key) }).toEqual({ key, describesTheTrial: true });
        if (TRIAL_KEY.test(key)) expect({ key, amount: /\{(amount|price|difference)\}|mru/.test(v) }).toEqual({ key, amount: false });
        if (NAMES_THE_AGENT_TRADE.has(key)) expect({ key, payment: /\bpa(y|ie|yer|iement)|دفع|ادفع/.test(v) }).toEqual({ key, payment: false });
        else expect({ key, bankily: /bankily/i.test(v) }).toEqual({ key, bankily: false });
        expect({ key, payNow: /pay now|payer maintenant|ادفع الآن/.test(v) }).toEqual({ key, payNow: false });
      }
    }
  });

  it('says the trial the same way everywhere: seven days, free, claimed by the Owner with one named button', () => {
    for (const cat of [en, fr, ar]) {
      for (const key of [...DESCRIBES_THE_TRIAL, 'trial.title', 'trial.claim', 'trial.terms.start'] as (keyof typeof en)[]) {
        expect({ key, sevenDays: /\b7\b/.test(cat[key]) }).toEqual({ key, sevenDays: true });
      }
      expect(cat['trial.terms.start']).toMatch(/\b168\b/);
    }
    // The button's words, exactly as the setup message tells the Owner to press it.
    expect([en['trial.claim'], fr['trial.claim'], ar['trial.claim']]).toEqual([
      'Start my 7-day free trial',
      'Démarrer mon essai gratuit de 7 jours',
      'ابدأ فترتي التجريبية المجانية لمدة 7 أيام',
    ]);
  });

  it('says a store or seat paid for during the trial as its own status, never the renewal’s, and its start by date alone (D176)', () => {
    for (const cat of [en, fr, ar]) {
      // "Paid · scheduled" is not "Scheduled for the renewal": an activity change keeps that key to itself.
      expect(cat['account.requests.status.paidScheduled']).not.toBe(cat['account.requests.status.scheduled']);
      expect(TRIAL_WORD.test(cat['account.requests.status.paidScheduled'].toLowerCase())).toBe(false);
      for (const key of ['trial.addons.storeAtEnd', 'trial.addons.seatAtEnd', 'trial.addons.note'] as const) expect({ key, placeholders: placeholders(cat[key]) }).toEqual({ key, placeholders: 'date' });
      for (const key of ['trial.addons.waitsForPaidAccess', 'trial.addons.paidNote'] as const) expect({ key, placeholders: placeholders(cat[key]) }).toEqual({ key, placeholders: '' });
    }
  });

  it('never calls an independent agent a bank employee (D154, D157)', () => {
    for (const cat of [en, fr, ar]) {
      for (const [key, value] of Object.entries(cat)) {
        expect({ key, bankEmployee: /bank employee|employée? de (la )?banque|موظف (ال)?(بنك|مصرف)/i.test(value) }).toEqual({ key, bankEmployee: false });
      }
    }
    for (const cat of [en, fr, ar]) expect(cat['activity.money_agent.body']).toMatch(/independent|indépendant|مستقل/);
  });
});
