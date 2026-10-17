import type { Language } from '../i18n/languages';
import type { Document } from './types';

/**
 * The shorter public pages (docs/74 §4). About states only what TSX-MR is and does; the operator-details block and
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
      { id: 'details', heading: 'Who operates {displayName}', blocks: [{ kind: 'p', text: '{operatorStatus} The operator’s details are listed below.' }] },
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
      { id: 'details', heading: 'Qui exploite {displayName}', blocks: [{ kind: 'p', text: '{operatorStatus} Les informations sur l’exploitant figurent ci-dessous.' }] },
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
      { id: 'details', heading: 'من يشغّل {displayName}', blocks: [{ kind: 'p', text: '{operatorStatus} وبيانات المشغّل مذكورة أدناه.' }] },
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
      { id: 'access', heading: 'Access to the app', blocks: [{ kind: 'p', text: 'The app tells everyone signed in whether the business is active, in its 72-hour grace period, read-only, waiting to start, suspended or refused, and what still works. In read-only, records can be read and reports shared, but nothing new is recorded. The Owner sees why, and what is waiting, by signing in to the business account on this website.' }] },
      { id: 'trial', heading: 'The free trial', blocks: [{ kind: 'p', text: 'The free trial is claimed by the Owner on this website, signed in to the business account, once every contact given at registration is verified. The app only shows its status and its end; nothing in the app starts, extends or pays for it.' }] },
      { id: 'devices', heading: 'A lost phone', blocks: [{ kind: 'p', text: 'Sign in on another phone and sign the lost one out under More → Devices. If you cannot sign in anywhere, ask your Owner, or write to support with the business name.' }] },
      { id: 'imports', heading: 'Importing a stock file', blocks: [{ kind: 'p', text: 'Under Stock → Import stock, choose a spreadsheet file (.xlsx or .csv). The app shows what it found before anything is saved, and rows it cannot read are listed with their reason. A very large file is refused: split it into smaller files.' }] },
      { id: 'scanner', heading: 'Scanning IMEI numbers and barcodes', blocks: [{ kind: 'p', text: 'The camera reads IMEI labels and product barcodes. If the camera is not allowed, or a label cannot be read, type the IMEI (15 digits) or the serial number instead: the same checks apply.' }] },
      { id: 'reports', heading: 'Reports and PDF files', blocks: [{ kind: 'p', text: 'The daily closing and the monthly results can be made into a PDF file in the app, then previewed and shared with your phone’s share button. Reports can also be exported as spreadsheet files. Nothing is sent automatically.' }] },
      { id: 'security', heading: 'Reporting a security problem', blocks: [{ kind: 'p', text: 'If you think you have found a weakness in Dukan ERP, do not test it on real data: see the security page and write to the security address.' }] },
      { id: 'status', heading: 'Service problems', blocks: [{ kind: 'p', text: 'There is no public status page. When the app cannot reach the service it says so, keeps the actions it can hold on the phone, and sends them when the connection returns.' }] },
      { id: 'contact', heading: 'Contact support', blocks: [{ kind: 'p', text: 'If your question is not answered here, write to the support address below. Give the business name and the contact you sign in with, never a password or a code.' }, { kind: 'p', text: 'Support answers {supportHours}, in {supportLanguages}, and replies {supportResponseTime}.' }] },
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
      { id: 'access', heading: 'Accès à l’application', blocks: [{ kind: 'p', text: 'L’application indique à chaque personne connectée si l’entreprise est active, dans son délai de grâce de 72 heures, en lecture seule, en attente de démarrage, suspendue ou refusée, et ce qui fonctionne encore. En lecture seule, les registres restent lisibles et les rapports partageables, mais rien de nouveau n’est enregistré. Le propriétaire voit pourquoi, et ce qui est en attente, en se connectant au compte entreprise sur ce site.' }] },
      { id: 'trial', heading: 'L’essai gratuit', blocks: [{ kind: 'p', text: 'L’essai gratuit est réclamé par le propriétaire sur ce site, connecté au compte entreprise, une fois chaque coordonnée donnée à l’inscription vérifiée. L’application n’affiche que son état et sa fin ; rien dans l’application ne le démarre, ne le prolonge ni ne le paie.' }] },
      { id: 'devices', heading: 'Un téléphone perdu', blocks: [{ kind: 'p', text: 'Connectez-vous sur un autre téléphone et déconnectez celui qui est perdu dans Plus → Appareils. Si vous ne pouvez vous connecter nulle part, adressez-vous à votre propriétaire ou écrivez à l’assistance avec le nom de l’entreprise.' }] },
      { id: 'imports', heading: 'Importer un fichier de stock', blocks: [{ kind: 'p', text: 'Dans Stock → Importer le stock, choisissez un fichier tableur (.xlsx ou .csv). L’application montre ce qu’elle a trouvé avant d’enregistrer quoi que ce soit, et les lignes qu’elle ne peut pas lire sont listées avec leur motif. Un fichier très volumineux est refusé : découpez-le en fichiers plus petits.' }] },
      { id: 'scanner', heading: 'Scanner les numéros IMEI et les codes-barres', blocks: [{ kind: 'p', text: 'L’appareil photo lit les étiquettes IMEI et les codes-barres des produits. Si l’appareil photo n’est pas autorisé, ou qu’une étiquette est illisible, saisissez l’IMEI (15 chiffres) ou le numéro de série : les mêmes vérifications s’appliquent.' }] },
      { id: 'reports', heading: 'Rapports et fichiers PDF', blocks: [{ kind: 'p', text: 'La clôture du jour et les résultats du mois peuvent être transformés en fichier PDF dans l’application, puis prévisualisés et partagés avec le bouton de partage du téléphone. Les rapports peuvent aussi être exportés en fichiers tableur. Rien n’est envoyé automatiquement.' }] },
      { id: 'security', heading: 'Signaler un problème de sécurité', blocks: [{ kind: 'p', text: 'Si vous pensez avoir trouvé une faiblesse dans Dukan ERP, ne la testez pas sur des données réelles : consultez la page sécurité et écrivez à l’adresse de sécurité.' }] },
      { id: 'status', heading: 'Problèmes de service', blocks: [{ kind: 'p', text: 'Il n’existe pas de page publique d’état du service. Lorsque l’application ne peut pas joindre le service, elle le dit, garde sur le téléphone les actions qu’elle peut conserver et les envoie au retour de la connexion.' }] },
      { id: 'contact', heading: 'Contacter l’assistance', blocks: [{ kind: 'p', text: 'Si votre question n’a pas de réponse ici, écrivez à l’adresse de l’assistance ci-dessous. Indiquez le nom de l’entreprise et le contact avec lequel vous vous connectez, jamais un mot de passe ou un code.' }, { kind: 'p', text: 'L’assistance répond {supportHours}, en {supportLanguages}, et répond {supportResponseTime}.' }] },
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
      { id: 'access', heading: 'الوصول إلى التطبيق', blocks: [{ kind: 'p', text: 'يُخبر التطبيق كل شخص مسجّل الدخول ما إذا كانت المؤسسة نشطة، أو في فترة السماح البالغة 72 ساعة، أو للقراءة فقط، أو بانتظار البدء، أو معلّقة، أو مرفوضة، وما الذي لا يزال يعمل. وفي وضع القراءة فقط تبقى السجلات مقروءة والتقارير قابلة للمشاركة، لكن لا يُسجَّل أي جديد. ويرى المالك السبب وما ينتظر بتسجيل الدخول إلى حساب المؤسسة على هذا الموقع.' }] },
      { id: 'trial', heading: 'التجربة المجانية', blocks: [{ kind: 'p', text: 'يطالب المالك بالتجربة المجانية على هذا الموقع، وهو مسجّل الدخول إلى حساب المؤسسة، بعد التحقق من كل وسيلة اتصال قُدّمت عند التسجيل. ولا يعرض التطبيق إلا حالتها ونهايتها؛ ولا شيء في التطبيق يبدؤها أو يمدّدها أو يدفع ثمنها.' }] },
      { id: 'devices', heading: 'هاتف مفقود', blocks: [{ kind: 'p', text: 'سجّل الدخول على هاتف آخر وسجّل خروج الهاتف المفقود من المزيد ← الأجهزة. وإن تعذّر عليك تسجيل الدخول في أي مكان، فتوجّه إلى المالك أو راسل الدعم مع ذكر اسم المؤسسة.' }] },
      { id: 'imports', heading: 'استيراد ملف مخزون', blocks: [{ kind: 'p', text: 'من المخزون ← استيراد المخزون، اختر ملف جدول بيانات (.xlsx أو .csv). ويعرض التطبيق ما وجده قبل حفظ أي شيء، ويسرد الأسطر التي تعذّرت قراءتها مع السبب. ويُرفض الملف الكبير جدًا: قسّمه إلى ملفات أصغر.' }] },
      { id: 'scanner', heading: 'مسح أرقام IMEI والرموز الشريطية', blocks: [{ kind: 'p', text: 'تقرأ الكاميرا ملصقات IMEI والرموز الشريطية للمنتجات. وإن لم يُسمح باستخدام الكاميرا، أو تعذّرت قراءة ملصق، فاكتب رقم IMEI (15 رقمًا) أو الرقم التسلسلي بدلًا من ذلك: وتُطبَّق التحققات نفسها.' }] },
      { id: 'reports', heading: 'التقارير وملفات PDF', blocks: [{ kind: 'p', text: 'يمكن تحويل إغلاق اليوم ونتائج الشهر إلى ملف PDF في التطبيق، ثم معاينته ومشاركته بزر المشاركة في الهاتف. ويمكن أيضًا تصدير التقارير كملفات جداول بيانات. ولا يُرسل أي شيء تلقائيًا.' }] },
      { id: 'security', heading: 'الإبلاغ عن مشكلة أمنية', blocks: [{ kind: 'p', text: 'إن كنت تظن أنك وجدت ثغرة في Dukan ERP فلا تختبرها على بيانات حقيقية: راجع صفحة الأمان وراسل عنوان الأمان.' }] },
      { id: 'status', heading: 'مشكلات الخدمة', blocks: [{ kind: 'p', text: 'لا توجد صفحة عامة لحالة الخدمة. وعندما يتعذّر على التطبيق الوصول إلى الخدمة يُخبرك بذلك، ويحتفظ على الهاتف بالعمليات التي يمكنه الاحتفاظ بها، ويرسلها عند عودة الاتصال.' }] },
      { id: 'contact', heading: 'التواصل مع الدعم', blocks: [{ kind: 'p', text: 'إن لم تجد هنا جوابًا عن سؤالك، فراسل عنوان الدعم أدناه. واذكر اسم الشركة وجهة الاتصال التي تسجّل الدخول بها، ولا ترسل أبدًا كلمة مرور أو رمزًا.' }, { kind: 'p', text: 'يجيب الدعم {supportHours}، باللغات التالية: {supportLanguages}، ويرد {supportResponseTime}.' }] },
    ],
  },
};

export const applicationStatus: Docs = {
  en: {
    title: 'Application status',
    summary: 'How to follow a business application after applying.',
    sections: [
      { id: 'where', heading: 'Where to see the status', blocks: [{ kind: 'p', text: 'After applying, sign in to the business account with the contact and the password chosen in the application. The account page shows the business’s status — its free trial not started, running or ended, approved or refused — and what happens next.' }] },
      {
        id: 'expect',
        heading: 'What to expect',
        blocks: [
          {
            kind: 'list',
            items: [
              'A business that registered itself can start its one 7-day free trial from the business account; it starts only when the owner confirms it. Paid access starts once {displayName} has approved it.',
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
      { id: 'where', heading: 'Où voir le statut', blocks: [{ kind: 'p', text: 'Après votre demande, connectez-vous au compte de l’entreprise avec le contact et le mot de passe choisis dans la demande. La page du compte indique le statut de l’entreprise — essai gratuit non commencé, en cours ou terminé, approuvée ou refusée — et la suite.' }] },
      {
        id: 'expect',
        heading: 'À quoi s’attendre',
        blocks: [
          {
            kind: 'list',
            items: [
              'Une entreprise qui s’est inscrite elle-même peut démarrer son essai gratuit unique de 7 jours depuis le compte de l’entreprise ; il ne commence qu’à la confirmation du propriétaire. L’accès payant commence une fois approuvé par {displayName}.',
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
      { id: 'where', heading: 'أين تظهر الحالة', blocks: [{ kind: 'p', text: 'بعد تقديم الطلب، سجّل الدخول إلى حساب الشركة بجهة الاتصال وكلمة المرور اللتين اخترتهما في الطلب. وتُظهر صفحة الحساب حالة الشركة — فترتها التجريبية المجانية لم تبدأ أو جارية أو منتهية، أو مقبولة أو مرفوضة — وما الخطوة التالية.' }] },
      {
        id: 'expect',
        heading: 'ما الذي تتوقعه',
        blocks: [
          {
            kind: 'list',
            items: [
              'يمكن للشركة التي سجّلت نفسها بدء فترتها التجريبية المجانية الوحيدة لمدة 7 أيام من حساب الشركة، ولا تبدأ إلا عندما يؤكّدها المالك. ويبدأ الوصول المدفوع بعد موافقة {displayName}.',
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
