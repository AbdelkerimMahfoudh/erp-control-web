import type { Language } from '../i18n/languages';
import type { Document } from './types';
import type { DukanOverview } from './dukan-overview';
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
    summary: '{displayName} is an independent development brand managed by a Mauritanian developer. It builds websites, mobile applications and business tools for clients, and Dukan ERP as its own product.',
    sections: [
      { id: 'who', heading: 'What {displayName} is', blocks: [{ kind: 'p', text: '{displayName} is an independent development brand, managed by a Mauritanian developer.' }] },
      { id: 'work', heading: 'What it builds for clients', blocks: [{ kind: 'p', text: 'Websites, mobile applications and business tools, designed around the way each client works, in Arabic, French and English. The services page describes each of them.' }] },
      { id: 'product', heading: 'Its own product', blocks: [{ kind: 'p', text: 'Dukan ERP is the first product {displayName} builds as its own: a business-management application for retail and electronics shops and for money-services agents. It is being prepared for launch and is not yet open for public registration.' }] },
      {
        id: 'principles',
        heading: 'How it works',
        blocks: [
          {
            kind: 'list',
            items: [
              'Each project starts from the way the people who will use it actually work.',
              'Simple screens and plain words, for people who are not technical.',
              'Arabic, French and English from the start, right-to-left included.',
            ],
          },
        ],
      },
      { id: 'publisher', heading: 'Who publishes this website', blocks: [{ kind: 'p', text: 'The legal notice says who operates {displayName} and publishes this website.' }] },
    ],
  },
  fr: {
    title: 'À propos de {displayName}',
    summary: '{displayName} est une marque indépendante de développement, gérée par un développeur mauritanien. Elle réalise des sites web, des applications mobiles et des outils de gestion pour des clients, ainsi que Dukan ERP, son propre produit.',
    sections: [
      { id: 'who', heading: 'Ce qu’est {displayName}', blocks: [{ kind: 'p', text: '{displayName} est une marque indépendante de développement, gérée par un développeur mauritanien.' }] },
      { id: 'work', heading: 'Ce qu’elle réalise pour ses clients', blocks: [{ kind: 'p', text: 'Des sites web, des applications mobiles et des outils de gestion, conçus selon la façon de travailler de chaque client, en arabe, en français et en anglais. La page Services décrit chacun d’eux.' }] },
      { id: 'product', heading: 'Son propre produit', blocks: [{ kind: 'p', text: 'Dukan ERP est le premier produit que {displayName} développe pour son propre compte : une application de gestion pour les commerces de détail et d’électronique et pour les agents de services monétaires. Il est en préparation pour son lancement et n’est pas encore ouvert aux inscriptions.' }] },
      {
        id: 'principles',
        heading: 'Sa façon de travailler',
        blocks: [
          {
            kind: 'list',
            items: [
              'Chaque projet part de la façon dont travaillent réellement ceux qui l’utiliseront.',
              'Des écrans simples et des mots clairs, pour des personnes qui ne sont pas techniciennes.',
              'L’arabe, le français et l’anglais dès le départ, écriture de droite à gauche comprise.',
            ],
          },
        ],
      },
      { id: 'publisher', heading: 'Qui publie ce site', blocks: [{ kind: 'p', text: 'Les mentions légales indiquent qui exploite {displayName} et publie ce site.' }] },
    ],
  },
  ar: {
    title: 'عن {displayName}',
    summary: '{displayName} علامة تطوير مستقلة يديرها مطوّر موريتاني. تبني مواقع الويب وتطبيقات الهاتف وأدوات الإدارة للعملاء، إلى جانب Dukan ERP، منتجها الخاص.',
    sections: [
      { id: 'who', heading: 'ما هي {displayName}', blocks: [{ kind: 'p', text: '{displayName} علامة تطوير مستقلة يديرها مطوّر موريتاني.' }] },
      { id: 'work', heading: 'ما تبنيه للعملاء', blocks: [{ kind: 'p', text: 'مواقع الويب وتطبيقات الهاتف وأدوات الإدارة، مصمَّمة وفق طريقة عمل كل عميل، بالعربية والفرنسية والإنجليزية. وتصف صفحة الخدمات كلًّا منها.' }] },
      { id: 'product', heading: 'منتجها الخاص', blocks: [{ kind: 'p', text: 'Dukan ERP أول منتج تطوّره {displayName} لحسابها الخاص: تطبيق لإدارة الأعمال موجّه إلى متاجر التجزئة والإلكترونيات ووكلاء الخدمات المالية. وهو قيد التحضير للإطلاق، والتسجيل فيه غير مفتوح للعموم بعد.' }] },
      {
        id: 'principles',
        heading: 'طريقة العمل',
        blocks: [
          {
            kind: 'list',
            items: [
              'ينطلق كل مشروع من الطريقة التي يعمل بها فعلًا من سيستخدمونه.',
              'شاشات بسيطة وكلمات واضحة، لأشخاص ليسوا تقنيين.',
              'العربية والفرنسية والإنجليزية منذ البداية، مع الكتابة من اليمين إلى اليسار.',
            ],
          },
        ],
      },
      { id: 'publisher', heading: 'من ينشر هذا الموقع', blocks: [{ kind: 'p', text: 'يبيّن الإشعار القانوني من يشغّل {displayName} وينشر هذا الموقع.' }] },
    ],
  },
};

export const contactPrelaunch: Docs = {
  en: {
    title: 'Contact {displayName}',
    summary: 'How to reach {displayName} about a project, Dukan ERP or this website.',
    sections: [
      { id: 'write', heading: 'Write or call', blocks: [{ kind: 'p', text: 'Choose the address or number that fits your question. For a project, a few lines on what you want to build are enough to start. Each address opens your email application with the address already filled in.' }] },
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
    summary: 'Comment joindre {displayName} au sujet d’un projet, de Dukan ERP ou de ce site.',
    sections: [
      { id: 'write', heading: 'Écrire ou appeler', blocks: [{ kind: 'p', text: 'Choisissez l’adresse ou le numéro qui correspond à votre question. Pour un projet, quelques lignes sur ce que vous voulez réaliser suffisent pour commencer. Chaque adresse ouvre votre messagerie avec l’adresse déjà remplie.' }] },
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
    summary: 'كيف تتواصلون مع {displayName} بشأن مشروع أو Dukan ERP أو هذا الموقع.',
    sections: [
      { id: 'write', heading: 'راسلونا أو اتصلوا بنا', blocks: [{ kind: 'p', text: 'اختاروا العنوان أو الرقم الذي يناسب سؤالكم. وللمشروع، تكفي بضعة أسطر عمّا تريدون بناءه للبدء. يفتح كل عنوان بريد تطبيق البريد لديكم والعنوان مكتوب فيه مسبقًا.' }] },
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

/** What the Dukan ERP overview says differently before launch: nothing is "available today". */
export interface DukanOverviewPrelaunch {
  capabilitiesLead: string;
}

export const dukanOverviewPrelaunch: Record<Language, DukanOverviewPrelaunch> = {
  en: { capabilitiesLead: 'Dukan ERP is being prepared for launch. These are the six parts it is being built with.' },
  fr: { capabilitiesLead: 'Dukan ERP est en préparation pour son lancement. Voici les six parties avec lesquelles il est construit.' },
  ar: { capabilitiesLead: 'Dukan ERP قيد التحضير للإطلاق. وهذه هي الأجزاء الستة التي يُبنى بها.' },
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

/** The Dukan ERP overview as a public build shows it. */
export function dukanOverviewAsPrelaunch(c: DukanOverview, p: DukanOverviewPrelaunch): DukanOverview {
  return { ...c, capabilities: { ...c.capabilities, lead: p.capabilitiesLead } };
}

/** The Dukan ERP page as a public build shows it (the subscription section is left out by the page). */
export function dukanErpAsPrelaunch(c: DukanErpContent, p: DukanErpPrelaunch): DukanErpContent {
  return { ...c, summary: p.summary, intro: p.intro, activitiesLead: p.activitiesLead, either: p.either, start: p.start, app: { ...c.app, body: p.appBody } };
}
