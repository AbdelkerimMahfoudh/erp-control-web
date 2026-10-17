import { describe, expect, it } from 'vitest';
import { dukanErpFor, homeFor, PRELAUNCH_DOCUMENTS, PRELAUNCH_LEGAL_DOCUMENTS, publishedBlockers, publishedDrafts, publishedPlaceholders, stringsOf } from '../src/content';
import { homePrelaunch, dukanErpPrelaunch } from '../src/content/prelaunch';
import { blockersIn, inputsIn, shapeOf, textsOf } from '../src/content/types';
import { INPUTS } from '../src/config/schema';
import { EXTERNAL_CONDITIONS, releaseVerdicts } from '../src/config/gates';

/**
 * The pre-launch public website (docs/96): its texts in three languages, the absence of any claim that the service
 * works, and the three release verdicts.
 */
const LANGS = ['en', 'fr', 'ar'] as const;
const KNOWN_INPUTS = new Set([...Object.keys(INPUTS), 'deletionChannelName', 'operatorStatus', 'postalAddress', 'productName']);

/** Everything a visitor of the pre-launch website reads, per language. */
function prelaunchTexts(lang: (typeof LANGS)[number]): string[] {
  const dukan = dukanErpFor(lang, 'public');
  return [
    ...Object.values(PRELAUNCH_DOCUMENTS).flatMap((d) => textsOf(d[lang])),
    ...stringsOf(homeFor(lang, 'public')),
    ...stringsOf({ ...dukan, subscription: null }),
  ];
}

describe('the pre-launch texts', () => {
  it('have the same sections, blocks and list lengths in every language', () => {
    for (const [name, doc] of Object.entries(PRELAUNCH_DOCUMENTS)) {
      expect({ name, fr: shapeOf(doc.fr) }).toEqual({ name, fr: shapeOf(doc.en) });
      expect({ name, ar: shapeOf(doc.ar) }).toEqual({ name, ar: shapeOf(doc.en) });
    }
    for (const lang of ['fr', 'ar'] as const) {
      expect(dukanErpPrelaunch[lang].start.steps).toHaveLength(dukanErpPrelaunch.en.start.steps.length);
      for (const [name, value] of [['home', homePrelaunch], ['dukanErp', dukanErpPrelaunch]] as const) {
        expect({ name, lang, inputs: inputsIn(stringsOf(value[lang])) }).toEqual({ name, lang, inputs: inputsIn(stringsOf(value.en)) });
      }
    }
  });

  it('name only inputs the public gate requires or the site always has, and carry no blocker', () => {
    for (const lang of LANGS) {
      const texts = prelaunchTexts(lang);
      expect(blockersIn(texts)).toEqual([]);
      for (const input of inputsIn(texts)) expect({ lang, input, known: KNOWN_INPUTS.has(input) }).toEqual({ lang, input, known: true });
      // A pre-launch text never names a value only the portal or the app gate requires.
      for (const input of inputsIn(texts)) expect({ lang, input }).not.toEqual({ lang, input: expect.stringMatching(/^(apiBase|portalOrigin|deletionChannel|deletionChannelName|supportHours|supportResponseTime)$/) });
    }
  });

  it('never claim that registration, sign-in, a trial, a subscription, a payment or account deletion works today', () => {
    const CLAIMS: Record<(typeof LANGS)[number], RegExp> = {
      en: /\b(apply (online|on this website)|sign in (to|with) (the|your)|free trial|7-day|subscription (period|is|status)|managed on this website|available today|businesses that use it|is deleted in the app|sign the lost one out)\b/i,
      fr: /(essai gratuit|7 jours|inscrivez-vous|connectez-vous|disponibles aujourd’hui|gérés sur ce site|se supprime dans l’application)/i,
      ar: /(تجربة مجانية|7 أيام|سجّلوا الآن|متاحة اليوم|تُدار على هذا الموقع)/,
    };
    for (const lang of LANGS) for (const t of prelaunchTexts(lang)) expect({ lang, t, claim: CLAIMS[lang].test(t) }).toEqual({ lang, t, claim: false });
  });

  it('say plainly in every language that Dukan ERP is not yet open for public registration', () => {
    const SAYS: Record<(typeof LANGS)[number], RegExp> = { en: /not yet open for public registration/, fr: /pas encore ouvert aux inscriptions/, ar: /غير مفتوح للعموم بعد/ };
    for (const lang of LANGS) {
      for (const name of ['accountDeletion', 'legalNotice', 'about', 'contact'] as const) {
        expect({ lang, name, says: textsOf(PRELAUNCH_DOCUMENTS[name][lang]).some((t) => SAYS[lang].test(t)) }).toEqual({ lang, name, says: true });
      }
      expect({ lang, intro: SAYS[lang].test(dukanErpFor(lang, 'public').intro) }).toEqual({ lang, intro: true });
      expect({ lang, cta: SAYS[lang].test(homeFor(lang, 'public').cta.body) }).toEqual({ lang, cta: true });
    }
  });

  it('are approved by TSX-MR (2026-10-17, docs/97 §1: version 1.0 in every language), and none is a placeholder', () => {
    for (const [name, doc] of Object.entries(PRELAUNCH_LEGAL_DOCUMENTS)) for (const lang of LANGS) expect({ name, lang, status: doc[lang].status, version: doc[lang].version }).toEqual({ name, lang, status: 'approved', version: '1.0' });
    expect(publishedDrafts('public')).toEqual([]);
    expect(publishedPlaceholders('public')).toEqual([]);
    expect(publishedBlockers('public')).toEqual([]);
  });

  it('leave the service texts — the portal and the app — exactly as strict as before', () => {
    expect(publishedBlockers('full').length).toBeGreaterThan(0);
    expect(publishedDrafts('full')).toEqual(['accountDeletion', 'legalNotice', 'privacy', 'privacyChoices', 'security', 'terms']);
  });
});

describe('the three release verdicts', () => {
  /** TSX-MR as a company would be (the PORTAL fixtures elsewhere use the same shape). */
  const REAL_PUBLIC = {
    VITE_PUBLIC_SITE_ORIGIN: 'https://tsxmr.com',
    VITE_OPERATOR_TYPE: 'company',
    VITE_ORGANIZATION_LEGAL_NAME: 'Registered Name SARL',
    VITE_ORGANIZATION_LEGAL_FORM: 'SARL',
    VITE_ORGANIZATION_REGISTRATION_NUMBER: 'RC 0000',
    VITE_ORGANIZATION_CITY: 'Nouakchott',
    VITE_ORGANIZATION_ADDRESS: 'Street 1',
    VITE_SUPPORT_EMAIL: 'support@company-domain.mr',
    VITE_PRIVACY_EMAIL: 'privacy@company-domain.mr',
    VITE_SECURITY_EMAIL: 'security@company-domain.mr',
    VITE_LEGAL_EFFECTIVE_DATE: '2026-11-01',
  };

  it('TSX-MR as it is today — an individual operator, address and phones given, the six texts approved — waits on exactly one thing: the effective date, the deployment day', () => {
    const [pub] = releaseVerdicts({ VITE_PUBLIC_SITE_ORIGIN: 'https://tsxmr.com', VITE_ORGANIZATION_PHONE: '+222 36 96 38 39, +222 37 67 68 27' });
    expect(pub!.problems.map((p) => `${p.problem}:${p.env ?? p.detail.split(':')[0]}`)).toEqual(['missing:VITE_LEGAL_EFFECTIVE_DATE']);
  });

  it('with no environment, all three are NO-GO, each for its own reasons', () => {
    const [pub, portal, app] = releaseVerdicts({});
    expect([pub!.gate, portal!.gate, app!.gate]).toEqual(['PUBLIC_WEBSITE', 'PORTAL', 'APP_STORE']);
    expect([pub!.go, portal!.go, app!.go]).toEqual([false, false, false]);
    expect(pub!.problems.some((p) => p.env === 'VITE_API_BASE' || p.env === 'VITE_ACCOUNT_DELETION_CHANNEL')).toBe(false);
  });

  it('with the TSX-MR facts given and the six texts approved, the public website is GO', () => {
    const [pub] = releaseVerdicts(REAL_PUBLIC);
    expect(pub!.problems).toEqual([]);
    expect(pub!.go).toBe(true);
  });

  it('the portal and the App Store stay closed, whatever the website’s facts: they need proof from outside this repository', () => {
    const [, portal, app] = releaseVerdicts({ ...REAL_PUBLIC, VITE_API_BASE: 'https://api.tsxmr.com/api/v1', VITE_ACCOUNT_DELETION_CHANNEL: 'whatsapp' });
    expect(portal!.go).toBe(false);
    expect(app!.go).toBe(false);
    for (const detail of EXTERNAL_CONDITIONS.PORTAL) expect(portal!.problems.map((p) => p.detail)).toContain(`not proven here: ${detail}`);
    for (const detail of EXTERNAL_CONDITIONS.APP_STORE) expect(app!.problems.map((p) => p.detail)).toContain(`not proven here: ${detail}`);
    expect(EXTERNAL_CONDITIONS.APP_STORE.join(' ')).toMatch(/WhatsApp/);
    // The service's texts are still drafts with blockers: the app's gate lists them.
    expect(app!.problems.some((p) => p.problem === 'legal_draft')).toBe(true);
    expect(app!.problems.some((p) => p.problem === 'legal_blocker')).toBe(true);
  });

  it('the App Store gate asks for the WhatsApp deletion channel', () => {
    const [, , app] = releaseVerdicts(REAL_PUBLIC);
    expect(app!.problems.find((p) => p.env === 'VITE_ACCOUNT_DELETION_CHANNEL')?.problem).toBe('missing');
  });
});
