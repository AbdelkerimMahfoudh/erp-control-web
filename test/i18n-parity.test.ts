import { describe, expect, it } from 'vitest';
import { en } from '../src/i18n/en';
import { fr } from '../src/i18n/fr';
import { ar } from '../src/i18n/ar';

/**
 * Words that are legitimately the same in every language. `{from} → {to}` is
 * no word at all — two placeholders and an arrow (the activity change, docs/73
 * §6); Arabic still writes its own, pointing the way the line reads.
 */
const SAME_EVERYWHERE = new Set(['WhatsApp', 'E-mail', 'Email', 'MRU', 'Mobile money', 'Action', 'Version {n}', '{from} → {to}']);

/**
 * The one key allowed to name a provider (D154, docs/73 §6): what a money
 * services agent DOES — exchange cash for Bankily, Sedad or other providers'
 * digital credit. That is the shop's own trade, not a way to pay the platform,
 * so it is checked below to carry no payment wording at all. Every other key
 * still may not name a provider: the payment boundary is unchanged.
 */
const NAMES_THE_AGENT_TRADE = new Set(['activity.money_agent.body']);

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

  it('never promises a free trial, a pay button or a provider', () => {
    for (const cat of [en, fr, ar]) {
      for (const [key, value] of Object.entries(cat)) {
        const v = value.toLowerCase();
        // "trial" may appear only inside a denial.
        if (/(trial|essai|تجريب)/.test(v)) expect({ key, denial: /(no |not |ni |pas d|aucun|لا )/.test(v) }).toEqual({ key, denial: true });
        if (NAMES_THE_AGENT_TRADE.has(key)) expect({ key, payment: /\bpa(y|ie|yer|iement)|دفع|ادفع/.test(v) }).toEqual({ key, payment: false });
        else expect({ key, bankily: /bankily/i.test(v) }).toEqual({ key, bankily: false });
        expect({ key, payNow: /pay now|payer maintenant|ادفع الآن/.test(v) }).toEqual({ key, payNow: false });
      }
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
