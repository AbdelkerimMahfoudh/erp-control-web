import type { Language } from '../i18n/languages';
import type { SiteInputs } from '../config/schema';

/**
 * Who stands behind the name, in one sentence a legal text names as `{operatorStatus}` (the owner's brief of
 * 2026-10-17, third). TSX-MR is today a project and trading name operated by one individual, with no separate company:
 * the sentence says so, and says nothing about a legal form or a registration that does not exist. Should a company be
 * formed, `VITE_OPERATOR_TYPE=company` makes the same texts name it instead.
 *
 * The sentence names the operator once and defines the short reference the rest of the text uses — "the operator"
 * (the owner's brief of 2026-10-17, fourth) — so each legal text identifies who is accountable, and stays readable on
 * its own, without repeating the name. It avoids any pronoun or agreement for the operator (the Arabic refers back to
 * «شخص», "person", not to the person): nothing about the person is assumed beyond what the owner gave.
 */
const STATUS: Record<Language, Record<'individual' | 'company', (s: Pick<SiteInputs, 'displayName' | 'legalName'>) => string>> = {
  en: {
    // The owner's wording (2026-11-04): an individual developer, the product and project names, no incorporated company.
    individual: (s) => `Dukan ERP is an independently developed digital service operated in Mauritania by ${s.legalName}, an individual developer, under the Dukan ERP product name and the ${s.displayName} project name. Dukan ERP and ${s.displayName} are not incorporated companies.`,
    company: (s) => `${s.displayName} is a trading name of ${s.legalName} (“the operator”).`,
  },
  fr: {
    individual: (s) => `Dukan ERP est un service numérique développé de manière indépendante et exploité en Mauritanie par ${s.legalName}, développeur individuel, sous le nom de produit Dukan ERP et le nom de projet ${s.displayName}. Dukan ERP et ${s.displayName} ne sont pas des sociétés constituées.`,
    company: (s) => `${s.displayName} est un nom commercial de ${s.legalName} (ci-après « l’exploitant »).`,
  },
  ar: {
    individual: (s) => `Dukan ERP خدمة رقمية مطوّرة بصورة مستقلة ويشغّلها في موريتانيا ${s.legalName} بصفته مطوّرًا فرديًا، تحت اسم المنتج Dukan ERP واسم المشروع ${s.displayName}. ولا يُعدّ Dukan ERP أو ${s.displayName} شركةً مسجّلة.`,
    company: (s) => `${s.displayName} اسم تجاري لـ${s.legalName}، ويُشار إلى هذه الجهة فيما يلي بـ«المشغّل».`,
  },
};

export function operatorStatus(lang: Language, site: Pick<SiteInputs, 'displayName' | 'legalName' | 'operatorType'>): string {
  if (!site.legalName) return '';
  return STATUS[lang][site.operatorType === 'company' ? 'company' : 'individual'](site);
}
