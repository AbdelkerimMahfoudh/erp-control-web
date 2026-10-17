import type { Language } from '../i18n/languages';
import type { LegalDocument } from './types';

/**
 * The legal notice (`/legal`): who publishes this website and operates Dukan ERP. Every identity fact is an input
 * TSX-MR supplies (`config/schema.ts`) — a production build refuses while one is blank — and nothing is named that TSX-MR
 * has not confirmed. `{operatorStatus}` says whether an individual or a company operates the name; the person
 * responsible for publication is the one TSX-MR designated (2026-10-17); the host still waits on its contract. A DRAFT,
 * not legal advice.
 */
export const legalNotice: Record<Language, LegalDocument> = {
  en: {
    version: '1.0 (draft)',
    status: 'draft',
    title: 'Legal notice',
    summary: 'Who publishes this website and operates Dukan ERP, and how to reach them.',
    sections: [
      {
        id: 'entity',
        heading: 'Publisher and operator',
        blocks: [
          { kind: 'p', text: '{operatorStatus} This website and the Dukan ERP service are published and operated under that name.' },
          { kind: 'p', text: 'Dukan ERP is the name of the product; {displayName} is the name under which it is developed and operated.' },
        ],
      },
      {
        id: 'responsible',
        heading: 'Person responsible for publication',
        blocks: [{ kind: 'p', text: 'The person responsible for publication is {publicationDirector}.' }],
      },
      {
        id: 'hosting',
        heading: 'Hosting',
        blocks: [{ kind: 'p', text: 'The providers that host this website and the Dukan ERP service are named here once {displayName} has contracted them. [[blocker:processors]]' }],
      },
      {
        id: 'contact',
        heading: 'Contact',
        blocks: [{ kind: 'p', text: 'Write to the address that matches your question:' }],
      },
      {
        id: 'ip',
        heading: 'Copyright and trademarks',
        blocks: [
          { kind: 'p', text: 'The texts, design and software of this website and of Dukan ERP belong to the operator, unless a notice says otherwise. They may not be copied or reused without written permission.' },
          { kind: 'p', text: 'The names of the mobile-money and payment services a shop records in Dukan ERP belong to their owners. Showing them does not mean those services endorse Dukan ERP or are connected with it.' },
        ],
      },
    ],
  },
  fr: {
    version: '1.0 (projet)',
    status: 'draft',
    title: 'Mentions légales',
    summary: 'Qui publie ce site et exploite Dukan ERP, et comment les joindre.',
    sections: [
      {
        id: 'entity',
        heading: 'Éditeur et exploitant',
        blocks: [
          { kind: 'p', text: '{operatorStatus} Ce site et le service Dukan ERP sont édités et exploités sous ce nom.' },
          { kind: 'p', text: 'Dukan ERP est le nom du produit ; {displayName} est le nom sous lequel il est développé et exploité.' },
        ],
      },
      {
        id: 'responsible',
        heading: 'Responsable de la publication',
        blocks: [{ kind: 'p', text: 'La personne responsable de la publication est {publicationDirector}.' }],
      },
      {
        id: 'hosting',
        heading: 'Hébergement',
        blocks: [{ kind: 'p', text: 'Les prestataires qui hébergent ce site et le service Dukan ERP seront indiqués ici dès que {displayName} aura conclu un contrat avec eux. [[blocker:processors]]' }],
      },
      {
        id: 'contact',
        heading: 'Contact',
        blocks: [{ kind: 'p', text: 'Écrivez à l’adresse qui correspond à votre question :' }],
      },
      {
        id: 'ip',
        heading: 'Droits d’auteur et marques',
        blocks: [
          { kind: 'p', text: 'Les textes, la conception et les logiciels de ce site et de Dukan ERP appartiennent à l’exploitant, sauf mention contraire. Ils ne peuvent être copiés ni réutilisés sans autorisation écrite.' },
          { kind: 'p', text: 'Les noms des services de paiement mobile et de paiement qu’une boutique enregistre dans Dukan ERP appartiennent à leurs propriétaires. Les afficher ne signifie pas que ces services approuvent Dukan ERP ou y sont liés.' },
        ],
      },
    ],
  },
  ar: {
    version: '1.0 (مسودة)',
    status: 'draft',
    title: 'البيانات القانونية',
    summary: 'من ينشر هذا الموقع ويشغّل Dukan ERP، وكيفية التواصل معه.',
    sections: [
      {
        id: 'entity',
        heading: 'الناشر والمشغّل',
        blocks: [
          { kind: 'p', text: '{operatorStatus} ويُنشر هذا الموقع وتُشغَّل خدمة Dukan ERP بهذا الاسم.' },
          { kind: 'p', text: 'Dukan ERP هو اسم المنتج؛ و{displayName} هو الاسم الذي يُطوَّر ويُشغَّل تحته.' },
        ],
      },
      {
        id: 'responsible',
        heading: 'المسؤول عن النشر',
        blocks: [{ kind: 'p', text: 'المسؤول عن النشر: {publicationDirector}.' }],
      },
      {
        id: 'hosting',
        heading: 'الاستضافة',
        blocks: [{ kind: 'p', text: 'ستُذكر هنا الجهات التي تستضيف هذا الموقع وخدمة Dukan ERP بمجرد أن تتعاقد معها {displayName}. [[blocker:processors]]' }],
      },
      {
        id: 'contact',
        heading: 'التواصل',
        blocks: [{ kind: 'p', text: 'راسل العنوان المناسب لسؤالك:' }],
      },
      {
        id: 'ip',
        heading: 'حقوق المؤلف والعلامات التجارية',
        blocks: [
          { kind: 'p', text: 'نصوص هذا الموقع وتصميمه وبرامجه وبرامج Dukan ERP مملوكة للمشغّل، ما لم يُذكر خلاف ذلك. ولا يجوز نسخها أو إعادة استخدامها دون إذن كتابي.' },
          { kind: 'p', text: 'أسماء خدمات الدفع عبر الهاتف وخدمات الدفع التي يسجلها المتجر في Dukan ERP مملوكة لأصحابها. وعرضها لا يعني أن هذه الخدمات تؤيد Dukan ERP أو ترتبط به.' },
        ],
      },
    ],
  },
};
