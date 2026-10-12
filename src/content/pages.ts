import type { Language } from '../i18n/languages';
import type { Document } from './types';

/**
 * The shorter public pages (docs/74 §4). About states only what TSX-MR is and does; the company-details block and
 * the contact addresses are rendered from the production inputs, so verified facts can be added without a redesign.
 */
type Docs = Record<Language, Document>;

export const about: Docs = {
  en: {
    title: 'About {displayName}',
    summary: '{displayName} develops digital business-management solutions in Mauritania. Dukan ERP is one of its products.',
    sections: [
      { id: 'who', heading: 'Who we are', blocks: [{ kind: 'p', text: '{displayName} develops digital business-management solutions in Mauritania. Its work starts from the daily reality of local businesses: stock that moves quickly, money that passes through cash and mobile accounts, and teams that share the work across several stores.' }] },
      { id: 'product', heading: 'What we build', blocks: [{ kind: 'p', text: 'Dukan ERP is one of our products. {displayName} develops and operates it: we build the application, run the service and support the businesses that use it.' }] },
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
    summary: '{displayName} développe des solutions numériques de gestion d’entreprise en Mauritanie. Dukan ERP est l’un de ses produits.',
    sections: [
      { id: 'who', heading: 'Qui nous sommes', blocks: [{ kind: 'p', text: '{displayName} développe des solutions numériques de gestion d’entreprise en Mauritanie. Son travail part de la réalité quotidienne des entreprises locales : un stock qui tourne vite, de l’argent qui passe par la caisse et par des comptes mobiles, et des équipes qui se partagent le travail entre plusieurs magasins.' }] },
      { id: 'product', heading: 'Ce que nous construisons', blocks: [{ kind: 'p', text: 'Dukan ERP est l’un de nos produits. {displayName} le développe et l’exploite : nous construisons l’application, faisons fonctionner le service et accompagnons les entreprises qui l’utilisent.' }] },
      {
        id: 'principles',
        heading: 'Notre manière de construire',
        blocks: [
          {
            kind: 'list',
            items: [
              'Chaque fonction doit rendre le travail quotidien plus rapide ou plus sûr, avec moins de saisie.',
              'Les entreprises décident qui peut voir leurs données ; le serveur l’applique.',
              'L’arabe, le français et l’anglais sont pris en charge dès le départ.',
            ],
          },
        ],
      },
      { id: 'details', heading: 'Informations sur la société', blocks: [{ kind: 'p', text: 'Les informations légales de {displayName} figurent ci-dessous.' }] },
    ],
  },
  ar: {
    title: 'عن {displayName}',
    summary: 'تطوّر {displayName} حلولًا رقمية لإدارة الأعمال في موريتانيا، وDukan ERP أحد منتجاتها.',
    sections: [
      { id: 'who', heading: 'من نحن', blocks: [{ kind: 'p', text: 'تطوّر {displayName} حلولًا رقمية لإدارة الأعمال في موريتانيا. وينطلق عملها من الواقع اليومي للشركات المحلية: مخزون يتحرك بسرعة، وأموال تمرّ عبر الصندوق والحسابات عبر الهاتف، وفرق تتقاسم العمل بين عدة متاجر.' }] },
      { id: 'product', heading: 'ماذا نبني', blocks: [{ kind: 'p', text: 'Dukan ERP أحد منتجاتنا. تطوّره {displayName} وتشغّله: نبني التطبيق، ونشغّل الخدمة، وندعم الشركات التي تستخدمه.' }] },
      {
        id: 'principles',
        heading: 'كيف نبني',
        blocks: [
          {
            kind: 'list',
            items: [
              'ينبغي لكل وظيفة أن تجعل العمل اليومي أسرع أو أكثر أمانًا، بكتابة أقل.',
              'تقرّر الشركات من يمكنه رؤية سجلاتها، ويطبّق الخادم ذلك.',
              'العربية والفرنسية والإنجليزية مدعومة منذ البداية.',
            ],
          },
        ],
      },
      { id: 'details', heading: 'بيانات الشركة', blocks: [{ kind: 'p', text: 'ترد أدناه البيانات المسجّلة لـ{displayName}.' }] },
    ],
  },
};

export const products: Docs = {
  en: {
    title: 'Products',
    summary: 'Software developed and operated by {displayName}.',
    sections: [{ id: 'dukan', heading: 'Dukan ERP', blocks: [{ kind: 'p', text: 'A business-management platform for retail and electronics shops and for money-services agents: stock, sales, money, teams and reports in one application.' }] }],
  },
  fr: {
    title: 'Produits',
    summary: 'Les logiciels développés et exploités par {displayName}.',
    sections: [{ id: 'dukan', heading: 'Dukan ERP', blocks: [{ kind: 'p', text: 'Une plateforme de gestion pour les commerces de détail et d’électronique et pour les agents de services monétaires : stock, ventes, argent, équipes et rapports dans une seule application.' }] }],
  },
  ar: {
    title: 'المنتجات',
    summary: 'البرمجيات التي تطوّرها {displayName} وتشغّلها.',
    sections: [{ id: 'dukan', heading: 'Dukan ERP', blocks: [{ kind: 'p', text: 'منصة لإدارة الأعمال موجّهة إلى متاجر التجزئة والإلكترونيات وإلى وكلاء الخدمات المالية: المخزون والمبيعات والأموال والفرق والتقارير في تطبيق واحد.' }] }],
  },
};

export const contact: Docs = {
  en: {
    title: 'Contact {displayName}',
    summary: 'How to reach {displayName} about Dukan ERP, a business account or this website.',
    sections: [
      { id: 'write', heading: 'Write to us', blocks: [{ kind: 'p', text: 'Choose the address that fits your question. Each one opens your email application with the address already filled in.' }] },
      {
        id: 'before',
        heading: 'Before you write',
        blocks: [
          {
            kind: 'list',
            items: [
              'For a problem with Dukan ERP, give the business name and the email address or number you sign in with.',
              'Never send a password, a verification code or a customer’s number by email.',
            ],
          },
        ],
      },
    ],
  },
  fr: {
    title: 'Contacter {displayName}',
    summary: 'Comment joindre {displayName} au sujet de Dukan ERP, d’un compte entreprise ou de ce site.',
    sections: [
      { id: 'write', heading: 'Nous écrire', blocks: [{ kind: 'p', text: 'Choisissez l’adresse qui correspond à votre question. Chacune ouvre votre messagerie avec l’adresse déjà remplie.' }] },
      {
        id: 'before',
        heading: 'Avant d’écrire',
        blocks: [
          {
            kind: 'list',
            items: [
              'Pour un problème avec Dukan ERP, indiquez le nom de l’entreprise et l’adresse e-mail ou le numéro avec lequel vous vous connectez.',
              'N’envoyez jamais par e-mail un mot de passe, un code de vérification ou le numéro d’un client.',
            ],
          },
        ],
      },
    ],
  },
  ar: {
    title: 'تواصل مع {displayName}',
    summary: 'كيف تتواصل مع {displayName} بشأن Dukan ERP أو حساب شركة أو هذا الموقع.',
    sections: [
      { id: 'write', heading: 'راسلنا', blocks: [{ kind: 'p', text: 'اختر العنوان المناسب لسؤالك. يفتح كل عنوان تطبيق البريد لديك مع ملء العنوان مسبقًا.' }] },
      {
        id: 'before',
        heading: 'قبل أن تكتب',
        blocks: [
          {
            kind: 'list',
            items: [
              'لمشكلة في Dukan ERP، اذكر اسم الشركة والبريد الإلكتروني أو الرقم الذي تسجّل الدخول به.',
              'لا ترسل أبدًا عبر البريد كلمة مرور أو رمز تحقق أو رقم أحد العملاء.',
            ],
          },
        ],
      },
    ],
  },
};

export const support: Docs = {
  en: {
    title: 'Dukan ERP support',
    summary: 'Answers to common questions about signing in, stores, staff, stock, sales, returns, subscriptions and account deletion.',
    sections: [
      { id: 'signin', heading: 'Signing in', blocks: [{ kind: 'p', text: 'Sign in with the email address or WhatsApp number of your account and your password. An employee whose sign-in no longer works should ask the business owner or a manager to check that their account is active. An owner who cannot sign in can write to support with the business name.' }] },
      { id: 'verification', heading: 'Verification codes', blocks: [{ kind: 'p', text: 'A verification code is sent to the contact being verified and expires after a few minutes. If it does not arrive, wait until the app or the page allows a new request. When no delivery channel is available, the app and this website say so, and nothing is changed.' }] },
      { id: 'stores', heading: 'Stores', blocks: [{ kind: 'p', text: 'The owner requests an additional store, or a different activity for a store, from the business account on this website. The change is activated once {displayName} has confirmed it.' }] },
      { id: 'staff', heading: 'Staff', blocks: [{ kind: 'p', text: 'Each store’s subscription includes staff seats, and more seats are requested from the business account. The owner invites employees from the app and chooses their permissions, store by store.' }] },
      { id: 'inventory', heading: 'Stock and products', blocks: [{ kind: 'p', text: 'Products are added in the app by scanning a barcode, typing, or importing a supplier file. Phones and other serialised devices are recorded by IMEI or serial number.' }] },
      { id: 'sales', heading: 'Sales and payments', blocks: [{ kind: 'p', text: 'Sales are recorded in the app, in cash or through the payment accounts the business configures. Financial records are never erased: a mistake is corrected by a new, recorded entry.' }] },
      { id: 'returns', heading: 'Returns and refunds', blocks: [{ kind: 'p', text: 'Returns and refunds are recorded in the app with their reason. Stock and money are adjusted together, and the day’s report shows them.' }] },
      { id: 'subscriptions', heading: 'Subscriptions', blocks: [{ kind: 'p', text: 'The owner sees the status, the period and every request by signing in to the business account on this website. The mobile app shows whether access is active and contains no purchases. Payments are confirmed by {displayName} against the payment’s reference.' }] },
      { id: 'deletion', heading: 'Deleting an account', blocks: [{ kind: 'p', text: 'An account is deleted in the app, from More, then Your account, then Delete account. The account deletion page explains what happens and what is kept.' }] },
      { id: 'contact', heading: 'Contact support', blocks: [{ kind: 'p', text: 'If your question is not answered here, write to the support address below. Give the business name and the contact you sign in with, never a password or a code.' }] },
    ],
  },
  fr: {
    title: 'Assistance Dukan ERP',
    summary: 'Réponses aux questions fréquentes sur la connexion, les magasins, le personnel, le stock, les ventes, les retours, les abonnements et la suppression de compte.',
    sections: [
      { id: 'signin', heading: 'Connexion', blocks: [{ kind: 'p', text: 'Connectez-vous avec l’adresse e-mail ou le numéro WhatsApp de votre compte et votre mot de passe. Un employé dont la connexion ne fonctionne plus doit demander au propriétaire ou à un responsable de vérifier que son compte est actif. Un propriétaire qui ne parvient pas à se connecter peut écrire à l’assistance en indiquant le nom de l’entreprise.' }] },
      { id: 'verification', heading: 'Codes de vérification', blocks: [{ kind: 'p', text: 'Un code de vérification est envoyé au contact à vérifier et expire au bout de quelques minutes. S’il n’arrive pas, attendez que l’application ou la page permette une nouvelle demande. Lorsqu’aucun canal d’envoi n’est disponible, l’application et ce site l’indiquent, et rien n’est modifié.' }] },
      { id: 'stores', heading: 'Magasins', blocks: [{ kind: 'p', text: 'Le propriétaire demande un magasin supplémentaire, ou une autre activité pour un magasin, depuis le compte de l’entreprise sur ce site. Le changement est activé une fois confirmé par {displayName}.' }] },
      { id: 'staff', heading: 'Personnel', blocks: [{ kind: 'p', text: 'L’abonnement de chaque magasin comprend des postes pour le personnel ; des postes supplémentaires se demandent depuis le compte de l’entreprise. Le propriétaire invite les employés depuis l’application et choisit leurs autorisations, magasin par magasin.' }] },
      { id: 'inventory', heading: 'Stock et produits', blocks: [{ kind: 'p', text: 'Les produits s’ajoutent dans l’application par le scan d’un code-barres, par saisie ou par l’import d’un fichier fournisseur. Les téléphones et autres appareils à numéro de série sont enregistrés par IMEI ou numéro de série.' }] },
      { id: 'sales', heading: 'Ventes et paiements', blocks: [{ kind: 'p', text: 'Les ventes s’enregistrent dans l’application, en espèces ou par les comptes de paiement configurés par l’entreprise. Les écritures financières ne sont jamais effacées : une erreur se corrige par une nouvelle écriture, enregistrée.' }] },
      { id: 'returns', heading: 'Retours et remboursements', blocks: [{ kind: 'p', text: 'Les retours et remboursements s’enregistrent dans l’application avec leur motif. Le stock et l’argent sont ajustés ensemble, et le rapport de la journée les affiche.' }] },
      { id: 'subscriptions', heading: 'Abonnements', blocks: [{ kind: 'p', text: 'Le propriétaire voit le statut, la période et chaque demande en se connectant au compte de l’entreprise sur ce site. L’application mobile indique si l’accès est actif et ne contient aucun achat. Les paiements sont confirmés par {displayName} à partir de la référence du paiement.' }] },
      { id: 'deletion', heading: 'Supprimer un compte', blocks: [{ kind: 'p', text: 'Un compte se supprime dans l’application, depuis Plus, puis Votre compte, puis Supprimer le compte. La page sur la suppression de compte explique ce qui se passe et ce qui est conservé.' }] },
      { id: 'contact', heading: 'Contacter l’assistance', blocks: [{ kind: 'p', text: 'Si votre question n’a pas de réponse ici, écrivez à l’adresse de l’assistance ci-dessous. Indiquez le nom de l’entreprise et le contact avec lequel vous vous connectez, jamais un mot de passe ou un code.' }] },
    ],
  },
  ar: {
    title: 'دعم Dukan ERP',
    summary: 'إجابات عن الأسئلة الشائعة حول تسجيل الدخول والمتاجر والموظفين والمخزون والمبيعات والمرتجعات والاشتراكات وحذف الحساب.',
    sections: [
      { id: 'signin', heading: 'تسجيل الدخول', blocks: [{ kind: 'p', text: 'سجّل الدخول بالبريد الإلكتروني أو رقم واتساب الخاص بحسابك وبكلمة المرور. وعلى الموظف الذي لم يعد يستطيع الدخول أن يطلب من مالك الشركة أو أحد المسؤولين التحقق من أن حسابه نشط. ويمكن للمالك الذي يتعذّر عليه الدخول أن يراسل الدعم ذاكرًا اسم الشركة.' }] },
      { id: 'verification', heading: 'رموز التحقق', blocks: [{ kind: 'p', text: 'يُرسَل رمز التحقق إلى جهة الاتصال المراد التحقق منها، وتنتهي صلاحيته بعد بضع دقائق. وإن لم يصل، فانتظر حتى يسمح التطبيق أو الصفحة بطلب جديد. وعندما لا تتوفر قناة إرسال، يذكر التطبيق وهذا الموقع ذلك، ولا يُغيَّر أي شيء.' }] },
      { id: 'stores', heading: 'المتاجر', blocks: [{ kind: 'p', text: 'يطلب المالك متجرًا إضافيًا، أو نشاطًا آخر لأحد المتاجر، من حساب الشركة على هذا الموقع. ويُفعَّل التغيير بعد أن تؤكّده {displayName}.' }] },
      { id: 'staff', heading: 'الموظفون', blocks: [{ kind: 'p', text: 'يشمل اشتراك كل متجر مقاعد للموظفين، وتُطلب المقاعد الإضافية من حساب الشركة. ويدعو المالك الموظفين من التطبيق ويختار صلاحياتهم متجرًا بمتجر.' }] },
      { id: 'inventory', heading: 'المخزون والمنتجات', blocks: [{ kind: 'p', text: 'تُضاف المنتجات في التطبيق بمسح الرمز الشريطي أو بالإدخال اليدوي أو باستيراد ملف المورّد. وتُسجَّل الهواتف وسائر الأجهزة ذات الأرقام التسلسلية برقم IMEI أو الرقم التسلسلي.' }] },
      { id: 'sales', heading: 'المبيعات والمدفوعات', blocks: [{ kind: 'p', text: 'تُسجَّل المبيعات في التطبيق نقدًا أو عبر حسابات الدفع التي تضبطها الشركة. ولا تُمحى السجلات المالية أبدًا: يُصحَّح الخطأ بقيد جديد مسجَّل.' }] },
      { id: 'returns', heading: 'المرتجعات والمبالغ المستردّة', blocks: [{ kind: 'p', text: 'تُسجَّل المرتجعات والمبالغ المستردّة في التطبيق مع سببها. ويُعدَّل المخزون والمال معًا، ويعرضها تقرير اليوم.' }] },
      { id: 'subscriptions', heading: 'الاشتراكات', blocks: [{ kind: 'p', text: 'يطّلع المالك على الحالة والفترة وكل طلب بتسجيل الدخول إلى حساب الشركة على هذا الموقع. ويُظهر تطبيق الهاتف ما إذا كان الوصول نشطًا، ولا يحتوي على أي عمليات شراء. وتؤكّد {displayName} المدفوعات بالاستناد إلى مرجع الدفع.' }] },
      { id: 'deletion', heading: 'حذف الحساب', blocks: [{ kind: 'p', text: 'يُحذف الحساب من التطبيق، عبر «المزيد» ثم «حسابك» ثم «حذف الحساب». وتشرح صفحة حذف الحساب ما يحدث وما يُحتفَظ به.' }] },
      { id: 'contact', heading: 'التواصل مع الدعم', blocks: [{ kind: 'p', text: 'إن لم تجد هنا جوابًا عن سؤالك، فراسل عنوان الدعم أدناه. واذكر اسم الشركة وجهة الاتصال التي تسجّل الدخول بها، ولا ترسل أبدًا كلمة مرور أو رمزًا.' }] },
    ],
  },
};

export const applicationStatus: Docs = {
  en: {
    title: 'Application status',
    summary: 'How to follow a business application after applying.',
    sections: [
      { id: 'where', heading: 'Where to see the status', blocks: [{ kind: 'p', text: 'After applying, sign in to the business account with the contact and the password chosen in the application. The account page shows whether the application is waiting for review, approved or refused, and what happens next.' }] },
      {
        id: 'expect',
        heading: 'What to expect',
        blocks: [
          {
            kind: 'list',
            items: [
              '{displayName} reviews each application. Nothing is activated before it is approved.',
              'Once it is approved, the subscription period and any requests appear in the business account.',
              'A question about an application can be sent to the support address on the contact page.',
            ],
          },
        ],
      },
    ],
  },
  fr: {
    title: 'Suivi de la demande',
    summary: 'Comment suivre une demande de compte entreprise après l’avoir déposée.',
    sections: [
      { id: 'where', heading: 'Où voir le statut', blocks: [{ kind: 'p', text: 'Après votre demande, connectez-vous au compte de l’entreprise avec le contact et le mot de passe choisis dans la demande. La page du compte indique si la demande est en attente d’examen, approuvée ou refusée, et la suite.' }] },
      {
        id: 'expect',
        heading: 'À quoi s’attendre',
        blocks: [
          {
            kind: 'list',
            items: [
              '{displayName} examine chaque demande. Rien n’est activé avant son approbation.',
              'Une fois la demande approuvée, la période d’abonnement et les éventuelles demandes apparaissent dans le compte de l’entreprise.',
              'Une question sur une demande peut être envoyée à l’adresse de l’assistance indiquée sur la page de contact.',
            ],
          },
        ],
      },
    ],
  },
  ar: {
    title: 'حالة الطلب',
    summary: 'كيف تتابع طلب حساب الشركة بعد تقديمه.',
    sections: [
      { id: 'where', heading: 'أين تظهر الحالة', blocks: [{ kind: 'p', text: 'بعد تقديم الطلب، سجّل الدخول إلى حساب الشركة بجهة الاتصال وكلمة المرور اللتين اخترتهما في الطلب. وتُظهر صفحة الحساب ما إذا كان الطلب بانتظار المراجعة أو مقبولًا أو مرفوضًا، وما الخطوة التالية.' }] },
      {
        id: 'expect',
        heading: 'ما الذي تتوقعه',
        blocks: [
          {
            kind: 'list',
            items: [
              'تراجع {displayName} كل طلب، ولا يُفعَّل أي شيء قبل الموافقة عليه.',
              'بعد الموافقة، تظهر فترة الاشتراك وأي طلبات في حساب الشركة.',
              'يمكن إرسال أي سؤال عن الطلب إلى عنوان الدعم المذكور في صفحة التواصل.',
            ],
          },
        ],
      },
    ],
  },
};

export const login: Docs = {
  en: {
    title: 'Sign in',
    summary: 'Sign in to a Dukan ERP business account.',
    sections: [
      { id: 'owners', heading: 'Business owners', blocks: [{ kind: 'p', text: 'The business account on this website shows the application or subscription status, the stores and seats, and the requests in progress.' }] },
      { id: 'staff', heading: 'Employees and managers', blocks: [{ kind: 'p', text: 'Employees and managers sign in to the Dukan ERP mobile app with the details their business gave them. Their access is managed by the business owner.' }] },
    ],
  },
  fr: {
    title: 'Connexion',
    summary: 'Se connecter à un compte entreprise Dukan ERP.',
    sections: [
      { id: 'owners', heading: 'Propriétaires d’entreprise', blocks: [{ kind: 'p', text: 'Le compte de l’entreprise sur ce site affiche le statut de la demande ou de l’abonnement, les magasins et les postes, et les demandes en cours.' }] },
      { id: 'staff', heading: 'Employés et responsables', blocks: [{ kind: 'p', text: 'Les employés et responsables se connectent à l’application mobile Dukan ERP avec les informations fournies par leur entreprise. Leur accès est géré par le propriétaire de l’entreprise.' }] },
    ],
  },
  ar: {
    title: 'تسجيل الدخول',
    summary: 'سجّل الدخول إلى حساب شركة على Dukan ERP.',
    sections: [
      { id: 'owners', heading: 'مالكو الشركات', blocks: [{ kind: 'p', text: 'يعرض حساب الشركة على هذا الموقع حالة الطلب أو الاشتراك، والمتاجر والمقاعد، والطلبات الجارية.' }] },
      { id: 'staff', heading: 'الموظفون والمسؤولون', blocks: [{ kind: 'p', text: 'يسجّل الموظفون والمسؤولون الدخول إلى تطبيق Dukan ERP على الهاتف بالبيانات التي زوّدتهم بها شركتهم، ويدير مالك الشركة صلاحيات وصولهم.' }] },
    ],
  },
};
