import type { Language } from '../i18n/languages';
import type { LegalDocument } from './types';

/**
 * The legal pages of the public website before Dukan ERP opens (the owner's brief of 2026-10-17; docs/96). They describe
 * only what this website does today, from its code: no account, no form, no request to any service, no cookie of its
 * own, the language and display choice kept in the browser (`erp.web.language`, `erp.web.theme`), delivery by
 * Cloudflare. A process that does not work yet (registration, payment, trial, account deletion) is described as
 * pre-launch information, never as working. The service's own texts (`legal-*.ts`) stay for the portal and the app,
 * whose gates remain closed. Approved by TSX-MR on 2026-10-17 (docs/97); not legal advice, and counsel review stays
 * recommended (docs/97 §4).
 *
 * Who publishes the website (the owner's brief of 2026-10-17, third): TSX-MR is a project and trading name, not a
 * separately incorporated company, operated by one individual. `{operatorStatus}` says so in each language, and no
 * text names a legal form, a registration number or anything else the owner did not give.
 *
 * Version 1.0: the six texts of version 0.3 (docs/97), approved as they are by TSX-MR on 2026-10-17 with the
 * commitments of docs/97 §3 confirmed — the only change here is each document's `status` and `version`, as docs/97 §1
 * instructs. The effective date is the deployment day, set as `VITE_LEGAL_EFFECTIVE_DATE` in the host's environment.
 *
 * Version 0.3 (the brief "Final Legal, Identity, Portal and Website Production Preparation", 2026-10-17): the
 * correspondence address (`{postalAddress}`); contact by telephone or WhatsApp; the providers the service is planned to
 * use (Brevo, Meta's WhatsApp Cloud API), named as plans, never as working here; identity checks on requests; the host's
 * address. Commitments the owner must confirm are listed in docs/97 §3, and the legal questions in docs/97 §4.
 */
type Legal = Record<Language, LegalDocument>;

export const privacyPrelaunch: Legal = {
  en: {
    version: '1.1',
    status: 'approved',
    title: 'Privacy policy',
    summary: 'How {displayName} handles personal information on this website before Dukan ERP opens.',
    sections: [
      { id: 'who', heading: 'Who is responsible', blocks: [{ kind: 'p', text: '{operatorStatus} This website is published under that name, and the operator is responsible for the personal information it processes. Correspondence address: {postalAddress}. For any question about personal information, write to {privacyEmail}.' }] },
      { id: 'scope', heading: 'What this policy covers', blocks: [{ kind: 'p', text: 'This policy covers this website only. Dukan ERP, a business-management product operated under the {displayName} name, is not yet open for public registration and collects no information through this website. A privacy policy for the Dukan ERP service will be published here before the service opens. It will describe what the service collects and name the providers it relies on, which are planned to include Brevo for transactional email and Meta’s WhatsApp Business Platform (Cloud API) for verification messages. Neither is used by this website.' }] },
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
      { id: 'email', heading: 'When you contact us', blocks: [{ kind: 'p', text: 'If you write to one of our addresses, call one of our numbers or send them a WhatsApp message, we receive what you choose to share: for example your name, your email address or telephone number, and your message. We use it only to answer you and to follow up on your request, and we keep it only for as long as that takes. Emails are kept in the mailboxes of the email provider {displayName} uses. A WhatsApp message is also processed by WhatsApp (Meta), under its own terms. You can ask us to delete what you sent.' }] },
      { id: 'sale', heading: 'No sale of personal information', blocks: [{ kind: 'p', text: '{displayName} does not sell personal information and does not use it for advertising.' }] },
      { id: 'requests', heading: 'Your requests', blocks: [{ kind: 'p', text: 'You can ask {displayName} what personal information it holds about you, and ask for it to be corrected or deleted, by writing to {privacyEmail} or to the correspondence address. We may ask you to confirm who you are before acting on a request, so that information is never given to the wrong person. We answer as soon as we can.' }] },
      { id: 'security', heading: 'Security', blocks: [{ kind: 'p', text: 'This website is served over HTTPS only and holds no account or password. To report a weakness, follow the security page.' }] },
      { id: 'children', heading: 'Children', blocks: [{ kind: 'p', text: 'This website is about business software and is not directed to children.' }] },
      { id: 'changes', heading: 'Changes to this policy', blocks: [{ kind: 'p', text: 'This policy will change when Dukan ERP opens. The version and the effective date are shown at the top of this page.' }] },
      { id: 'contact', heading: 'Contact', blocks: [{ kind: 'p', text: 'Write to the privacy address below.' }] },
    ],
  },
  fr: {
    version: '1.1',
    status: 'approved',
    title: 'Politique de confidentialité',
    summary: 'Comment {displayName} traite les informations personnelles sur ce site avant l’ouverture de Dukan ERP.',
    sections: [
      { id: 'who', heading: 'Qui est responsable', blocks: [{ kind: 'p', text: '{operatorStatus} Ce site est publié sous ce nom, et l’exploitant est responsable des informations personnelles qu’il traite. Adresse de correspondance : {postalAddress}. Pour toute question sur les informations personnelles, écrivez à {privacyEmail}.' }] },
      { id: 'scope', heading: 'Ce que couvre cette politique', blocks: [{ kind: 'p', text: 'Cette politique couvre uniquement ce site. Dukan ERP, un produit de gestion d’entreprise exploité sous le nom {displayName}, n’est pas encore ouvert aux inscriptions et ne collecte aucune information par ce site. Une politique de confidentialité du service Dukan ERP sera publiée ici avant son ouverture. Elle décrira ce que collecte le service et nommera les prestataires sur lesquels il s’appuie, dont il est prévu qu’ils comprennent Brevo pour les e-mails transactionnels et la plateforme WhatsApp Business de Meta (Cloud API) pour les messages de vérification. Aucun des deux n’est utilisé par ce site.' }] },
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
      { id: 'email', heading: 'Quand vous nous contactez', blocks: [{ kind: 'p', text: 'Si vous écrivez à l’une de nos adresses, appelez l’un de nos numéros ou leur envoyez un message WhatsApp, nous recevons ce que vous choisissez de partager : par exemple votre nom, votre adresse e-mail ou votre numéro de téléphone, et votre message. Nous l’utilisons uniquement pour vous répondre et donner suite à votre demande, et nous ne le conservons que le temps nécessaire. Les e-mails sont conservés dans les boîtes de messagerie du fournisseur d’e-mail utilisé par {displayName}. Un message WhatsApp est aussi traité par WhatsApp (Meta), selon ses propres conditions. Vous pouvez nous demander de supprimer ce que vous avez envoyé.' }] },
      { id: 'sale', heading: 'Aucune vente d’informations personnelles', blocks: [{ kind: 'p', text: '{displayName} ne vend pas d’informations personnelles et ne les utilise pas à des fins publicitaires.' }] },
      { id: 'requests', heading: 'Vos demandes', blocks: [{ kind: 'p', text: 'Vous pouvez demander à {displayName} quelles informations personnelles il détient sur vous, et en demander la correction ou la suppression, en écrivant à {privacyEmail} ou à l’adresse de correspondance. Nous pouvons vous demander de confirmer votre identité avant de donner suite, afin qu’aucune information ne soit remise à la mauvaise personne. Nous répondons dès que possible.' }] },
      { id: 'security', heading: 'Sécurité', blocks: [{ kind: 'p', text: 'Ce site est servi uniquement en HTTPS et ne détient ni compte ni mot de passe. Pour signaler une faille, suivez la page sécurité.' }] },
      { id: 'children', heading: 'Enfants', blocks: [{ kind: 'p', text: 'Ce site porte sur un logiciel d’entreprise et ne s’adresse pas aux enfants.' }] },
      { id: 'changes', heading: 'Modifications de cette politique', blocks: [{ kind: 'p', text: 'Cette politique changera à l’ouverture de Dukan ERP. La version et la date d’entrée en vigueur figurent en haut de cette page.' }] },
      { id: 'contact', heading: 'Contact', blocks: [{ kind: 'p', text: 'Écrivez à l’adresse de confidentialité ci-dessous.' }] },
    ],
  },
  ar: {
    version: '1.1',
    status: 'approved',
    title: 'سياسة الخصوصية',
    summary: 'كيف يتعامل {displayName} مع المعلومات الشخصية على هذا الموقع قبل افتتاح Dukan ERP.',
    sections: [
      { id: 'who', heading: 'من المسؤول', blocks: [{ kind: 'p', text: '{operatorStatus} ويُنشر هذا الموقع بهذا الاسم، وتقع المسؤولية عن المعلومات الشخصية التي يعالجها على المشغّل. عنوان المراسلة: {postalAddress}. لأي سؤال عن المعلومات الشخصية، راسلوا {privacyEmail}.' }] },
      { id: 'scope', heading: 'ما تشمله هذه السياسة', blocks: [{ kind: 'p', text: 'تشمل هذه السياسة هذا الموقع وحده. أما Dukan ERP، منتج إدارة الأعمال الذي يُشغَّل تحت اسم {displayName}، فالتسجيل فيه غير مفتوح للعموم بعد، ولا يجمع أي معلومات عبر هذا الموقع. وستُنشر هنا سياسة خصوصية خاصة بخدمة Dukan ERP قبل افتتاحها، تصف ما تجمعه الخدمة وتسمّي المزوّدين الذين تعتمد عليهم، ومن المقرر أن يكون بينهم Brevo للرسائل الإلكترونية التشغيلية ومنصة WhatsApp Business التابعة لـMeta (Cloud API) لرسائل التحقق. ولا يستخدم هذا الموقع أيًّا منهما.' }] },
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
      { id: 'email', heading: 'عندما تتواصلون معنا', blocks: [{ kind: 'p', text: 'إذا راسلتم أحد عناويننا أو اتصلتم بأحد أرقامنا أو أرسلتم إليه رسالة واتساب، نتلقى ما تختارون مشاركته: كاسمكم أو عنوان بريدكم الإلكتروني أو رقم هاتفكم، ورسالتكم. ولا نستخدم ذلك إلا للرد عليكم ومتابعة طلبكم، ولا نحتفظ به إلا المدة اللازمة لذلك. وتُحفظ الرسائل الإلكترونية في صناديق البريد لدى مزوّد البريد الإلكتروني الذي يعتمده {displayName}. وتعالج واتساب (Meta) رسالة واتساب أيضًا وفق شروطها الخاصة. ويمكنكم أن تطلبوا منا حذف ما أرسلتموه.' }] },
      { id: 'sale', heading: 'لا بيع للمعلومات الشخصية', blocks: [{ kind: 'p', text: 'لا يبيع {displayName} المعلومات الشخصية ولا يستخدمها لأغراض إعلانية.' }] },
      { id: 'requests', heading: 'طلباتكم', blocks: [{ kind: 'p', text: 'يمكنكم أن تسألوا {displayName} عن المعلومات الشخصية التي يحتفظ بها عنكم، وأن تطلبوا تصحيحها أو حذفها، بمراسلة {privacyEmail} أو عنوان المراسلة. وقد نطلب منكم تأكيد هويتكم قبل تنفيذ الطلب، حتى لا تُسلَّم أي معلومات إلى غير صاحبها. ونرد في أقرب وقت ممكن.' }] },
      { id: 'security', heading: 'الأمان', blocks: [{ kind: 'p', text: 'لا يُقدَّم هذا الموقع إلا عبر HTTPS، ولا يحتفظ بأي حساب أو كلمة مرور. وللإبلاغ عن ثغرة، اتبعوا صفحة الأمان.' }] },
      { id: 'children', heading: 'الأطفال', blocks: [{ kind: 'p', text: 'يتناول هذا الموقع برمجيات للأعمال، وهو غير موجّه إلى الأطفال.' }] },
      { id: 'changes', heading: 'تغييرات هذه السياسة', blocks: [{ kind: 'p', text: 'ستتغير هذه السياسة عند افتتاح Dukan ERP. ويظهر رقم الإصدار وتاريخ السريان في أعلى هذه الصفحة.' }] },
      { id: 'contact', heading: 'التواصل', blocks: [{ kind: 'p', text: 'راسلوا عنوان الخصوصية أدناه.' }] },
    ],
  },
};

export const termsPrelaunch: Legal = {
  en: {
    version: '1.1',
    status: 'approved',
    title: 'Terms of use of this website',
    summary: 'The terms for using this website before Dukan ERP opens.',
    sections: [
      { id: 'who', heading: 'Who publishes this website', blocks: [{ kind: 'p', text: '{operatorStatus} This website is published under that name. By using it, you accept these terms.' }] },
      { id: 'prelaunch', heading: 'Dukan ERP is not yet available', blocks: [{ kind: 'p', text: 'Dukan ERP is being prepared for launch. This website does not sell it, take registrations for it or form any contract for it. The terms of service of Dukan ERP will be published here before the service opens.' }] },
      { id: 'information', heading: 'Information on this website', blocks: [{ kind: 'p', text: 'The descriptions of Dukan ERP show the product as it is being built. They may change before launch. They are not an offer, a price or a promise of availability.' }] },
      { id: 'ip', heading: 'Intellectual property', blocks: [{ kind: 'p', text: 'The texts, design and software of this website belong to the operator, unless a notice says otherwise. They may not be copied or reused without written permission.' }] },
      {
        id: 'use',
        heading: 'Using this website',
        blocks: [{ kind: 'list', items: ['Do not try to disrupt this website or to reach parts of it that are not public.', 'To report a security weakness, follow the security page.'] }],
      },
      { id: 'changes', heading: 'Changes to these terms', blocks: [{ kind: 'p', text: 'These terms may change. The version and the effective date are shown at the top of this page.' }] },
      { id: 'contact', heading: 'Contact', blocks: [{ kind: 'p', text: 'Questions about these terms can be sent to {contactEmail}, or by post to {postalAddress}.' }] },
    ],
  },
  fr: {
    version: '1.1',
    status: 'approved',
    title: 'Conditions d’utilisation de ce site',
    summary: 'Les conditions d’utilisation de ce site avant l’ouverture de Dukan ERP.',
    sections: [
      { id: 'who', heading: 'Qui publie ce site', blocks: [{ kind: 'p', text: '{operatorStatus} Ce site est publié sous ce nom. En l’utilisant, vous acceptez ces conditions.' }] },
      { id: 'prelaunch', heading: 'Dukan ERP n’est pas encore disponible', blocks: [{ kind: 'p', text: 'Dukan ERP est en préparation pour son lancement. Ce site ne le vend pas, n’enregistre pas d’inscriptions et ne conclut aucun contrat à son sujet. Les conditions de service de Dukan ERP seront publiées ici avant son ouverture.' }] },
      { id: 'information', heading: 'Les informations de ce site', blocks: [{ kind: 'p', text: 'Les descriptions de Dukan ERP présentent le produit tel qu’il est en cours de construction. Elles peuvent changer avant le lancement. Elles ne constituent ni une offre, ni un prix, ni une promesse de disponibilité.' }] },
      { id: 'ip', heading: 'Propriété intellectuelle', blocks: [{ kind: 'p', text: 'Les textes, la présentation et le logiciel de ce site appartiennent à l’exploitant, sauf mention contraire. Ils ne peuvent être copiés ou réutilisés sans autorisation écrite.' }] },
      {
        id: 'use',
        heading: 'Utilisation de ce site',
        blocks: [{ kind: 'list', items: ['N’essayez pas de perturber ce site ni d’accéder à ses parties non publiques.', 'Pour signaler une faille de sécurité, suivez la page sécurité.'] }],
      },
      { id: 'changes', heading: 'Modifications de ces conditions', blocks: [{ kind: 'p', text: 'Ces conditions peuvent changer. La version et la date d’entrée en vigueur figurent en haut de cette page.' }] },
      { id: 'contact', heading: 'Contact', blocks: [{ kind: 'p', text: 'Les questions sur ces conditions peuvent être envoyées à {contactEmail}, ou par courrier à {postalAddress}.' }] },
    ],
  },
  ar: {
    version: '1.1',
    status: 'approved',
    title: 'شروط استخدام هذا الموقع',
    summary: 'شروط استخدام هذا الموقع قبل افتتاح Dukan ERP.',
    sections: [
      { id: 'who', heading: 'من ينشر هذا الموقع', blocks: [{ kind: 'p', text: '{operatorStatus} ويُنشر هذا الموقع بهذا الاسم. وباستخدامكم له، فإنكم تقبلون هذه الشروط.' }] },
      { id: 'prelaunch', heading: 'Dukan ERP غير متاح بعد', blocks: [{ kind: 'p', text: 'Dukan ERP قيد التحضير للإطلاق. ولا يبيعه هذا الموقع ولا يقبل التسجيل فيه ولا يُبرم أي عقد بشأنه. وستُنشر هنا شروط خدمة Dukan ERP قبل افتتاحها.' }] },
      { id: 'information', heading: 'المعلومات على هذا الموقع', blocks: [{ kind: 'p', text: 'تعرض أوصاف Dukan ERP المنتج كما يُبنى الآن. وقد تتغير قبل الإطلاق. وهي ليست عرضًا تعاقديًا ولا سعرًا ولا وعدًا بالإتاحة.' }] },
      { id: 'ip', heading: 'الملكية الفكرية', blocks: [{ kind: 'p', text: 'نصوص هذا الموقع وتصميمه وبرمجياته ملك للمشغّل، ما لم يُذكر خلاف ذلك. ولا يجوز نسخها أو إعادة استخدامها دون إذن كتابي.' }] },
      {
        id: 'use',
        heading: 'استخدام هذا الموقع',
        blocks: [{ kind: 'list', items: ['لا تحاولوا تعطيل هذا الموقع أو الوصول إلى أجزائه غير العامة.', 'للإبلاغ عن ثغرة أمنية، اتبعوا صفحة الأمان.'] }],
      },
      { id: 'changes', heading: 'تغييرات هذه الشروط', blocks: [{ kind: 'p', text: 'قد تتغير هذه الشروط. ويظهر رقم الإصدار وتاريخ السريان في أعلى هذه الصفحة.' }] },
      { id: 'contact', heading: 'التواصل', blocks: [{ kind: 'p', text: 'يمكن إرسال الأسئلة عن هذه الشروط إلى {contactEmail}، أو بالبريد إلى {postalAddress}.' }] },
    ],
  },
};

export const accountDeletionPrelaunch: Legal = {
  en: {
    version: '1.0',
    status: 'approved',
    title: 'Account deletion',
    summary: 'Dukan ERP is not yet open, so there are no public accounts to delete. How deletion will work will be explained here before it opens.',
    sections: [
      { id: 'now', heading: 'Before Dukan ERP opens', blocks: [{ kind: 'p', text: 'Dukan ERP is not yet open for public registration, and this website has no accounts. There is nothing to delete here today.' }] },
      { id: 'later', heading: 'When Dukan ERP opens', blocks: [{ kind: 'p', text: 'Accounts will be deleted from inside the Dukan ERP mobile app. Before the service opens, this page will explain each step: how identity is confirmed, what is deleted and what has to be kept.' }] },
      { id: 'other', heading: 'Information given in another way', blocks: [{ kind: 'p', text: 'If you have given {displayName} personal information in another way, for example by email, by telephone or through WhatsApp, write to {privacyEmail} to ask for it to be deleted. We may ask you to confirm who you are. We then delete it, unless the law requires us to keep it, and tell you when it is done.' }] },
    ],
  },
  fr: {
    version: '1.0',
    status: 'approved',
    title: 'Suppression de compte',
    summary: 'Dukan ERP n’est pas encore ouvert : il n’existe donc aucun compte public à supprimer. Le fonctionnement de la suppression sera expliqué ici avant l’ouverture.',
    sections: [
      { id: 'now', heading: 'Avant l’ouverture de Dukan ERP', blocks: [{ kind: 'p', text: 'Dukan ERP n’est pas encore ouvert aux inscriptions, et ce site n’a pas de comptes. Il n’y a aujourd’hui rien à supprimer ici.' }] },
      { id: 'later', heading: 'À l’ouverture de Dukan ERP', blocks: [{ kind: 'p', text: 'Les comptes se supprimeront depuis l’application mobile Dukan ERP. Avant l’ouverture du service, cette page en expliquera chaque étape : comment l’identité est confirmée, ce qui est supprimé et ce qui doit être conservé.' }] },
      { id: 'other', heading: 'Informations données autrement', blocks: [{ kind: 'p', text: 'Si vous avez donné des informations personnelles à {displayName} par un autre moyen, par exemple par e-mail, par téléphone ou par WhatsApp, écrivez à {privacyEmail} pour en demander la suppression. Nous pouvons vous demander de confirmer votre identité. Nous les supprimons ensuite, sauf si la loi nous oblige à les conserver, et vous prévenons une fois que c’est fait.' }] },
    ],
  },
  ar: {
    version: '1.0',
    status: 'approved',
    title: 'حذف الحساب',
    summary: 'لم يُفتح Dukan ERP بعد، ولذلك لا توجد حسابات عامة لحذفها. وستُشرح هنا طريقة الحذف قبل الافتتاح.',
    sections: [
      { id: 'now', heading: 'قبل افتتاح Dukan ERP', blocks: [{ kind: 'p', text: 'التسجيل في Dukan ERP غير مفتوح للعموم بعد، ولا توجد حسابات على هذا الموقع. فلا شيء لحذفه هنا اليوم.' }] },
      { id: 'later', heading: 'عند افتتاح Dukan ERP', blocks: [{ kind: 'p', text: 'ستُحذف الحسابات من داخل تطبيق Dukan ERP على الهاتف. وقبل افتتاح الخدمة، ستشرح هذه الصفحة كل خطوة: كيف تُؤكَّد الهوية، وما الذي يُحذف، وما الذي يجب الاحتفاظ به.' }] },
      { id: 'other', heading: 'معلومات قُدّمت بطريقة أخرى', blocks: [{ kind: 'p', text: 'إذا قدّمتم معلومات شخصية إلى {displayName} بطريقة أخرى، كالبريد الإلكتروني أو الهاتف أو واتساب مثلًا، فراسلوا {privacyEmail} لطلب حذفها. وقد نطلب منكم تأكيد هويتكم. ثم نحذفها، ما لم يُلزمنا القانون بالاحتفاظ بها، ونُعلمكم عند الانتهاء.' }] },
    ],
  },
};

export const privacyChoicesPrelaunch: Legal = {
  en: {
    version: '1.0',
    status: 'approved',
    title: 'Privacy choices',
    summary: 'The choices you have about personal information on this website.',
    sections: [
      { id: 'display', heading: 'Language and display', blocks: [{ kind: 'p', text: 'Your choice of language and of light or dark display is kept in your browser. You can change it on any page, or clear it in your browser’s settings.' }] },
      { id: 'tracking', heading: 'No tracking to refuse', blocks: [{ kind: 'p', text: 'This website uses no analytics, advertising or tracking, so there is nothing to opt out of. When Cloudflare’s security features set their technical cookie, it serves only to protect the website from automated traffic; it is not used for tracking, and this website offers no setting for it.' }] },
      { id: 'requests', heading: 'Asking about your information', blocks: [{ kind: 'p', text: 'To ask what {displayName} holds about you, or to have it corrected or deleted, write to {privacyEmail}.' }] },
      { id: 'service', heading: 'Dukan ERP', blocks: [{ kind: 'p', text: 'Dukan ERP is not yet open. The choices it will offer will be described here before it opens.' }] },
      { id: 'contact', heading: 'Contact', blocks: [{ kind: 'p', text: 'Write to the privacy address below.' }] },
    ],
  },
  fr: {
    version: '1.0',
    status: 'approved',
    title: 'Choix de confidentialité',
    summary: 'Les choix dont vous disposez sur les informations personnelles de ce site.',
    sections: [
      { id: 'display', heading: 'Langue et affichage', blocks: [{ kind: 'p', text: 'Votre choix de langue et d’affichage clair ou sombre est conservé dans votre navigateur. Vous pouvez le changer sur chaque page, ou l’effacer dans les réglages de votre navigateur.' }] },
      { id: 'tracking', heading: 'Aucun pistage à refuser', blocks: [{ kind: 'p', text: 'Ce site n’utilise ni mesure d’audience, ni publicité, ni pistage : il n’y a donc rien à refuser. Lorsque les fonctions de sécurité de Cloudflare déposent leur cookie technique, il sert uniquement à protéger le site du trafic automatisé ; il n’est pas utilisé pour le pistage, et ce site ne propose aucun réglage à son sujet.' }] },
      { id: 'requests', heading: 'Vous renseigner sur vos informations', blocks: [{ kind: 'p', text: 'Pour savoir ce que {displayName} détient sur vous, ou le faire corriger ou supprimer, écrivez à {privacyEmail}.' }] },
      { id: 'service', heading: 'Dukan ERP', blocks: [{ kind: 'p', text: 'Dukan ERP n’est pas encore ouvert. Les choix qu’il proposera seront décrits ici avant son ouverture.' }] },
      { id: 'contact', heading: 'Contact', blocks: [{ kind: 'p', text: 'Écrivez à l’adresse de confidentialité ci-dessous.' }] },
    ],
  },
  ar: {
    version: '1.0',
    status: 'approved',
    title: 'خيارات الخصوصية',
    summary: 'الخيارات المتاحة لكم بشأن المعلومات الشخصية على هذا الموقع.',
    sections: [
      { id: 'display', heading: 'اللغة والعرض', blocks: [{ kind: 'p', text: 'يُحفظ اختياركم للغة والعرض الفاتح أو الداكن في متصفحكم. ويمكنكم تغييره من أي صفحة، أو مسحه من إعدادات المتصفح.' }] },
      { id: 'tracking', heading: 'لا تتبع لرفضه', blocks: [{ kind: 'p', text: 'لا يستخدم هذا الموقع أي قياس للزيارات أو إعلانات أو تتبع، فلا شيء يستدعي الرفض. وعندما تضع ميزات الأمان لدى Cloudflare ملفها التقني، فإنه يقتصر على حماية الموقع من الزيارات الآلية، ولا يُستخدم للتتبع، ولا يوفّر هذا الموقع أي إعداد بشأنه.' }] },
      { id: 'requests', heading: 'السؤال عن معلوماتكم', blocks: [{ kind: 'p', text: 'لمعرفة ما يحتفظ به {displayName} عنكم، أو لطلب تصحيحه أو حذفه، راسلوا {privacyEmail}.' }] },
      { id: 'service', heading: 'Dukan ERP', blocks: [{ kind: 'p', text: 'لم يُفتح Dukan ERP بعد. وستُوصف هنا الخيارات التي سيقدّمها قبل افتتاحه.' }] },
      { id: 'contact', heading: 'التواصل', blocks: [{ kind: 'p', text: 'راسلوا عنوان الخصوصية أدناه.' }] },
    ],
  },
};

export const legalNoticePrelaunch: Legal = {
  en: {
    version: '1.1',
    status: 'approved',
    title: 'Legal notice',
    summary: 'Who publishes this website, and how to reach them.',
    sections: [
      { id: 'entity', heading: 'Publisher', blocks: [{ kind: 'p', text: '{operatorStatus} This website is published under that name. The operator’s details are below.' }] },
      { id: 'responsible', heading: 'Responsible for publication', blocks: [{ kind: 'p', text: 'The person responsible for publication is {publicationDirector}.' }] },
      { id: 'product', heading: 'Dukan ERP', blocks: [{ kind: 'p', text: 'Dukan ERP is a product operated under the {displayName} name. It is being prepared for launch and is not yet open for public registration.' }] },
      { id: 'hosting', heading: 'Hosting', blocks: [{ kind: 'p', text: 'This website is hosted by Cloudflare, Inc., 101 Townsend Street, San Francisco, CA 94107, United States.' }] },
      { id: 'contact', heading: 'Contact', blocks: [{ kind: 'p', text: 'Write to the address that matches your question:' }] },
      { id: 'ip', heading: 'Copyright and trademarks', blocks: [{ kind: 'p', text: 'The texts, design and software of this website belong to the operator, unless a notice says otherwise. They may not be copied or reused without written permission.' }] },
    ],
  },
  fr: {
    version: '1.1',
    status: 'approved',
    title: 'Mentions légales',
    summary: 'Qui publie ce site, et comment le joindre.',
    sections: [
      { id: 'entity', heading: 'Éditeur', blocks: [{ kind: 'p', text: '{operatorStatus} Ce site est publié sous ce nom. Les informations sur l’exploitant figurent ci-dessous.' }] },
      { id: 'responsible', heading: 'Responsable de la publication', blocks: [{ kind: 'p', text: 'La personne responsable de la publication est {publicationDirector}.' }] },
      { id: 'product', heading: 'Dukan ERP', blocks: [{ kind: 'p', text: 'Dukan ERP est un produit exploité sous le nom {displayName}. Il est en préparation pour son lancement et n’est pas encore ouvert aux inscriptions.' }] },
      { id: 'hosting', heading: 'Hébergement', blocks: [{ kind: 'p', text: 'Ce site est hébergé par Cloudflare, Inc., 101 Townsend Street, San Francisco, CA 94107, États-Unis.' }] },
      { id: 'contact', heading: 'Contact', blocks: [{ kind: 'p', text: 'Écrivez à l’adresse qui correspond à votre question :' }] },
      { id: 'ip', heading: 'Droits d’auteur et marques', blocks: [{ kind: 'p', text: 'Les textes, la présentation et le logiciel de ce site appartiennent à l’exploitant, sauf mention contraire. Ils ne peuvent être copiés ou réutilisés sans autorisation écrite.' }] },
    ],
  },
  ar: {
    version: '1.1',
    status: 'approved',
    title: 'إشعار قانوني',
    summary: 'من ينشر هذا الموقع، وكيف يمكن التواصل معه.',
    sections: [
      { id: 'entity', heading: 'الناشر', blocks: [{ kind: 'p', text: '{operatorStatus} ويُنشر هذا الموقع بهذا الاسم. وبيانات المشغّل مذكورة أدناه.' }] },
      { id: 'responsible', heading: 'المسؤول عن النشر', blocks: [{ kind: 'p', text: 'المسؤول عن النشر: {publicationDirector}.' }] },
      { id: 'product', heading: 'Dukan ERP', blocks: [{ kind: 'p', text: 'Dukan ERP منتج يُشغَّل تحت اسم {displayName}. وهو قيد التحضير للإطلاق، والتسجيل فيه غير مفتوح للعموم بعد.' }] },
      { id: 'hosting', heading: 'الاستضافة', blocks: [{ kind: 'p', text: 'تستضيف هذا الموقعَ شركة \u2066Cloudflare, Inc., 101 Townsend Street, San Francisco, CA 94107\u2069، الولايات المتحدة.' }] },
      { id: 'contact', heading: 'التواصل', blocks: [{ kind: 'p', text: 'راسلوا العنوان الذي يناسب سؤالكم:' }] },
      { id: 'ip', heading: 'حقوق النشر والعلامات التجارية', blocks: [{ kind: 'p', text: 'نصوص هذا الموقع وتصميمه وبرمجياته ملك للمشغّل، ما لم يُذكر خلاف ذلك. ولا يجوز نسخها أو إعادة استخدامها دون إذن كتابي.' }] },
    ],
  },
};

export const securityPrelaunch: Legal = {
  en: {
    version: '1.0',
    status: 'approved',
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
      { id: 'next', heading: 'What happens next', blocks: [{ kind: 'p', text: '{displayName} reads every report sent to {securityEmail}, replies to the address it came from, and says when the problem is fixed. The same address is published in this website’s security.txt file. {displayName} does not offer payment or rewards for reports.' }] },
    ],
  },
  fr: {
    version: '1.0',
    status: 'approved',
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
      { id: 'next', heading: 'La suite', blocks: [{ kind: 'p', text: '{displayName} lit chaque signalement envoyé à {securityEmail}, répond à l’adresse d’où il vient et indique quand le problème est corrigé. La même adresse figure dans le fichier security.txt de ce site. {displayName} n’offre ni paiement ni récompense pour les signalements.' }] },
    ],
  },
  ar: {
    version: '1.0',
    status: 'approved',
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
      { id: 'next', heading: 'ماذا يحدث بعد ذلك', blocks: [{ kind: 'p', text: 'يقرأ {displayName} كل بلاغ يُرسل إلى {securityEmail}، ويرد على العنوان الذي جاء منه، ويُعلم صاحبه عند إصلاح المشكلة. والعنوان نفسه منشور في ملف security.txt لهذا الموقع. ولا يقدّم {displayName} أي مقابل أو مكافأة على البلاغات.' }] },
    ],
  },
};
