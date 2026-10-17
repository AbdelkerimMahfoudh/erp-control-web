import type { Language } from '../i18n/languages';
import type { LegalDocument } from './types';

/**
 * The legal pages of the public website before Dukan ERP opens (the owner's brief of 2026-10-17; docs/96). They describe
 * only what this website does today, from its code: no account, no form, no request to any service, no cookie of its
 * own, the language and display choice kept in the browser (`erp.web.language`, `erp.web.theme`), delivery by
 * Cloudflare. A process that does not work yet (registration, payment, trial, account deletion) is described as
 * pre-launch information, never as working. The service's own texts (`legal-*.ts`) stay for the portal and the app,
 * whose gates remain closed. DRAFT until TSX-MR approves each text; not legal advice.
 */
type Legal = Record<Language, LegalDocument>;

export const privacyPrelaunch: Legal = {
  en: {
    version: '0.1 (pre-launch draft)',
    status: 'draft',
    title: 'Privacy policy',
    summary: 'How {displayName} handles personal information on this website before Dukan ERP opens.',
    sections: [
      { id: 'who', heading: 'Who we are', blocks: [{ kind: 'p', text: 'This website is published by {legalName} ({displayName}). For any question about personal information, write to {privacyEmail}.' }] },
      { id: 'scope', heading: 'What this policy covers', blocks: [{ kind: 'p', text: 'This policy covers this website only. Dukan ERP, the business-management service {displayName} is preparing, is not yet open for public registration and collects no information through this website. A privacy policy for the Dukan ERP service will be published here before the service opens.' }] },
      {
        id: 'collected',
        heading: 'What this website processes',
        blocks: [
          {
            kind: 'list',
            items: [
              'The website has no account, no sign-in and no form. It does not ask you for personal information.',
              'Your browser keeps your choice of language and of light or dark display on your own device. This choice is not sent to {displayName}, and you can clear it in your browser’s settings.',
              'The website’s own code sets no cookies and uses no analytics, advertising or tracking.',
              'Like any website, each visit sends technical information to the servers that deliver the pages: your IP address, the page requested, the time and your browser’s description.',
            ],
          },
        ],
      },
      { id: 'hosting', heading: 'Hosting', blocks: [{ kind: 'p', text: 'This website is delivered by Cloudflare, Inc., which processes the technical information of each visit to deliver the pages and to protect them from attacks. Cloudflare operates servers in many countries, so this information may be processed outside Mauritania. When Cloudflare’s security features are on, Cloudflare may set a strictly technical cookie to tell people from automated traffic.' }] },
      { id: 'email', heading: 'When you write to us', blocks: [{ kind: 'p', text: 'If you write to one of our addresses, we receive your name, your email address and your message. We use them only to answer you and to follow up on your request. They are kept in the mailboxes of {displayName}’s email provider. You can ask us to delete your messages.' }] },
      { id: 'sale', heading: 'No sale of personal information', blocks: [{ kind: 'p', text: '{displayName} does not sell personal information and does not use it for advertising.' }] },
      { id: 'requests', heading: 'Your requests', blocks: [{ kind: 'p', text: 'You can ask {displayName} what personal information it holds about you, and ask for it to be corrected or deleted, by writing to {privacyEmail}.' }] },
      { id: 'children', heading: 'Children', blocks: [{ kind: 'p', text: 'This website is about business software and is not directed to children.' }] },
      { id: 'changes', heading: 'Changes to this policy', blocks: [{ kind: 'p', text: 'This policy will change when Dukan ERP opens. The version and the effective date are shown at the top of this page.' }] },
      { id: 'contact', heading: 'Contact', blocks: [{ kind: 'p', text: 'Write to the privacy address below.' }] },
    ],
  },
  fr: {
    version: '0.1 (projet de pré-lancement)',
    status: 'draft',
    title: 'Politique de confidentialité',
    summary: 'Comment {displayName} traite les informations personnelles sur ce site avant l’ouverture de Dukan ERP.',
    sections: [
      { id: 'who', heading: 'Qui nous sommes', blocks: [{ kind: 'p', text: 'Ce site est publié par {legalName} ({displayName}). Pour toute question sur les informations personnelles, écrivez à {privacyEmail}.' }] },
      { id: 'scope', heading: 'Ce que couvre cette politique', blocks: [{ kind: 'p', text: 'Cette politique couvre uniquement ce site. Dukan ERP, le service de gestion d’entreprise que prépare {displayName}, n’est pas encore ouvert aux inscriptions et ne collecte aucune information par ce site. Une politique de confidentialité du service Dukan ERP sera publiée ici avant son ouverture.' }] },
      {
        id: 'collected',
        heading: 'Ce que traite ce site',
        blocks: [
          {
            kind: 'list',
            items: [
              'Ce site n’a ni compte, ni connexion, ni formulaire. Il ne vous demande aucune information personnelle.',
              'Votre navigateur conserve sur votre propre appareil votre choix de langue et d’affichage clair ou sombre. Ce choix n’est pas envoyé à {displayName}, et vous pouvez l’effacer dans les réglages de votre navigateur.',
              'Le code du site ne dépose aucun cookie et n’utilise ni mesure d’audience, ni publicité, ni pistage.',
              'Comme pour tout site, chaque visite envoie des informations techniques aux serveurs qui livrent les pages : votre adresse IP, la page demandée, l’heure et la description de votre navigateur.',
            ],
          },
        ],
      },
      { id: 'hosting', heading: 'Hébergement', blocks: [{ kind: 'p', text: 'Ce site est livré par Cloudflare, Inc., qui traite les informations techniques de chaque visite pour livrer les pages et les protéger contre les attaques. Cloudflare exploite des serveurs dans de nombreux pays : ces informations peuvent donc être traitées hors de Mauritanie. Lorsque les fonctions de sécurité de Cloudflare sont actives, Cloudflare peut déposer un cookie strictement technique pour distinguer les personnes du trafic automatisé.' }] },
      { id: 'email', heading: 'Quand vous nous écrivez', blocks: [{ kind: 'p', text: 'Si vous écrivez à l’une de nos adresses, nous recevons votre nom, votre adresse e-mail et votre message. Nous les utilisons uniquement pour vous répondre et donner suite à votre demande. Ils sont conservés dans les boîtes de messagerie du fournisseur d’e-mail de {displayName}. Vous pouvez nous demander de supprimer vos messages.' }] },
      { id: 'sale', heading: 'Aucune vente d’informations personnelles', blocks: [{ kind: 'p', text: '{displayName} ne vend pas d’informations personnelles et ne les utilise pas à des fins publicitaires.' }] },
      { id: 'requests', heading: 'Vos demandes', blocks: [{ kind: 'p', text: 'Vous pouvez demander à {displayName} quelles informations personnelles il détient sur vous, et en demander la correction ou la suppression, en écrivant à {privacyEmail}.' }] },
      { id: 'children', heading: 'Enfants', blocks: [{ kind: 'p', text: 'Ce site porte sur un logiciel d’entreprise et ne s’adresse pas aux enfants.' }] },
      { id: 'changes', heading: 'Modifications de cette politique', blocks: [{ kind: 'p', text: 'Cette politique changera à l’ouverture de Dukan ERP. La version et la date d’entrée en vigueur figurent en haut de cette page.' }] },
      { id: 'contact', heading: 'Contact', blocks: [{ kind: 'p', text: 'Écrivez à l’adresse de confidentialité ci-dessous.' }] },
    ],
  },
  ar: {
    version: '0.1 (مسودة ما قبل الإطلاق)',
    status: 'draft',
    title: 'سياسة الخصوصية',
    summary: 'كيف تتعامل {displayName} مع المعلومات الشخصية على هذا الموقع قبل افتتاح Dukan ERP.',
    sections: [
      { id: 'who', heading: 'من نحن', blocks: [{ kind: 'p', text: 'تنشر هذا الموقع {legalName} ({displayName}). لأي سؤال عن المعلومات الشخصية، راسلوا {privacyEmail}.' }] },
      { id: 'scope', heading: 'ما تشمله هذه السياسة', blocks: [{ kind: 'p', text: 'تشمل هذه السياسة هذا الموقع وحده. أما Dukan ERP، خدمة إدارة الأعمال التي تحضّرها {displayName}، فالتسجيل فيها غير مفتوح للعموم بعد، ولا تجمع أي معلومات عبر هذا الموقع. وستُنشر هنا سياسة خصوصية خاصة بخدمة Dukan ERP قبل افتتاحها.' }] },
      {
        id: 'collected',
        heading: 'ما يعالجه هذا الموقع',
        blocks: [
          {
            kind: 'list',
            items: [
              'لا يحتوي هذا الموقع على حساب ولا تسجيل دخول ولا استمارة، ولا يطلب منكم أي معلومات شخصية.',
              'يحتفظ متصفحكم على جهازكم أنتم باختياركم للغة والعرض الفاتح أو الداكن. لا يُرسل هذا الاختيار إلى {displayName}، ويمكنكم مسحه من إعدادات المتصفح.',
              'لا تضع شيفرة الموقع نفسها أي ملفات تعريف ارتباط، ولا تستخدم أي قياس للزيارات أو إعلانات أو تتبع.',
              'كما في أي موقع، ترسل كل زيارة معلومات تقنية إلى الخوادم التي تقدّم الصفحات: عنوان IP الخاص بكم، والصفحة المطلوبة، والوقت، ووصف متصفحكم.',
            ],
          },
        ],
      },
      { id: 'hosting', heading: 'الاستضافة', blocks: [{ kind: 'p', text: 'تقدّم هذا الموقعَ شركة Cloudflare, Inc.، التي تعالج المعلومات التقنية لكل زيارة لتقديم الصفحات وحمايتها من الهجمات. وتشغّل Cloudflare خوادم في بلدان كثيرة، لذلك قد تُعالج هذه المعلومات خارج موريتانيا. وعندما تكون ميزات الأمان لدى Cloudflare مفعّلة، قد تضع Cloudflare ملف تعريف ارتباط تقنيًا بحتًا للتمييز بين الأشخاص والزيارات الآلية.' }] },
      { id: 'email', heading: 'عندما تراسلوننا', blocks: [{ kind: 'p', text: 'إذا راسلتم أحد عناويننا، نتلقى اسمكم وعنوان بريدكم الإلكتروني ورسالتكم. ولا نستخدمها إلا للرد عليكم ومتابعة طلبكم. وتُحفظ في صناديق البريد لدى مزوّد البريد الإلكتروني الذي تعتمده {displayName}. ويمكنكم أن تطلبوا منا حذف رسائلكم.' }] },
      { id: 'sale', heading: 'لا بيع للمعلومات الشخصية', blocks: [{ kind: 'p', text: 'لا تبيع {displayName} المعلومات الشخصية ولا تستخدمها لأغراض إعلانية.' }] },
      { id: 'requests', heading: 'طلباتكم', blocks: [{ kind: 'p', text: 'يمكنكم أن تسألوا {displayName} عن المعلومات الشخصية التي تحتفظ بها عنكم، وأن تطلبوا تصحيحها أو حذفها، بمراسلة {privacyEmail}.' }] },
      { id: 'children', heading: 'الأطفال', blocks: [{ kind: 'p', text: 'يتناول هذا الموقع برمجيات للأعمال، وهو غير موجّه إلى الأطفال.' }] },
      { id: 'changes', heading: 'تغييرات هذه السياسة', blocks: [{ kind: 'p', text: 'ستتغير هذه السياسة عند افتتاح Dukan ERP. ويظهر رقم الإصدار وتاريخ السريان في أعلى هذه الصفحة.' }] },
      { id: 'contact', heading: 'التواصل', blocks: [{ kind: 'p', text: 'راسلوا عنوان الخصوصية أدناه.' }] },
    ],
  },
};

export const termsPrelaunch: Legal = {
  en: {
    version: '0.1 (pre-launch draft)',
    status: 'draft',
    title: 'Terms of use of this website',
    summary: 'The terms for using this website before Dukan ERP opens.',
    sections: [
      { id: 'who', heading: 'Who publishes this website', blocks: [{ kind: 'p', text: 'This website is published by {legalName} ({displayName}). By using it, you accept these terms.' }] },
      { id: 'prelaunch', heading: 'Dukan ERP is not yet available', blocks: [{ kind: 'p', text: 'Dukan ERP is being prepared for launch. This website does not sell it, take registrations for it or form any contract for it. The terms of service of Dukan ERP will be published here before the service opens.' }] },
      { id: 'information', heading: 'Information on this website', blocks: [{ kind: 'p', text: 'The descriptions of Dukan ERP show the product as it is being built. They may change before launch and are not an offer.' }] },
      { id: 'ip', heading: 'Intellectual property', blocks: [{ kind: 'p', text: 'The texts, design and software of this website belong to {legalName}, unless a notice says otherwise. They may not be copied or reused without its written permission.' }] },
      {
        id: 'use',
        heading: 'Using this website',
        blocks: [{ kind: 'list', items: ['Do not try to disrupt this website or to reach parts of it that are not public.', 'To report a security weakness, follow the security page.'] }],
      },
      { id: 'changes', heading: 'Changes to these terms', blocks: [{ kind: 'p', text: 'These terms may change. The version and the effective date are shown at the top of this page.' }] },
      { id: 'contact', heading: 'Contact', blocks: [{ kind: 'p', text: 'Questions about these terms can be sent to {supportEmail}.' }] },
    ],
  },
  fr: {
    version: '0.1 (projet de pré-lancement)',
    status: 'draft',
    title: 'Conditions d’utilisation de ce site',
    summary: 'Les conditions d’utilisation de ce site avant l’ouverture de Dukan ERP.',
    sections: [
      { id: 'who', heading: 'Qui publie ce site', blocks: [{ kind: 'p', text: 'Ce site est publié par {legalName} ({displayName}). En l’utilisant, vous acceptez ces conditions.' }] },
      { id: 'prelaunch', heading: 'Dukan ERP n’est pas encore disponible', blocks: [{ kind: 'p', text: 'Dukan ERP est en préparation pour son lancement. Ce site ne le vend pas, n’enregistre pas d’inscriptions et ne conclut aucun contrat à son sujet. Les conditions de service de Dukan ERP seront publiées ici avant son ouverture.' }] },
      { id: 'information', heading: 'Les informations de ce site', blocks: [{ kind: 'p', text: 'Les descriptions de Dukan ERP présentent le produit tel qu’il est en cours de construction. Elles peuvent changer avant le lancement et ne constituent pas une offre.' }] },
      { id: 'ip', heading: 'Propriété intellectuelle', blocks: [{ kind: 'p', text: 'Les textes, la présentation et le logiciel de ce site appartiennent à {legalName}, sauf mention contraire. Ils ne peuvent être copiés ou réutilisés sans son autorisation écrite.' }] },
      {
        id: 'use',
        heading: 'Utilisation de ce site',
        blocks: [{ kind: 'list', items: ['N’essayez pas de perturber ce site ni d’accéder à ses parties non publiques.', 'Pour signaler une faille de sécurité, suivez la page sécurité.'] }],
      },
      { id: 'changes', heading: 'Modifications de ces conditions', blocks: [{ kind: 'p', text: 'Ces conditions peuvent changer. La version et la date d’entrée en vigueur figurent en haut de cette page.' }] },
      { id: 'contact', heading: 'Contact', blocks: [{ kind: 'p', text: 'Les questions sur ces conditions peuvent être envoyées à {supportEmail}.' }] },
    ],
  },
  ar: {
    version: '0.1 (مسودة ما قبل الإطلاق)',
    status: 'draft',
    title: 'شروط استخدام هذا الموقع',
    summary: 'شروط استخدام هذا الموقع قبل افتتاح Dukan ERP.',
    sections: [
      { id: 'who', heading: 'من ينشر هذا الموقع', blocks: [{ kind: 'p', text: 'تنشر هذا الموقع {legalName} ({displayName}). وباستخدامكم له، فإنكم تقبلون هذه الشروط.' }] },
      { id: 'prelaunch', heading: 'Dukan ERP غير متاح بعد', blocks: [{ kind: 'p', text: 'Dukan ERP قيد التحضير للإطلاق. ولا يبيعه هذا الموقع ولا يقبل التسجيل فيه ولا يُبرم أي عقد بشأنه. وستُنشر هنا شروط خدمة Dukan ERP قبل افتتاحها.' }] },
      { id: 'information', heading: 'المعلومات على هذا الموقع', blocks: [{ kind: 'p', text: 'تعرض أوصاف Dukan ERP المنتج كما يُبنى الآن. وقد تتغير قبل الإطلاق، وليست عرضًا تعاقديًا.' }] },
      { id: 'ip', heading: 'الملكية الفكرية', blocks: [{ kind: 'p', text: 'نصوص هذا الموقع وتصميمه وبرمجياته ملك لـ{legalName}، ما لم يُذكر خلاف ذلك. ولا يجوز نسخها أو إعادة استخدامها دون إذن كتابي منها.' }] },
      {
        id: 'use',
        heading: 'استخدام هذا الموقع',
        blocks: [{ kind: 'list', items: ['لا تحاولوا تعطيل هذا الموقع أو الوصول إلى أجزائه غير العامة.', 'للإبلاغ عن ثغرة أمنية، اتبعوا صفحة الأمان.'] }],
      },
      { id: 'changes', heading: 'تغييرات هذه الشروط', blocks: [{ kind: 'p', text: 'قد تتغير هذه الشروط. ويظهر رقم الإصدار وتاريخ السريان في أعلى هذه الصفحة.' }] },
      { id: 'contact', heading: 'التواصل', blocks: [{ kind: 'p', text: 'يمكن إرسال الأسئلة عن هذه الشروط إلى {supportEmail}.' }] },
    ],
  },
};

export const accountDeletionPrelaunch: Legal = {
  en: {
    version: '0.1 (pre-launch draft)',
    status: 'draft',
    title: 'Account deletion',
    summary: 'Dukan ERP is not yet open, so there are no public accounts to delete. How deletion will work will be explained here before it opens.',
    sections: [
      { id: 'now', heading: 'Before Dukan ERP opens', blocks: [{ kind: 'p', text: 'Dukan ERP is not yet open for public registration, and this website has no accounts. There is nothing to delete here today.' }] },
      { id: 'later', heading: 'When Dukan ERP opens', blocks: [{ kind: 'p', text: 'Accounts will be deleted from inside the Dukan ERP mobile app. Before the service opens, this page will explain each step: how identity is confirmed, what is deleted and what has to be kept.' }] },
      { id: 'other', heading: 'Information given in another way', blocks: [{ kind: 'p', text: 'If you have given {displayName} personal information in another way, for example by email, write to {privacyEmail} to ask for it to be deleted.' }] },
    ],
  },
  fr: {
    version: '0.1 (projet de pré-lancement)',
    status: 'draft',
    title: 'Suppression de compte',
    summary: 'Dukan ERP n’est pas encore ouvert : il n’existe donc aucun compte public à supprimer. Le fonctionnement de la suppression sera expliqué ici avant l’ouverture.',
    sections: [
      { id: 'now', heading: 'Avant l’ouverture de Dukan ERP', blocks: [{ kind: 'p', text: 'Dukan ERP n’est pas encore ouvert aux inscriptions, et ce site n’a pas de comptes. Il n’y a aujourd’hui rien à supprimer ici.' }] },
      { id: 'later', heading: 'À l’ouverture de Dukan ERP', blocks: [{ kind: 'p', text: 'Les comptes se supprimeront depuis l’application mobile Dukan ERP. Avant l’ouverture du service, cette page en expliquera chaque étape : comment l’identité est confirmée, ce qui est supprimé et ce qui doit être conservé.' }] },
      { id: 'other', heading: 'Informations données autrement', blocks: [{ kind: 'p', text: 'Si vous avez donné des informations personnelles à {displayName} par un autre moyen, par exemple par e-mail, écrivez à {privacyEmail} pour en demander la suppression.' }] },
    ],
  },
  ar: {
    version: '0.1 (مسودة ما قبل الإطلاق)',
    status: 'draft',
    title: 'حذف الحساب',
    summary: 'لم يُفتح Dukan ERP بعد، ولذلك لا توجد حسابات عامة لحذفها. وستُشرح هنا طريقة الحذف قبل الافتتاح.',
    sections: [
      { id: 'now', heading: 'قبل افتتاح Dukan ERP', blocks: [{ kind: 'p', text: 'التسجيل في Dukan ERP غير مفتوح للعموم بعد، ولا توجد حسابات على هذا الموقع. فلا شيء لحذفه هنا اليوم.' }] },
      { id: 'later', heading: 'عند افتتاح Dukan ERP', blocks: [{ kind: 'p', text: 'ستُحذف الحسابات من داخل تطبيق Dukan ERP على الهاتف. وقبل افتتاح الخدمة، ستشرح هذه الصفحة كل خطوة: كيف تُؤكَّد الهوية، وما الذي يُحذف، وما الذي يجب الاحتفاظ به.' }] },
      { id: 'other', heading: 'معلومات قُدّمت بطريقة أخرى', blocks: [{ kind: 'p', text: 'إذا قدّمتم معلومات شخصية إلى {displayName} بطريقة أخرى، كالبريد الإلكتروني مثلًا، فراسلوا {privacyEmail} لطلب حذفها.' }] },
    ],
  },
};

export const privacyChoicesPrelaunch: Legal = {
  en: {
    version: '0.1 (pre-launch draft)',
    status: 'draft',
    title: 'Privacy choices',
    summary: 'The choices you have about personal information on this website.',
    sections: [
      { id: 'display', heading: 'Language and display', blocks: [{ kind: 'p', text: 'Your choice of language and of light or dark display is kept in your browser. You can change it on any page, or clear it in your browser’s settings.' }] },
      { id: 'tracking', heading: 'No tracking to refuse', blocks: [{ kind: 'p', text: 'This website uses no analytics, advertising or tracking, so there is nothing to opt out of.' }] },
      { id: 'requests', heading: 'Asking about your information', blocks: [{ kind: 'p', text: 'To ask what {displayName} holds about you, or to have it corrected or deleted, write to {privacyEmail}.' }] },
      { id: 'service', heading: 'Dukan ERP', blocks: [{ kind: 'p', text: 'Dukan ERP is not yet open. The choices it will offer will be described here before it opens.' }] },
      { id: 'contact', heading: 'Contact', blocks: [{ kind: 'p', text: 'Write to the privacy address below.' }] },
    ],
  },
  fr: {
    version: '0.1 (projet de pré-lancement)',
    status: 'draft',
    title: 'Choix de confidentialité',
    summary: 'Les choix dont vous disposez sur les informations personnelles de ce site.',
    sections: [
      { id: 'display', heading: 'Langue et affichage', blocks: [{ kind: 'p', text: 'Votre choix de langue et d’affichage clair ou sombre est conservé dans votre navigateur. Vous pouvez le changer sur chaque page, ou l’effacer dans les réglages de votre navigateur.' }] },
      { id: 'tracking', heading: 'Aucun pistage à refuser', blocks: [{ kind: 'p', text: 'Ce site n’utilise ni mesure d’audience, ni publicité, ni pistage : il n’y a donc rien à refuser.' }] },
      { id: 'requests', heading: 'Vous renseigner sur vos informations', blocks: [{ kind: 'p', text: 'Pour savoir ce que {displayName} détient sur vous, ou le faire corriger ou supprimer, écrivez à {privacyEmail}.' }] },
      { id: 'service', heading: 'Dukan ERP', blocks: [{ kind: 'p', text: 'Dukan ERP n’est pas encore ouvert. Les choix qu’il proposera seront décrits ici avant son ouverture.' }] },
      { id: 'contact', heading: 'Contact', blocks: [{ kind: 'p', text: 'Écrivez à l’adresse de confidentialité ci-dessous.' }] },
    ],
  },
  ar: {
    version: '0.1 (مسودة ما قبل الإطلاق)',
    status: 'draft',
    title: 'خيارات الخصوصية',
    summary: 'الخيارات المتاحة لكم بشأن المعلومات الشخصية على هذا الموقع.',
    sections: [
      { id: 'display', heading: 'اللغة والعرض', blocks: [{ kind: 'p', text: 'يُحفظ اختياركم للغة والعرض الفاتح أو الداكن في متصفحكم. ويمكنكم تغييره من أي صفحة، أو مسحه من إعدادات المتصفح.' }] },
      { id: 'tracking', heading: 'لا تتبع لرفضه', blocks: [{ kind: 'p', text: 'لا يستخدم هذا الموقع أي قياس للزيارات أو إعلانات أو تتبع، فلا شيء يستدعي الرفض.' }] },
      { id: 'requests', heading: 'السؤال عن معلوماتكم', blocks: [{ kind: 'p', text: 'لمعرفة ما تحتفظ به {displayName} عنكم، أو لطلب تصحيحه أو حذفه، راسلوا {privacyEmail}.' }] },
      { id: 'service', heading: 'Dukan ERP', blocks: [{ kind: 'p', text: 'لم يُفتح Dukan ERP بعد. وستُوصف هنا الخيارات التي سيقدّمها قبل افتتاحه.' }] },
      { id: 'contact', heading: 'التواصل', blocks: [{ kind: 'p', text: 'راسلوا عنوان الخصوصية أدناه.' }] },
    ],
  },
};

export const legalNoticePrelaunch: Legal = {
  en: {
    version: '0.1 (pre-launch draft)',
    status: 'draft',
    title: 'Legal notice',
    summary: 'Who publishes this website, and how to reach them.',
    sections: [
      { id: 'entity', heading: 'Publisher', blocks: [{ kind: 'p', text: 'This website is published by {legalName}, trading as {displayName}. Its registered details are below.' }] },
      { id: 'product', heading: 'Dukan ERP', blocks: [{ kind: 'p', text: 'Dukan ERP is the name of a product {displayName} is preparing. It is not yet open for public registration.' }] },
      { id: 'hosting', heading: 'Hosting', blocks: [{ kind: 'p', text: 'This website is hosted by Cloudflare, Inc.' }] },
      { id: 'contact', heading: 'Contact', blocks: [{ kind: 'p', text: 'Write to the address that matches your question:' }] },
      { id: 'ip', heading: 'Copyright and trademarks', blocks: [{ kind: 'p', text: 'The texts, design and software of this website belong to {legalName}, unless a notice says otherwise. They may not be copied or reused without its written permission.' }] },
      { id: 'policies', heading: 'Policies', blocks: [{ kind: 'p', text: 'How this website handles information is set out in these pages:' }] },
    ],
  },
  fr: {
    version: '0.1 (projet de pré-lancement)',
    status: 'draft',
    title: 'Mentions légales',
    summary: 'Qui publie ce site, et comment le joindre.',
    sections: [
      { id: 'entity', heading: 'Éditeur', blocks: [{ kind: 'p', text: 'Ce site est publié par {legalName}, sous le nom commercial {displayName}. Ses informations d’immatriculation figurent ci-dessous.' }] },
      { id: 'product', heading: 'Dukan ERP', blocks: [{ kind: 'p', text: 'Dukan ERP est le nom d’un produit que prépare {displayName}. Il n’est pas encore ouvert aux inscriptions.' }] },
      { id: 'hosting', heading: 'Hébergement', blocks: [{ kind: 'p', text: 'Ce site est hébergé par Cloudflare, Inc.' }] },
      { id: 'contact', heading: 'Contact', blocks: [{ kind: 'p', text: 'Écrivez à l’adresse qui correspond à votre question :' }] },
      { id: 'ip', heading: 'Droits d’auteur et marques', blocks: [{ kind: 'p', text: 'Les textes, la présentation et le logiciel de ce site appartiennent à {legalName}, sauf mention contraire. Ils ne peuvent être copiés ou réutilisés sans son autorisation écrite.' }] },
      { id: 'policies', heading: 'Politiques', blocks: [{ kind: 'p', text: 'La manière dont ce site traite les informations est exposée dans ces pages :' }] },
    ],
  },
  ar: {
    version: '0.1 (مسودة ما قبل الإطلاق)',
    status: 'draft',
    title: 'إشعار قانوني',
    summary: 'من ينشر هذا الموقع، وكيف يمكن التواصل معه.',
    sections: [
      { id: 'entity', heading: 'الناشر', blocks: [{ kind: 'p', text: 'تنشر هذا الموقع {legalName}، باسمها التجاري {displayName}. وبياناتها المسجلة مذكورة أدناه.' }] },
      { id: 'product', heading: 'Dukan ERP', blocks: [{ kind: 'p', text: 'Dukan ERP هو اسم منتج تحضّره {displayName}. والتسجيل فيه غير مفتوح للعموم بعد.' }] },
      { id: 'hosting', heading: 'الاستضافة', blocks: [{ kind: 'p', text: 'تستضيف هذا الموقعَ شركة Cloudflare, Inc.' }] },
      { id: 'contact', heading: 'التواصل', blocks: [{ kind: 'p', text: 'راسلوا العنوان الذي يناسب سؤالكم:' }] },
      { id: 'ip', heading: 'حقوق النشر والعلامات التجارية', blocks: [{ kind: 'p', text: 'نصوص هذا الموقع وتصميمه وبرمجياته ملك لـ{legalName}، ما لم يُذكر خلاف ذلك. ولا يجوز نسخها أو إعادة استخدامها دون إذن كتابي منها.' }] },
      { id: 'policies', heading: 'السياسات', blocks: [{ kind: 'p', text: 'تشرح هذه الصفحات كيف يتعامل هذا الموقع مع المعلومات:' }] },
    ],
  },
};

export const securityPrelaunch: Legal = {
  en: {
    version: '0.1 (pre-launch draft)',
    status: 'draft',
    title: 'Reporting a security problem',
    summary: 'How to tell {displayName} about a weakness in this website or in Dukan ERP, and what we ask of you.',
    sections: [
      { id: 'how', heading: 'How to report', blocks: [{ kind: 'p', text: 'Write to {securityEmail}. Please include what you found, where, the steps that reproduce it, and what someone could do with it. One problem per message helps.' }] },
      {
        id: 'rules',
        heading: 'What we ask of you',
        blocks: [
          {
            kind: 'list',
            items: [
              'Do not read, copy, change or delete anyone’s information. If a test reaches such information, stop and report it.',
              'Do not slow down, overload or interrupt this website.',
              'Do not try to trick people, and do not test physical premises.',
              'Give us a reasonable time to fix a problem before you tell anyone else about it.',
              'Never ask for payment in exchange for not publishing or not exploiting what you found.',
            ],
          },
        ],
      },
      { id: 'next', heading: 'What happens next', blocks: [{ kind: 'p', text: '{displayName} reads every report sent to {securityEmail} and replies to the address it came from. {displayName} does not offer payment or rewards for reports.' }] },
    ],
  },
  fr: {
    version: '0.1 (projet de pré-lancement)',
    status: 'draft',
    title: 'Signaler un problème de sécurité',
    summary: 'Comment signaler à {displayName} une faille dans ce site ou dans Dukan ERP, et ce que nous vous demandons.',
    sections: [
      { id: 'how', heading: 'Comment signaler', blocks: [{ kind: 'p', text: 'Écrivez à {securityEmail}. Indiquez ce que vous avez trouvé, où, les étapes pour le reproduire et ce qu’une personne pourrait en faire. Un problème par message, c’est plus simple.' }] },
      {
        id: 'rules',
        heading: 'Ce que nous vous demandons',
        blocks: [
          {
            kind: 'list',
            items: [
              'Ne lisez, ne copiez, ne modifiez et ne supprimez les informations de personne. Si un test atteint de telles informations, arrêtez-vous et signalez-le.',
              'Ne ralentissez pas, ne surchargez pas et n’interrompez pas ce site.',
              'N’essayez pas de tromper des personnes et ne testez pas de locaux physiques.',
              'Laissez-nous un délai raisonnable pour corriger un problème avant d’en parler à qui que ce soit.',
              'Ne demandez jamais de paiement en échange de ne pas publier ou de ne pas exploiter ce que vous avez trouvé.',
            ],
          },
        ],
      },
      { id: 'next', heading: 'La suite', blocks: [{ kind: 'p', text: '{displayName} lit chaque signalement envoyé à {securityEmail} et répond à l’adresse d’où il vient. {displayName} n’offre ni paiement ni récompense pour les signalements.' }] },
    ],
  },
  ar: {
    version: '0.1 (مسودة ما قبل الإطلاق)',
    status: 'draft',
    title: 'الإبلاغ عن مشكلة أمنية',
    summary: 'كيف تُبلغون {displayName} عن ثغرة في هذا الموقع أو في Dukan ERP، وما نطلبه منكم.',
    sections: [
      { id: 'how', heading: 'طريقة الإبلاغ', blocks: [{ kind: 'p', text: 'راسلوا {securityEmail}. واذكروا ما وجدتموه وأين، وخطوات إعادة إظهاره، وما يمكن لأي شخص أن يفعله به. ويُفضَّل إرسال مشكلة واحدة في كل رسالة.' }] },
      {
        id: 'rules',
        heading: 'ما نطلبه منكم',
        blocks: [
          {
            kind: 'list',
            items: [
              'لا تقرؤوا معلومات أي شخص ولا تنسخوها ولا تغيّروها ولا تحذفوها. وإذا وصل اختبار إلى معلومات كهذه، فتوقفوا وأبلغوا عنه.',
              'لا تبطّئوا هذا الموقع ولا تُثقلوه ولا توقفوه.',
              'لا تحاولوا خداع أي شخص، ولا تختبروا أي مقار مادية.',
              'امنحونا وقتًا معقولًا لإصلاح المشكلة قبل إخبار أي أحد بها.',
              'لا تطلبوا أبدًا مقابلًا ماليًا لعدم نشر ما وجدتموه أو عدم استغلاله.',
            ],
          },
        ],
      },
      { id: 'next', heading: 'ماذا يحدث بعد ذلك', blocks: [{ kind: 'p', text: 'تقرأ {displayName} كل بلاغ يُرسل إلى {securityEmail} وترد على العنوان الذي جاء منه. ولا تقدّم {displayName} أي مقابل أو مكافأة على البلاغات.' }] },
    ],
  },
};
