import type { Language } from '../i18n/languages';
import type { Document } from './types';
import type { HomeContent } from './home';
import type { DukanErpContent } from './dukan-erp';

/**
 * The public website before Dukan ERP opens (the owner's brief of 2026-10-17; docs/96): the pages a public build
 * (`VITE_SITE_SURFACE=public`) publishes in place of the ones that describe a running service. Dukan ERP is presented
 * as coming soon and not yet accepting public registrations; nothing here says that an account, a registration, a
 * payment, a trial or a deletion process works today. The legal texts are in `legal-prelaunch.ts`.
 */

type Docs = Record<Language, Document>;

export const aboutPrelaunch: Docs = {
  en: {
    title: 'About {displayName}',
    summary: '{displayName} develops digital business-management software in Mauritania. Its first product, Dukan ERP, is being prepared for launch.',
    sections: [
      { id: 'who', heading: 'Who we are', blocks: [{ kind: 'p', text: '{displayName} develops digital business-management software in Mauritania. Its work starts from the daily reality of local businesses: stock that moves quickly, money that passes through several channels, and teams that need clear roles.' }] },
      { id: 'product', heading: 'What we build', blocks: [{ kind: 'p', text: 'Dukan ERP is our first product. It is being prepared for launch and is not yet open for public registration. {displayName} develops it and will operate it.' }] },
      {
        id: 'principles',
        heading: 'How we build',
        blocks: [
          {
            kind: 'list',
            items: [
              'Every feature should make daily work faster or safer, with less typing.',
              'Businesses decide who can see their records; the server enforces it.',
              'Arabic, French and English are supported from the start.',
            ],
          },
        ],
      },
      { id: 'details', heading: 'Company details', blocks: [{ kind: 'p', text: 'The registered details of {displayName} are listed below.' }] },
    ],
  },
  fr: {
    title: 'À propos de {displayName}',
    summary: '{displayName} développe des logiciels de gestion d’entreprise en Mauritanie. Son premier produit, Dukan ERP, est en préparation pour son lancement.',
    sections: [
      { id: 'who', heading: 'Qui nous sommes', blocks: [{ kind: 'p', text: '{displayName} développe des logiciels de gestion d’entreprise en Mauritanie. Son travail part de la réalité quotidienne des entreprises locales : un stock qui tourne vite, de l’argent qui passe par plusieurs canaux et des équipes qui ont besoin de rôles clairs.' }] },
      { id: 'product', heading: 'Ce que nous construisons', blocks: [{ kind: 'p', text: 'Dukan ERP est notre premier produit. Il est en préparation pour son lancement et n’est pas encore ouvert aux inscriptions. {displayName} le développe et l’exploitera.' }] },
      {
        id: 'principles',
        heading: 'Notre façon de construire',
        blocks: [
          {
            kind: 'list',
            items: [
              'Chaque fonction doit rendre le travail quotidien plus rapide ou plus sûr, avec moins de saisie.',
              'Les entreprises décident qui peut voir leurs données ; le serveur le fait respecter.',
              'L’arabe, le français et l’anglais sont pris en charge dès le départ.',
            ],
          },
        ],
      },
      { id: 'details', heading: 'Informations sur l’entreprise', blocks: [{ kind: 'p', text: 'Les informations d’immatriculation de {displayName} figurent ci-dessous.' }] },
    ],
  },
  ar: {
    title: 'عن {displayName}',
    summary: 'تطوّر {displayName} برمجيات رقمية لإدارة الأعمال في موريتانيا. ومنتجها الأول، Dukan ERP، قيد التحضير للإطلاق.',
    sections: [
      { id: 'who', heading: 'من نحن', blocks: [{ kind: 'p', text: 'تطوّر {displayName} برمجيات رقمية لإدارة الأعمال في موريتانيا. وينطلق عملها من الواقع اليومي للشركات المحلية: مخزون يتحرك بسرعة، وأموال تمر عبر عدة قنوات، وفرق تحتاج إلى أدوار واضحة.' }] },
      { id: 'product', heading: 'ما نبنيه', blocks: [{ kind: 'p', text: 'Dukan ERP هو منتجنا الأول. وهو قيد التحضير للإطلاق، والتسجيل فيه غير مفتوح للعموم بعد. تطوّره {displayName} وستتولى تشغيله.' }] },
      {
        id: 'principles',
        heading: 'كيف نبني',
        blocks: [
          {
            kind: 'list',
            items: [
              'كل ميزة يجب أن تجعل العمل اليومي أسرع أو أكثر أمانًا، مع كتابة أقل.',
              'الشركات هي من تقرر من يرى سجلاتها، والخادم يفرض ذلك.',
              'العربية والفرنسية والإنجليزية مدعومة منذ البداية.',
            ],
          },
        ],
      },
      { id: 'details', heading: 'بيانات الشركة', blocks: [{ kind: 'p', text: 'البيانات المسجلة لـ{displayName} مذكورة أدناه.' }] },
    ],
  },
};

export const contactPrelaunch: Docs = {
  en: {
    title: 'Contact {displayName}',
    summary: 'How to reach {displayName} about Dukan ERP or this website.',
    sections: [
      { id: 'write', heading: 'Write to us', blocks: [{ kind: 'p', text: 'Choose the address that fits your question. Each one opens your email application with the address already filled in.' }] },
      {
        id: 'before',
        heading: 'Before you write',
        blocks: [
          {
            kind: 'list',
            items: ['Dukan ERP is not yet open for public registration, so there is no account to sign in to yet.', 'Never send a password, a verification code or a customer’s number by email.'],
          },
        ],
      },
    ],
  },
  fr: {
    title: 'Contacter {displayName}',
    summary: 'Comment joindre {displayName} au sujet de Dukan ERP ou de ce site.',
    sections: [
      { id: 'write', heading: 'Nous écrire', blocks: [{ kind: 'p', text: 'Choisissez l’adresse qui correspond à votre question. Chacune ouvre votre messagerie avec l’adresse déjà remplie.' }] },
      {
        id: 'before',
        heading: 'Avant d’écrire',
        blocks: [
          {
            kind: 'list',
            items: ['Dukan ERP n’est pas encore ouvert aux inscriptions : il n’existe donc pas encore de compte auquel se connecter.', 'N’envoyez jamais par e-mail un mot de passe, un code de vérification ou le numéro d’un client.'],
          },
        ],
      },
    ],
  },
  ar: {
    title: 'التواصل مع {displayName}',
    summary: 'كيف تتواصلون مع {displayName} بشأن Dukan ERP أو هذا الموقع.',
    sections: [
      { id: 'write', heading: 'راسلونا', blocks: [{ kind: 'p', text: 'اختاروا العنوان الذي يناسب سؤالكم. يفتح كل عنوان تطبيق البريد لديكم والعنوان مكتوب فيه مسبقًا.' }] },
      {
        id: 'before',
        heading: 'قبل أن تكتبوا',
        blocks: [
          {
            kind: 'list',
            items: ['التسجيل في Dukan ERP غير مفتوح للعموم بعد، ولذلك لا يوجد حساب لتسجيل الدخول إليه حاليًا.', 'لا ترسلوا أبدًا عبر البريد الإلكتروني كلمة مرور أو رمز تحقق أو رقم أحد العملاء.'],
          },
        ],
      },
    ],
  },
};

export const supportPrelaunch: Docs = {
  en: {
    title: 'Support',
    summary: 'Dukan ERP is not open yet. How to reach {displayName} with a question before it opens.',
    sections: [
      { id: 'status', heading: 'Dukan ERP is not open yet', blocks: [{ kind: 'p', text: 'Dukan ERP is being prepared for launch and is not yet accepting public registrations. There are no public accounts yet, so there is nothing to sign in to, renew or delete on this website.' }] },
      { id: 'questions', heading: 'Questions before launch', blocks: [{ kind: 'p', text: 'To ask about Dukan ERP, its launch or this website, write to the support address below.' }] },
      { id: 'deletion', heading: 'Account deletion', blocks: [{ kind: 'p', text: 'How accounts will be deleted once Dukan ERP opens is explained on the account deletion page.' }] },
      { id: 'security', heading: 'Reporting a security problem', blocks: [{ kind: 'p', text: 'If you think you have found a weakness in this website or in Dukan ERP, see the security page.' }] },
      { id: 'contact', heading: 'Contact', blocks: [{ kind: 'p', text: 'Write to the address below. Never send a password or a verification code by email.' }] },
    ],
  },
  fr: {
    title: 'Assistance',
    summary: 'Dukan ERP n’est pas encore ouvert. Comment joindre {displayName} avec une question avant son ouverture.',
    sections: [
      { id: 'status', heading: 'Dukan ERP n’est pas encore ouvert', blocks: [{ kind: 'p', text: 'Dukan ERP est en préparation pour son lancement et n’accepte pas encore d’inscriptions. Il n’existe pas encore de compte public : il n’y a donc rien à quoi se connecter, à renouveler ou à supprimer sur ce site.' }] },
      { id: 'questions', heading: 'Questions avant le lancement', blocks: [{ kind: 'p', text: 'Pour toute question sur Dukan ERP, son lancement ou ce site, écrivez à l’adresse d’assistance ci-dessous.' }] },
      { id: 'deletion', heading: 'Suppression de compte', blocks: [{ kind: 'p', text: 'La page sur la suppression de compte explique comment les comptes seront supprimés une fois Dukan ERP ouvert.' }] },
      { id: 'security', heading: 'Signaler un problème de sécurité', blocks: [{ kind: 'p', text: 'Si vous pensez avoir trouvé une faille dans ce site ou dans Dukan ERP, consultez la page sécurité.' }] },
      { id: 'contact', heading: 'Contact', blocks: [{ kind: 'p', text: 'Écrivez à l’adresse ci-dessous. N’envoyez jamais un mot de passe ou un code de vérification par e-mail.' }] },
    ],
  },
  ar: {
    title: 'الدعم',
    summary: 'لم يُفتح Dukan ERP بعد. كيف تتواصلون مع {displayName} بسؤال قبل افتتاحه.',
    sections: [
      { id: 'status', heading: 'لم يُفتح Dukan ERP بعد', blocks: [{ kind: 'p', text: 'Dukan ERP قيد التحضير للإطلاق ولا يقبل التسجيل من العموم بعد. ولا توجد حسابات عامة حتى الآن، فلا شيء على هذا الموقع لتسجيل الدخول إليه أو تجديده أو حذفه.' }] },
      { id: 'questions', heading: 'أسئلة قبل الإطلاق', blocks: [{ kind: 'p', text: 'للسؤال عن Dukan ERP أو موعد إطلاقه أو عن هذا الموقع، راسلوا عنوان الدعم أدناه.' }] },
      { id: 'deletion', heading: 'حذف الحساب', blocks: [{ kind: 'p', text: 'تشرح صفحة حذف الحساب كيف ستُحذف الحسابات بعد افتتاح Dukan ERP.' }] },
      { id: 'security', heading: 'الإبلاغ عن مشكلة أمنية', blocks: [{ kind: 'p', text: 'إذا ظننتم أنكم وجدتم ثغرة في هذا الموقع أو في Dukan ERP، فاطّلعوا على صفحة الأمان.' }] },
      { id: 'contact', heading: 'التواصل', blocks: [{ kind: 'p', text: 'راسلوا العنوان أدناه. ولا ترسلوا أبدًا كلمة مرور أو رمز تحقق عبر البريد الإلكتروني.' }] },
    ],
  },
};

/** What the home page says differently before launch: nothing is offered, and nothing is "available today". */
export interface HomePrelaunch {
  heroLead: string;
  capabilitiesLead: string;
  languagesBody: string;
  cta: { title: string; body: string };
}

export const homePrelaunch: Record<Language, HomePrelaunch> = {
  en: {
    heroLead: '{displayName} develops software that helps businesses run their daily operations. Its first product, Dukan ERP, is coming soon: it brings stock, sales, money and teams into one application.',
    capabilitiesLead: 'Dukan ERP is being prepared for launch. These are the features it is being built with.',
    languagesBody: 'Dukan ERP and this website are built for Arabic, French and English. Arabic is laid out from right to left throughout, while numbers, amounts and identifiers keep their reading order.',
    cta: { title: 'Dukan ERP is coming soon', body: 'Dukan ERP is not yet open for public registration. To hear about its launch, write to {displayName}.' },
  },
  fr: {
    heroLead: '{displayName} développe des logiciels qui aident les entreprises à gérer leur activité au quotidien. Son premier produit, Dukan ERP, arrive bientôt : il réunit le stock, les ventes, l’argent et les équipes dans une seule application.',
    capabilitiesLead: 'Dukan ERP est en préparation pour son lancement. Voici les fonctions avec lesquelles il est construit.',
    languagesBody: 'Dukan ERP et ce site sont conçus pour l’arabe, le français et l’anglais. L’arabe se lit de droite à gauche partout, tandis que les nombres, les montants et les identifiants gardent leur sens de lecture.',
    cta: { title: 'Dukan ERP arrive bientôt', body: 'Dukan ERP n’est pas encore ouvert aux inscriptions. Pour être informé de son lancement, écrivez à {displayName}.' },
  },
  ar: {
    heroLead: 'تطوّر {displayName} برمجيات تساعد الشركات على إدارة عملياتها اليومية. ومنتجها الأول، Dukan ERP، قادم قريبًا: يجمع المخزون والمبيعات والأموال والفرق في تطبيق واحد.',
    capabilitiesLead: 'Dukan ERP قيد التحضير للإطلاق. وهذه هي الميزات التي يُبنى بها.',
    languagesBody: 'صُمّم Dukan ERP وهذا الموقع للعربية والفرنسية والإنجليزية. تُعرض العربية من اليمين إلى اليسار في كل مكان، بينما تحتفظ الأرقام والمبالغ والمعرّفات باتجاه قراءتها.',
    cta: { title: 'Dukan ERP قادم قريبًا', body: 'التسجيل في Dukan ERP غير مفتوح للعموم بعد. لتصلكم أخبار إطلاقه، راسلوا {displayName}.' },
  },
};

/** What the Dukan ERP page says differently before launch. */
export interface DukanErpPrelaunch {
  summary: string;
  intro: string;
  activitiesLead: string;
  either: string;
  start: { title: string; steps: string[] };
  appBody: string;
}

export const dukanErpPrelaunch: Record<Language, DukanErpPrelaunch> = {
  en: {
    summary: 'Dukan ERP is a business-management platform developed by {displayName} for retail and electronics shops and for money-services agents. It is coming soon.',
    intro: 'Dukan ERP replaces the notebook, the calculator and the end-of-day guesswork with one application the whole team shares on their phones. It is being prepared for launch and is not yet open for public registration.',
    activitiesLead: 'Dukan ERP is being built for two business activities. Each store of a business will run one of them or both.',
    either: 'A business will be able to use either activity or both, store by store.',
    start: {
      title: 'Launch',
      steps: [
        'Dukan ERP is not yet open for public registration.',
        'How a business joins, and the terms that apply, will be published on this website before launch.',
        'To hear about the launch, write to {displayName} from the contact page.',
      ],
    },
    appBody: 'Dukan ERP will be used on phones by the business’s own team, in Arabic, French or English.',
  },
  fr: {
    summary: 'Dukan ERP est une plateforme de gestion d’entreprise développée par {displayName} pour les boutiques de détail et d’électronique et pour les agents de services monétaires. Il arrive bientôt.',
    intro: 'Dukan ERP remplace le cahier, la calculatrice et les approximations de fin de journée par une seule application que toute l’équipe partage sur téléphone. Il est en préparation pour son lancement et n’est pas encore ouvert aux inscriptions.',
    activitiesLead: 'Dukan ERP est construit pour deux activités. Chaque magasin d’une entreprise exercera l’une ou les deux.',
    either: 'Une entreprise pourra utiliser l’une des activités ou les deux, magasin par magasin.',
    start: {
      title: 'Lancement',
      steps: [
        'Dukan ERP n’est pas encore ouvert aux inscriptions.',
        'La manière dont une entreprise pourra s’inscrire, et les conditions applicables, seront publiées sur ce site avant le lancement.',
        'Pour être informé du lancement, écrivez à {displayName} depuis la page de contact.',
      ],
    },
    appBody: 'Dukan ERP sera utilisé sur téléphone par l’équipe de l’entreprise, en arabe, en français ou en anglais.',
  },
  ar: {
    summary: 'Dukan ERP منصة لإدارة الأعمال تطوّرها {displayName} لمتاجر التجزئة والإلكترونيات ولوكلاء الخدمات المالية. وهو قادم قريبًا.',
    intro: 'يحلّ Dukan ERP محل الدفتر والآلة الحاسبة وتقديرات نهاية اليوم بتطبيق واحد يتشاركه الفريق كله على هواتفهم. وهو قيد التحضير للإطلاق، والتسجيل فيه غير مفتوح للعموم بعد.',
    activitiesLead: 'يُبنى Dukan ERP لنشاطين تجاريين. وسيمارس كل متجر من متاجر الشركة أحدهما أو كليهما.',
    either: 'ستتمكن الشركة من استخدام أحد النشاطين أو كليهما، متجرًا بمتجر.',
    start: {
      title: 'الإطلاق',
      steps: [
        'التسجيل في Dukan ERP غير مفتوح للعموم بعد.',
        'ستُنشر على هذا الموقع قبل الإطلاق طريقة انضمام الشركات والشروط المطبقة.',
        'لتصلكم أخبار الإطلاق، راسلوا {displayName} من صفحة التواصل.',
      ],
    },
    appBody: 'سيستخدم فريق الشركة Dukan ERP على الهواتف، بالعربية أو الفرنسية أو الإنجليزية.',
  },
};

/** The home page as a public build shows it. */
export function homeAsPrelaunch(c: HomeContent, p: HomePrelaunch): HomeContent {
  return {
    ...c,
    hero: { ...c.hero, lead: p.heroLead },
    capabilities: { ...c.capabilities, lead: p.capabilitiesLead },
    languages: { ...c.languages, body: p.languagesBody },
    cta: { ...c.cta, title: p.cta.title, body: p.cta.body },
  };
}

/** The Dukan ERP page as a public build shows it (the subscription section is left out by the page). */
export function dukanErpAsPrelaunch(c: DukanErpContent, p: DukanErpPrelaunch): DukanErpContent {
  return { ...c, summary: p.summary, intro: p.intro, activitiesLead: p.activitiesLead, either: p.either, start: p.start, app: { ...c.app, body: p.appBody } };
}
