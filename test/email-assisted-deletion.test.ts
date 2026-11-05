import { describe, expect, it } from 'vitest';
import { releaseVerdicts } from '../src/config/gates';
import { DELETION_CHANNELS } from '../src/config/schema';
import { accountDeletion } from '../src/content/legal-deletion';
import { privacy } from '../src/content/legal-privacy';

/*
 * Email-assisted deletion at launch (owner, 2026-11-05). The in-app path stays, with its WhatsApp code once delivery
 * works; until then — or for anyone who cannot reach the app — support@ verifies the person and carries out the
 * deletion. Only the PORTAL gate's proof changes: the App Store gate still waits for WhatsApp working end to end.
 */
const PORTAL_INPUTS = {
  VITE_SITE_SURFACE: 'portal',
  VITE_API_BASE: 'https://api.tsxmr.com/api/v1',
  VITE_PORTAL_ORIGIN: 'https://dukan.tsxmr.com',
  VITE_PUBLIC_SITE_ORIGIN: 'https://tsxmr.com',
  VITE_PORTAL_BACKEND_RELEASE: '0'.repeat(40),
  VITE_PORTAL_LAUNCH_CHANNEL: 'whatsapp',
  VITE_PORTAL_EMAIL_CHANNEL: 'disabled',
  VITE_LEGAL_EFFECTIVE_DATE: '2026-11-04',
  VITE_SUPPORT_HOURS: 'Sunday–Thursday, 09:00–17:00, Nouakchott time',
  VITE_SUPPORT_LANGUAGES: 'Arabic, French and English',
  VITE_SUPPORT_RESPONSE_TIME: 'We aim to respond within two working days',
};
const verdict = (gate: string, env: Record<string, string>) => releaseVerdicts(env).find((v) => v.gate === gate)!;
const deletionProblems = (gate: string, env: Record<string, string>) =>
  verdict(gate, env).problems.filter((p) => p.env === 'VITE_ACCOUNT_DELETION_CHANNEL');

describe('the deletion channel at launch', () => {
  it('is one of two known values, nothing else', () => {
    expect([...DELETION_CHANNELS]).toEqual(['whatsapp', 'email-assisted']);
    expect(deletionProblems('PORTAL', { ...PORTAL_INPUTS, VITE_ACCOUNT_DELETION_CHANNEL: 'email' })).toHaveLength(1);
    expect(deletionProblems('PORTAL', PORTAL_INPUTS)).toHaveLength(1);
  });

  it('the portal launches with email-assisted deletion, or with WhatsApp', () => {
    for (const channel of ['email-assisted', 'whatsapp']) {
      expect(deletionProblems('PORTAL', { ...PORTAL_INPUTS, VITE_ACCOUNT_DELETION_CHANNEL: channel })).toEqual([]);
    }
  });

  it('the App Store gate still waits for WhatsApp deletion working end to end', () => {
    expect(deletionProblems('APP_STORE', { ...PORTAL_INPUTS, VITE_ACCOUNT_DELETION_CHANNEL: 'email-assisted' })).toHaveLength(1);
    expect(deletionProblems('APP_STORE', { ...PORTAL_INPUTS, VITE_ACCOUNT_DELETION_CHANNEL: 'whatsapp' })).toEqual([]);
  });
});

describe('the deletion page 1.1', () => {
  const help = (lang: 'en' | 'fr' | 'ar') =>
    JSON.stringify(accountDeletion[lang].sections.find((s) => s.id === 'help'));

  it('is version 1.1, approved, in every language', () => {
    for (const lang of ['en', 'fr', 'ar'] as const) expect([accountDeletion[lang].version, accountDeletion[lang].status]).toEqual(['1.1', 'approved']);
  });

  it('says the owner-approved wording, with the support address, in EN, FR and AR', () => {
    expect(help('en')).toContain('If code delivery is unavailable or you cannot access the app, contact {supportEmail}.');
    expect(help('en')).toContain('support will process the request and confirm completion.');
    expect(help('fr')).toContain('Si l’envoi du code est indisponible ou si vous ne pouvez pas accéder à l’application, contactez {supportEmail}.');
    expect(help('fr')).toContain('l’assistance traitera la demande et confirmera son exécution.');
    expect(help('ar')).toContain('إذا تعذر إرسال الرمز أو لم تتمكن من الوصول إلى التطبيق، فتواصل مع {supportEmail}.');
    expect(help('ar')).toContain('سيعالج فريق الدعم الطلب ويؤكد اكتماله.');
  });
});

describe('the privacy policy 1.1', () => {
  it('says the same deletion path, in the owner-approved wording, in EN, FR and AR', () => {
    for (const lang of ['en', 'fr', 'ar'] as const) expect(privacy[lang].version).toBe('1.1');
    expect(JSON.stringify(privacy.en)).toContain('If code delivery is unavailable or you cannot access the app, contact {supportEmail}.');
    expect(JSON.stringify(privacy.fr)).toContain('conformément à la politique de suppression de compte et confirmera son exécution.');
    expect(JSON.stringify(privacy.ar)).toContain('سيعالج فريق الدعم الطلب وفقًا لسياسة حذف الحساب ويؤكد اكتماله.');
    expect(JSON.stringify(privacy.en)).not.toContain('the deletion is confirmed with a code');
  });
});
