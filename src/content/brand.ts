import type { Language } from '../i18n/languages';
import type { Card } from './dukan-overview';

/**
 * TSX-MR itself (the owner's brief of 2026-10-17, fourth): an independent development brand managed by a Mauritanian
 * developer, offering websites, mobile applications and business tools to clients, with Dukan ERP as its first own
 * product. The home page introduces the brand and its services; the Services page describes them; the product's
 * detail stays on its own page (`dukan-overview.ts`, `dukan-erp.ts`).
 *
 * What these texts never say, because none of it is true or confirmed: a team, a number of clients or projects, a
 * qualification, an award, a guarantee, a price or a delay. Client work is named only with its owner's permission, and
 * only as far as that permission goes: Blemhader.com's owner confirmed on 2026-10-18 that TSX-MR may say it developed
 * the site, with no figure or detail of it (docs/21 D199) — so its name and that sentence, no logo, screenshot or link.
 * Services, offered to clients, and Dukan ERP, owned by TSX-MR, are always told apart.
 *
 * `services.items` are websites, mobile applications and business tools, in that order (each page draws its icon by
 * position).
 */
export interface ServiceCard {
  title: string;
  body: string;
  points: string[];
}

/** Work done for a client, shown with the client's permission: the site's name and what TSX-MR did — never its figures. */
export interface ClientWork {
  name: string;
  body: string;
}

export interface BrandContent {
  hero: { eyebrow: string; title: string; lead: string; primary: string; secondary: string };
  services: { title: string; lead: string; items: ServiceCard[]; more: string };
  work: { label: string; items: ClientWork[] };
  product: { eyebrow: string; body: string; link: string };
  process: { title: string; lead: string; steps: Card[] };
  cta: { title: string; body: string; action: string };
  servicesPage: {
    title: string;
    summary: string;
    prepare: { title: string; items: string[] };
    product: { title: string; body: string; link: string };
  };
}

export const brand: Record<Language, BrandContent> = {
  en: {
    hero: {
      eyebrow: 'Independent development brand · Mauritania',
      title: 'Websites, apps and business tools — built around the way you work.',
      lead: '{displayName} is an independent development brand managed by a Mauritanian developer. It designs and builds websites, mobile applications and management tools for businesses and organisations, in Arabic, French and English.',
      primary: 'Discuss your project',
      secondary: 'See the services',
    },
    services: {
      title: 'What {displayName} can build for you',
      lead: 'Three kinds of work, each shaped to the project.',
      items: [
        {
          title: 'Websites',
          body: 'A clear, fast website that presents your business and makes it easy to reach you.',
          points: ['Presentation and business websites', 'Arabic, French and English, right-to-left included', 'Designed for phones first'],
        },
        {
          title: 'Mobile applications',
          body: 'An application your customers or your team use on their phones.',
          points: ['Android and iPhone from one project', 'Designed for real working conditions', 'Organised around the tasks people do most'],
        },
        {
          title: 'Business tools',
          body: 'Software that replaces notebooks and spreadsheets: stock, sales, records and teams.',
          points: ['Management and back-office tools', 'Roles and permissions for each person', 'Reports that read at a glance'],
        },
      ],
      more: 'See the services in detail',
    },
    work: {
      label: 'Client work',
      items: [{ name: 'Blemhader.com', body: 'A website designed and built by {displayName} for a client. The site and its content belong to its owner.' }],
    },
    product: {
      eyebrow: '{displayName}’s own product',
      body: 'A business-management application for retail and electronics shops and for money-services agents: stock, sales, money and team in one place.',
      link: 'Discover Dukan ERP',
    },
    process: {
      title: 'How a project runs',
      lead: 'Simple steps, agreed with you before any work starts.',
      steps: [
        { title: 'Talk it through', body: 'You describe what you need, and {displayName} asks the questions that shape it.' },
        { title: 'Agree the plan', body: 'The scope, the steps and the timing are written down and agreed before work starts.' },
        { title: 'Build and review', body: 'You see the work as it progresses and say what should change.' },
        { title: 'Launch', body: 'The result goes live, and any further work is agreed with you.' },
      ],
    },
    cta: {
      title: 'Have a project in mind?',
      body: 'Describe in a few lines what you want to build, in writing or by telephone.',
      action: 'Discuss your project',
    },
    servicesPage: {
      title: 'Services',
      summary: 'Websites, mobile applications and business tools, designed and built by {displayName} for businesses and organisations.',
      prepare: {
        title: 'Before you get in touch',
        items: ['What you want to build, and for whom', 'What exists today, if anything: a website, a spreadsheet, an application', 'Any date that matters to you'],
      },
      product: {
        title: '{displayName}’s own product',
        body: 'Dukan ERP is built by {displayName} as its own product, separate from the work done for clients.',
        link: 'Discover Dukan ERP',
      },
    },
  },
  fr: {
    hero: {
      eyebrow: 'Marque indépendante de développement · Mauritanie',
      title: 'Sites web, applications et outils de gestion — pensés pour votre façon de travailler.',
      lead: '{displayName} est une marque indépendante de développement, gérée par un développeur mauritanien. Elle conçoit et réalise des sites web, des applications mobiles et des outils de gestion pour les entreprises et les organisations, en arabe, en français et en anglais.',
      primary: 'Parler de votre projet',
      secondary: 'Voir les services',
    },
    services: {
      title: 'Ce que {displayName} peut réaliser pour vous',
      lead: 'Trois types de travaux, chacun adapté au projet.',
      items: [
        {
          title: 'Sites web',
          body: 'Un site clair et rapide qui présente votre activité et permet de vous joindre facilement.',
          points: ['Sites vitrines et sites d’entreprise', 'Arabe, français et anglais, écriture de droite à gauche comprise', 'Pensés d’abord pour le téléphone'],
        },
        {
          title: 'Applications mobiles',
          body: 'Une application que vos clients ou votre équipe utilisent sur leur téléphone.',
          points: ['Android et iPhone à partir d’un même projet', 'Conçues pour les conditions réelles de travail', 'Organisées autour des tâches les plus fréquentes'],
        },
        {
          title: 'Outils de gestion',
          body: 'Des logiciels qui remplacent les cahiers et les tableurs : stock, ventes, dossiers et équipes.',
          points: ['Outils de gestion et de suivi interne', 'Des rôles et des droits pour chaque personne', 'Des rapports lisibles d’un coup d’œil'],
        },
      ],
      more: 'Voir le détail des services',
    },
    work: {
      label: 'Réalisé pour un client',
      items: [{ name: 'Blemhader.com', body: 'Un site web conçu et réalisé par {displayName} pour un client. Le site et son contenu appartiennent à son propriétaire.' }],
    },
    product: {
      eyebrow: 'Le produit de {displayName}',
      body: 'Une application de gestion pour les commerces de détail et d’électronique et pour les agents de services monétaires : stock, ventes, argent et équipe au même endroit.',
      link: 'Découvrir Dukan ERP',
    },
    process: {
      title: 'Comment se déroule un projet',
      lead: 'Des étapes simples, convenues avec vous avant le début du travail.',
      steps: [
        { title: 'En parler', body: 'Vous décrivez votre besoin, et {displayName} pose les questions qui permettent de le préciser.' },
        { title: 'Convenir du plan', body: 'Le périmètre, les étapes et le calendrier sont écrits et convenus avant le début du travail.' },
        { title: 'Réaliser et valider', body: 'Vous voyez le travail avancer et dites ce qui doit changer.' },
        { title: 'Mettre en ligne', body: 'Le résultat est mis en service, et toute suite éventuelle est convenue avec vous.' },
      ],
    },
    cta: {
      title: 'Vous avez un projet ?',
      body: 'Décrivez en quelques lignes ce que vous voulez réaliser, par écrit ou par téléphone.',
      action: 'Parler de votre projet',
    },
    servicesPage: {
      title: 'Services',
      summary: 'Sites web, applications mobiles et outils de gestion, conçus et réalisés par {displayName} pour les entreprises et les organisations.',
      prepare: {
        title: 'Avant de prendre contact',
        items: ['Ce que vous voulez réaliser, et pour qui', 'Ce qui existe déjà, le cas échéant : un site, un tableur, une application', 'Une date qui compte pour vous, s’il y en a une'],
      },
      product: {
        title: 'Le produit de {displayName}',
        body: 'Dukan ERP est un produit que {displayName} développe pour son propre compte, distinct des travaux réalisés pour des clients.',
        link: 'Découvrir Dukan ERP',
      },
    },
  },
  ar: {
    hero: {
      eyebrow: 'علامة تطوير مستقلة · موريتانيا',
      title: 'مواقع وتطبيقات وأدوات إدارة — مصمَّمة على طريقة عملكم.',
      lead: '{displayName} علامة تطوير مستقلة يديرها مطوّر موريتاني. تصمّم وتبني مواقع الويب وتطبيقات الهاتف وأدوات الإدارة للشركات والمؤسسات، بالعربية والفرنسية والإنجليزية.',
      primary: 'ناقشوا مشروعكم',
      secondary: 'اطّلعوا على الخدمات',
    },
    services: {
      title: 'ما يمكن أن تبنيه {displayName} لكم',
      lead: 'ثلاثة أنواع من الأعمال، يُكيَّف كلٌّ منها حسب المشروع.',
      items: [
        {
          title: 'مواقع الويب',
          body: 'موقع واضح وسريع يعرّف بنشاطكم ويسهّل على الناس التواصل معكم.',
          points: ['مواقع تعريفية ومواقع للشركات', 'بالعربية والفرنسية والإنجليزية، مع الكتابة من اليمين إلى اليسار', 'مصمَّمة للهاتف أولًا'],
        },
        {
          title: 'تطبيقات الهاتف',
          body: 'تطبيق يستخدمه عملاؤكم أو فريقكم على هواتفهم.',
          points: ['Android وiPhone من مشروع واحد', 'مصمَّمة لظروف العمل الفعلية', 'منظَّمة حول المهام الأكثر تكرارًا'],
        },
        {
          title: 'أدوات الإدارة',
          body: 'برمجيات تحلّ محل الدفاتر وجداول البيانات: المخزون والمبيعات والسجلات والفرق.',
          points: ['أدوات للإدارة والمتابعة الداخلية', 'أدوار وصلاحيات لكل شخص', 'تقارير تُقرأ بنظرة واحدة'],
        },
      ],
      more: 'تفاصيل الخدمات',
    },
    work: {
      label: 'عمل منجز لعميل',
      items: [{ name: 'Blemhader.com', body: 'موقع ويب صمّمته {displayName} وطوّرته لأحد العملاء. والموقع ومحتواه ملك لصاحبه.' }],
    },
    product: {
      eyebrow: 'منتج {displayName} الخاص',
      body: 'تطبيق لإدارة الأعمال موجّه إلى متاجر التجزئة والإلكترونيات ووكلاء الخدمات المالية: المخزون والمبيعات والأموال والفريق في مكان واحد.',
      link: 'اكتشفوا Dukan ERP',
    },
    process: {
      title: 'كيف يسير المشروع',
      lead: 'خطوات بسيطة يُتفق عليها معكم قبل بدء العمل.',
      steps: [
        { title: 'الحديث عن المشروع', body: 'تصفون ما تحتاجون إليه، وتطرح {displayName} الأسئلة التي تحدّده.' },
        { title: 'الاتفاق على الخطة', body: 'يُكتب النطاق والخطوات والمواعيد ويُتفق عليها قبل بدء العمل.' },
        { title: 'البناء والمراجعة', body: 'تتابعون تقدّم العمل وتقولون ما يجب تغييره.' },
        { title: 'الإطلاق', body: 'يُطلق العمل، ويُتفق معكم على أي عمل لاحق.' },
      ],
    },
    cta: {
      title: 'لديكم مشروع؟',
      body: 'صِفوا في بضعة أسطر ما تريدون بناءه، كتابةً أو هاتفيًا.',
      action: 'ناقشوا مشروعكم',
    },
    servicesPage: {
      title: 'الخدمات',
      summary: 'مواقع الويب وتطبيقات الهاتف وأدوات الإدارة، تصمّمها وتبنيها {displayName} للشركات والمؤسسات.',
      prepare: {
        title: 'قبل التواصل',
        items: ['ما تريدون بناءه، ولمن', 'ما هو موجود حاليًا إن وُجد: موقع أو جدول بيانات أو تطبيق', 'أي موعد يهمّكم، إن وُجد'],
      },
      product: {
        title: 'منتج {displayName} الخاص',
        body: 'Dukan ERP منتج تطوّره {displayName} لحسابها الخاص، وهو منفصل عن الأعمال المنجزة للعملاء.',
        link: 'اكتشفوا Dukan ERP',
      },
    },
  },
};
