import type { Language } from '../i18n/languages';
import type { LegalDocument } from './types';

/**
 * The legal notice (`/legal`): who publishes this website and operates Dukan ERP. Every company fact is an input TSX-MR
 * supplies (`config/schema.ts`) — a production build refuses while one is blank — and nothing is named that TSX-MR has
 * not confirmed: the publisher and the host wait on their own decisions. A DRAFT, not legal advice.
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
          { kind: 'p', text: 'This website and the Dukan ERP service are published and operated by {legalName}, trading as {displayName}.' },
          { kind: 'p', text: 'Dukan ERP is the name of the product; {displayName} is the organization that develops and operates it.' },
        ],
      },
      {
        id: 'responsible',
        heading: 'Person responsible for publication',
        blocks: [{ kind: 'p', text: 'The person legally responsible for what this website publishes is named here once {displayName} has designated them. [[blocker:publisher]]' }],
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
          { kind: 'p', text: 'The texts, design and software of this website and of Dukan ERP belong to {legalName}, unless a notice says otherwise. They may not be copied or reused without its written permission.' },
          { kind: 'p', text: 'The names of the mobile-money and payment services a shop records in Dukan ERP belong to their owners. Showing them does not mean those services endorse Dukan ERP or are connected with it.' },
        ],
      },
      {
        id: 'policies',
        heading: 'Policies',
        blocks: [{ kind: 'p', text: 'How Dukan ERP is used and how personal information is handled is set out in these pages:' }],
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
          { kind: 'p', text: 'Ce site et le service Dukan ERP sont édités et exploités par {legalName}, sous le nom commercial {displayName}.' },
          { kind: 'p', text: 'Dukan ERP est le nom du produit ; {displayName} est l’organisation qui le développe et l’exploite.' },
        ],
      },
      {
        id: 'responsible',
        heading: 'Responsable de la publication',
        blocks: [{ kind: 'p', text: 'La personne légalement responsable de ce que publie ce site sera indiquée ici dès que {displayName} l’aura désignée. [[blocker:publisher]]' }],
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
          { kind: 'p', text: 'Les textes, la conception et les logiciels de ce site et de Dukan ERP appartiennent à {legalName}, sauf mention contraire. Ils ne peuvent être copiés ni réutilisés sans son autorisation écrite.' },
          { kind: 'p', text: 'Les noms des services de paiement mobile et de paiement qu’une boutique enregistre dans Dukan ERP appartiennent à leurs propriétaires. Les afficher ne signifie pas que ces services approuvent Dukan ERP ou y sont liés.' },
        ],
      },
      {
        id: 'policies',
        heading: 'Politiques',
        blocks: [{ kind: 'p', text: 'L’utilisation de Dukan ERP et le traitement des informations personnelles sont décrits dans ces pages :' }],
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
          { kind: 'p', text: 'يَنشر هذا الموقع ويشغّل خدمة Dukan ERP {legalName}، تحت الاسم التجاري {displayName}.' },
          { kind: 'p', text: 'Dukan ERP هو اسم المنتج؛ و{displayName} هي الجهة التي تطوّره وتشغّله.' },
        ],
      },
      {
        id: 'responsible',
        heading: 'المسؤول عن النشر',
        blocks: [{ kind: 'p', text: 'سيُذكر هنا الشخص المسؤول قانونيًا عما ينشره هذا الموقع بمجرد أن تعيّنه {displayName}. [[blocker:publisher]]' }],
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
          { kind: 'p', text: 'نصوص هذا الموقع وتصميمه وبرامجه وبرامج Dukan ERP مملوكة لـ{legalName}، ما لم يُذكر خلاف ذلك. ولا يجوز نسخها أو إعادة استخدامها دون إذن كتابي منها.' },
          { kind: 'p', text: 'أسماء خدمات الدفع عبر الهاتف وخدمات الدفع التي يسجلها المتجر في Dukan ERP مملوكة لأصحابها. وعرضها لا يعني أن هذه الخدمات تؤيد Dukan ERP أو ترتبط به.' },
        ],
      },
      {
        id: 'policies',
        heading: 'السياسات',
        blocks: [{ kind: 'p', text: 'تشرح هذه الصفحات كيفية استخدام Dukan ERP وكيفية التعامل مع المعلومات الشخصية:' }],
      },
    ],
  },
};
