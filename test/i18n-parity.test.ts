import { describe, expect, it } from 'vitest';
import { en } from '../src/i18n/en';
import { fr } from '../src/i18n/fr';
import { ar } from '../src/i18n/ar';

/** Words that are legitimately the same in every language. */
const SAME_EVERYWHERE = new Set(['WhatsApp', 'E-mail', 'Email', 'MRU', 'Mobile money', 'Action', 'Version {n}']);

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
        expect({ key, bankily: /bankily/i.test(v) }).toEqual({ key, bankily: false });
        expect({ key, payNow: /pay now|payer maintenant|ادفع الآن/.test(v) }).toEqual({ key, payNow: false });
      }
    }
  });
});
