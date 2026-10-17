import type { Language } from '../i18n/languages';

/**
 * The TSX-MR home page (docs/74 §4; redesigned 2026-10-17 on the owner's brief). Every capability and every trust
 * sentence is something the code does (audited 2026-10-12, docs/74 §6) — no figures, clients, awards or availability
 * claims. The product visual's words are here too (`visual`); its numbers are ordinary demo values kept in the
 * component, never a customer's data.
 *
 * Order matters where a list carries its own illustration: `capabilities.items` are stock, sales, debts, cash, team,
 * reports; `previews.items` are sell, stock, close (`pages/public/Home.tsx` draws them by position).
 */
export interface Card {
  title: string;
  body: string;
}

export interface ActivityBrief {
  title: string;
  lead: string;
  points: string[];
}

export interface HomeContent {
  hero: { title: string; lead: string; primary: string; secondary: string };
  proofs: Card[];
  problems: { title: string; lead: string; items: Card[] };
  capabilities: { title: string; lead: string; items: Card[] };
  activities: { title: string; lead: string; retail: ActivityBrief; agent: ActivityBrief };
  how: { title: string; lead: string; steps: Card[] };
  previews: { title: string; lead: string; items: Card[] };
  local: { title: string; body: string; points: string[] };
  trust: { title: string; lead: string; items: string[]; privacy: string; security: string; support: string };
  cta: { title: string; body: string; apply: string; signIn: string; contact: string };
  visual: {
    store: string;
    today: string;
    salesWord: string;
    returnsWord: string;
    counted: string;
    paidCash: string;
    mobileMoney: string;
    owed: string;
    days: string;
    tabs: string[];
    drawerTitle: string;
    drawerSub: string;
    imeiTitle: string;
    imeiSub: string;
    expected: string;
    countedLabel: string;
    noDifference: string;
    inStock: string;
    sold: string;
    roles: string[];
    closing: string;
    demo: string;
  };
}

export const home: Record<Language, HomeContent> = {
  en: {
    hero: {
      title: 'Stock, sales, money and team — all in one place.',
      lead: 'Dukan ERP replaces the notebooks and scattered records of electronics and retail shops and of money-service agents, for teams that work in Arabic, French or English.',
      primary: 'Discover Dukan ERP',
      secondary: 'Talk to {displayName}',
    },
    proofs: [
      { title: 'Every IMEI recorded once', body: 'A phone cannot be received twice or sold twice.' },
      { title: 'The day closed against what was expected', body: 'Drawer and accounts counted; any difference said in words.' },
      { title: 'Permissions per person and per store', body: 'Each employee sees and does only what their role allows.' },
    ],
    problems: {
      title: 'What Dukan ERP replaces',
      lead: 'The daily tools that cost shops time and money.',
      items: [
        { title: 'Notebooks', body: 'Stock, credit and cash on paper are slow to check and easy to lose.' },
        { title: 'Scattered messages', body: 'Orders, prices and reminders spread across chats that nobody can search later.' },
        { title: 'Uncertain stock', body: 'Nobody knows for sure what is on the shelf, what was sold and what came back.' },
        { title: 'Unclear money positions', body: 'Cash, mobile accounts and customer debts that never quite add up at closing time.' },
        { title: 'Uncontrolled access', body: 'Employees who can see or change anything, with no record of who did what.' },
      ],
    },
    capabilities: {
      title: 'Everything the shop runs on',
      lead: 'Six parts of one application, built for the counter and the back room.',
      items: [
        { title: 'Stock and IMEI', body: 'Products, quantities and prices; every phone recorded once by its IMEI or serial number.' },
        { title: 'Sales and payments', body: 'Cash or the accounts the business configures, with partial payments and the receipt.' },
        { title: 'Debts and returns', body: 'Balances owed by customers, and returns with their reason — stock and money corrected together.' },
        { title: 'Cash and configured accounts', body: 'The drawer and each account counted at the end of the day, any difference shown in words.' },
        { title: 'Team and permissions', body: 'Owner, managers and employees, each with a role, store by store.' },
        { title: 'Reports and closing', body: 'The daily closing, monthly results and exports as PDF and spreadsheet files.' },
      ],
    },
    activities: {
      title: 'Two activities, one application',
      lead: 'A business runs one of them or both, store by store.',
      retail: {
        title: 'Retail and electronics',
        lead: 'Phones, accessories, appliances and other goods.',
        points: ['Stock received by scanning or typing', 'Serialised devices followed from reception to sale or return', 'Sales, returns, expenses and the daily closing'],
      },
      agent: {
        title: 'Money services',
        lead: 'Cash exchanged for mobile-money credit on behalf of customers.',
        points: ['Exchanges recorded in both directions', 'The commission typed per exchange and kept as the agent’s own revenue', 'Floats and activity followed provider by provider'],
      },
    },
    how: {
      title: 'How it works',
      lead: 'Three steps, from the first conversation to a closed day.',
      steps: [
        { title: 'Talk to {displayName}', body: 'Tell us about your shop or agency, its stores and its team.' },
        { title: 'Set up the business in the app', body: 'Stores, employees and their roles, payment accounts and the first stock.' },
        { title: 'Run the day', body: 'Sell, receive, record exchanges, count the drawer and close against what was expected.' },
      ],
    },
    previews: {
      title: 'The screens the team works on',
      lead: 'Illustrative screens with ordinary demo values — nothing here is a real customer’s data.',
      items: [
        { title: 'A sale in a few taps', body: 'Scan or pick the product, choose how the customer pays, and the receipt is ready.' },
        { title: 'Stock you can trust', body: 'What is on the shelf, by model and by IMEI, with what came in and what went out.' },
        { title: 'Closing the day', body: 'Expected against counted, for the drawer and for each account, in words.' },
      ],
    },
    local: {
      title: 'Built in Nouakchott, in three languages',
      body: 'Dukan ERP and this website are built for Arabic, French and English. Arabic is laid out from right to left throughout, while numbers, amounts and identifiers keep their reading order.',
      points: ['Support in the language of the business', 'Works on the phones the team already has', 'Made for the way shops and agencies work here'],
    },
    trust: {
      title: 'Trust, privacy and support',
      lead: 'These protections are part of how Dukan ERP is built.',
      items: [
        'Passwords and PINs are stored only as one-way hashes, never in readable form.',
        'Changes to business records are written to an audit trail that the application itself cannot edit or delete.',
        'Permissions are granted per person and per store, and the server checks them on every request.',
        'Signed-in sessions can be ended, and devices removed from an account, at any time.',
      ],
      privacy: 'Read the privacy policy',
      security: 'Security page',
      support: 'Support',
    },
    cta: {
      title: 'Bring your business onto Dukan ERP',
      body: 'Businesses apply for an account online. A new business can start one 7-day free trial from its business account; paid access afterwards is arranged with the {displayName} team.',
      apply: 'Apply for a business account',
      signIn: 'Sign in',
      contact: 'Contact {displayName}',
    },
    visual: {
      store: 'Store',
      today: 'Sales today',
      salesWord: 'sales',
      returnsWord: 'returns',
      counted: 'Drawer counted',
      paidCash: 'paid in cash',
      mobileMoney: 'mobile money',
      owed: 'balance owed',
      days: 'days',
      tabs: ['Today', 'Sell', 'Inventory', 'Money', 'Team'],
      drawerTitle: 'Drawer counted',
      drawerSub: 'Expected and counted match',
      imeiTitle: 'IMEI recorded once',
      imeiSub: 'Received once · cannot be sold twice',
      expected: 'Expected in drawer',
      countedLabel: 'Counted',
      noDifference: 'No difference',
      inStock: 'In stock',
      sold: 'Sold',
      roles: ['Owner', 'Manager', 'Employee'],
      closing: 'Daily closing',
      demo: 'Demo values',
    },
  },
  fr: {
    hero: {
      title: 'Stock, ventes, argent et équipe — réunis au même endroit.',
      lead: 'Dukan ERP remplace les cahiers et les notes éparpillées des boutiques d’électronique et de détail et des agents de services monétaires, pour des équipes qui travaillent en arabe, en français ou en anglais.',
      primary: 'Découvrir Dukan ERP',
      secondary: 'Parler à {displayName}',
    },
    proofs: [
      { title: 'Chaque IMEI enregistré une seule fois', body: 'Un téléphone ne peut être ni reçu ni vendu deux fois.' },
      { title: 'La journée clôturée par rapport à l’attendu', body: 'Caisse et comptes comptés ; tout écart dit en toutes lettres.' },
      { title: 'Des droits par personne et par magasin', body: 'Chaque employé ne voit et ne fait que ce que son rôle permet.' },
    ],
    problems: {
      title: 'Ce que Dukan ERP remplace',
      lead: 'Les outils du quotidien qui coûtent du temps et de l’argent aux commerces.',
      items: [
        { title: 'Les cahiers', body: 'Un stock, des crédits et une caisse sur papier sont longs à vérifier et faciles à perdre.' },
        { title: 'Les messages éparpillés', body: 'Commandes, prix et rappels dispersés dans des discussions que personne ne retrouve plus tard.' },
        { title: 'Un stock incertain', body: 'Personne ne sait avec certitude ce qui est en rayon, ce qui a été vendu et ce qui est revenu.' },
        { title: 'Des positions d’argent floues', body: 'Espèces, comptes mobiles et dettes des clients qui ne tombent jamais tout à fait juste à la clôture.' },
        { title: 'Des accès sans contrôle', body: 'Des employés qui peuvent tout voir ou tout modifier, sans trace de qui a fait quoi.' },
      ],
    },
    capabilities: {
      title: 'Tout ce qui fait tourner la boutique',
      lead: 'Six parties d’une seule application, pensées pour le comptoir et l’arrière-boutique.',
      items: [
        { title: 'Stock et IMEI', body: 'Produits, quantités et prix ; chaque téléphone enregistré une seule fois par son IMEI ou son numéro de série.' },
        { title: 'Ventes et paiements', body: 'En espèces ou par les comptes que l’entreprise configure, avec les paiements partiels et le reçu.' },
        { title: 'Dettes et retours', body: 'Les soldes dus par les clients, et les retours avec leur motif — stock et argent corrigés ensemble.' },
        { title: 'Caisse et comptes configurés', body: 'La caisse et chaque compte comptés en fin de journée, tout écart affiché en toutes lettres.' },
        { title: 'Équipe et droits', body: 'Propriétaire, gérants et employés, chacun avec un rôle, magasin par magasin.' },
        { title: 'Rapports et clôture', body: 'La clôture du jour, les résultats du mois et des exports en PDF et en tableur.' },
      ],
    },
    activities: {
      title: 'Deux activités, une seule application',
      lead: 'Une entreprise exerce l’une ou les deux, magasin par magasin.',
      retail: {
        title: 'Détail et électronique',
        lead: 'Téléphones, accessoires, électroménager et autres articles.',
        points: ['Stock réceptionné par scan ou par saisie', 'Appareils sérialisés suivis de la réception à la vente ou au retour', 'Ventes, retours, dépenses et clôture du jour'],
      },
      agent: {
        title: 'Services monétaires',
        lead: 'Des espèces échangées contre du crédit de paiement mobile pour le compte des clients.',
        points: ['Échanges enregistrés dans les deux sens', 'La commission saisie à chaque échange et conservée comme revenu propre de l’agent', 'Soldes et activité suivis opérateur par opérateur'],
      },
    },
    how: {
      title: 'Comment ça marche',
      lead: 'Trois étapes, de la première conversation à une journée clôturée.',
      steps: [
        { title: 'Parler à {displayName}', body: 'Parlez-nous de votre boutique ou de votre agence, de ses magasins et de son équipe.' },
        { title: 'Configurer l’entreprise dans l’application', body: 'Magasins, employés et leurs rôles, comptes de paiement et premier stock.' },
        { title: 'Faire tourner la journée', body: 'Vendre, réceptionner, enregistrer les échanges, compter la caisse et clôturer par rapport à l’attendu.' },
      ],
    },
    previews: {
      title: 'Les écrans sur lesquels l’équipe travaille',
      lead: 'Des écrans d’illustration avec des valeurs de démonstration ordinaires — rien ici n’est la donnée d’un vrai client.',
      items: [
        { title: 'Une vente en quelques gestes', body: 'Scannez ou choisissez le produit, indiquez comment le client paie, et le reçu est prêt.' },
        { title: 'Un stock fiable', body: 'Ce qui est en rayon, par modèle et par IMEI, avec ce qui est entré et ce qui est sorti.' },
        { title: 'La clôture du jour', body: 'L’attendu face au compté, pour la caisse et pour chaque compte, en toutes lettres.' },
      ],
    },
    local: {
      title: 'Conçu à Nouakchott, en trois langues',
      body: 'Dukan ERP et ce site sont conçus pour l’arabe, le français et l’anglais. L’arabe se lit de droite à gauche partout, tandis que les nombres, les montants et les identifiants gardent leur sens de lecture.',
      points: ['Une assistance dans la langue de l’entreprise', 'Fonctionne sur les téléphones que l’équipe possède déjà', 'Pensé pour la manière dont les boutiques et les agences travaillent ici'],
    },
    trust: {
      title: 'Confiance, confidentialité et assistance',
      lead: 'Ces protections font partie de la manière dont Dukan ERP est construit.',
      items: [
        'Les mots de passe et codes PIN ne sont conservés que sous forme d’empreintes à sens unique, jamais lisibles.',
        'Les modifications des données de l’entreprise sont inscrites dans un journal d’audit que l’application elle-même ne peut ni modifier ni supprimer.',
        'Les autorisations sont accordées par personne et par magasin, et le serveur les vérifie à chaque requête.',
        'Les sessions ouvertes peuvent être fermées, et les appareils retirés d’un compte, à tout moment.',
      ],
      privacy: 'Lire la politique de confidentialité',
      security: 'Page sécurité',
      support: 'Assistance',
    },
    cta: {
      title: 'Passez votre entreprise sur Dukan ERP',
      body: 'Les entreprises demandent un compte en ligne. Une nouvelle entreprise peut démarrer un essai gratuit de 7 jours depuis son compte entreprise ; l’accès payant qui suit s’organise avec l’équipe de {displayName}.',
      apply: 'Demander un compte entreprise',
      signIn: 'Se connecter',
      contact: 'Contacter {displayName}',
    },
    visual: {
      store: 'Magasin',
      today: 'Ventes du jour',
      salesWord: 'ventes',
      returnsWord: 'retours',
      counted: 'Caisse comptée',
      paidCash: 'payé en espèces',
      mobileMoney: 'paiement mobile',
      owed: 'solde dû',
      days: 'jours',
      tabs: ['Aujourd’hui', 'Vendre', 'Stock', 'Argent', 'Équipe'],
      drawerTitle: 'Caisse comptée',
      drawerSub: 'L’attendu et le compté concordent',
      imeiTitle: 'IMEI enregistré une fois',
      imeiSub: 'Reçu une fois · ne peut être vendu deux fois',
      expected: 'Attendu en caisse',
      countedLabel: 'Compté',
      noDifference: 'Aucun écart',
      inStock: 'En stock',
      sold: 'Vendu',
      roles: ['Propriétaire', 'Gérant', 'Employé'],
      closing: 'Clôture du jour',
      demo: 'Valeurs de démonstration',
    },
  },
  ar: {
    hero: {
      title: 'المخزون والمبيعات والأموال والفريق — كلّها في مكان واحد.',
      lead: 'يحلّ Dukan ERP محلّ الدفاتر والسجلات المتفرقة في متاجر الإلكترونيات والتجزئة ولدى وكلاء الخدمات المالية، لفرق تعمل بالعربية أو الفرنسية أو الإنجليزية.',
      primary: 'اكتشف Dukan ERP',
      secondary: 'تحدّث مع {displayName}',
    },
    proofs: [
      { title: 'كل IMEI يُسجَّل مرة واحدة', body: 'لا يمكن استلام الهاتف مرتين ولا بيعه مرتين.' },
      { title: 'يُقفل اليوم مقارنةً بما كان متوقعًا', body: 'يُعدّ الصندوق والحسابات، ويُذكر أي فرق بالكلمات.' },
      { title: 'صلاحيات لكل شخص ولكل متجر', body: 'لا يرى كل موظف ولا يفعل إلا ما يسمح به دوره.' },
    ],
    problems: {
      title: 'ما الذي يحلّ Dukan ERP محلّه',
      lead: 'الأدوات اليومية التي تكلّف المتاجر وقتًا ومالًا.',
      items: [
        { title: 'الدفاتر', body: 'المخزون والديون والصندوق على الورق بطيئة المراجعة وسهلة الضياع.' },
        { title: 'الرسائل المتفرقة', body: 'طلبات وأسعار وتذكيرات موزعة على محادثات لا يستطيع أحد البحث فيها لاحقًا.' },
        { title: 'مخزون غير مؤكد', body: 'لا أحد يعرف على وجه اليقين ما على الرف، وما بيع، وما أُعيد.' },
        { title: 'أوضاع مالية غامضة', body: 'نقد وحسابات عبر الهاتف وديون عملاء لا تتطابق تمامًا عند الإقفال.' },
        { title: 'وصول بلا ضوابط', body: 'موظفون يستطيعون رؤية كل شيء أو تغييره، دون سجل لمن فعل ماذا.' },
      ],
    },
    capabilities: {
      title: 'كل ما يدير المتجر',
      lead: 'ستة أجزاء في تطبيق واحد، صُممت للمنضدة وللمخزن.',
      items: [
        { title: 'المخزون وIMEI', body: 'المنتجات والكميات والأسعار؛ ويُسجَّل كل هاتف مرة واحدة برقم IMEI أو الرقم التسلسلي.' },
        { title: 'المبيعات والمدفوعات', body: 'نقدًا أو عبر الحسابات التي تضبطها الشركة، مع الدفعات الجزئية والإيصال.' },
        { title: 'الديون والمرتجعات', body: 'الأرصدة المستحقة على العملاء، والمرتجعات مع سببها — ويُصحَّح المخزون والمال معًا.' },
        { title: 'الصندوق والحسابات المضبوطة', body: 'يُعدّ الصندوق وكل حساب في نهاية اليوم، ويُعرض أي فرق بالكلمات.' },
        { title: 'الفريق والصلاحيات', body: 'المالك والمديرون والموظفون، لكل منهم دور، متجرًا بمتجر.' },
        { title: 'التقارير والإقفال', body: 'إقفال اليوم ونتائج الشهر والتصدير بصيغة PDF وجداول البيانات.' },
      ],
    },
    activities: {
      title: 'نشاطان وتطبيق واحد',
      lead: 'تزاول الشركة أحدهما أو كليهما، متجرًا بمتجر.',
      retail: {
        title: 'التجزئة والإلكترونيات',
        lead: 'الهواتف والإكسسوارات والأجهزة المنزلية وسائر السلع.',
        points: ['استلام المخزون بالمسح أو بالإدخال اليدوي', 'متابعة الأجهزة ذات الأرقام التسلسلية من الاستلام حتى البيع أو الإرجاع', 'المبيعات والمرتجعات والمصروفات وإقفال اليوم'],
      },
      agent: {
        title: 'الخدمات المالية',
        lead: 'نقد يُبادَل برصيد الدفع عبر الهاتف لصالح العملاء.',
        points: ['تسجيل العمليات في الاتجاهين', 'تُدخَل العمولة في كل عملية وتبقى دخلًا خاصًا بالوكيل', 'متابعة الأرصدة والنشاط لكل مزوّد على حدة'],
      },
    },
    how: {
      title: 'كيف يعمل',
      lead: 'ثلاث خطوات، من أول محادثة إلى يوم مُقفل.',
      steps: [
        { title: 'تحدّث مع {displayName}', body: 'حدّثنا عن متجرك أو وكالتك، وعن فروعها وفريقها.' },
        { title: 'جهّز الشركة في التطبيق', body: 'المتاجر والموظفون وأدوارهم وحسابات الدفع والمخزون الأول.' },
        { title: 'أدِر اليوم', body: 'بِع واستلم وسجّل العمليات وعُدّ الصندوق وأقفل مقارنةً بما كان متوقعًا.' },
      ],
    },
    previews: {
      title: 'الشاشات التي يعمل عليها الفريق',
      lead: 'شاشات توضيحية بقيم تجريبية عادية — لا شيء هنا بيانات عميل حقيقي.',
      items: [
        { title: 'عملية بيع بلمسات قليلة', body: 'امسح المنتج أو اختره، وحدّد كيف يدفع العميل، فيكون الإيصال جاهزًا.' },
        { title: 'مخزون يمكن الوثوق به', body: 'ما على الرف، حسب الطراز وحسب IMEI، مع ما دخل وما خرج.' },
        { title: 'إقفال اليوم', body: 'المتوقع مقابل المعدود، للصندوق ولكل حساب، بالكلمات.' },
      ],
    },
    local: {
      title: 'صُنع في نواكشوط، بثلاث لغات',
      body: 'صُمّم Dukan ERP وهذا الموقع للعربية والفرنسية والإنجليزية. تُعرض العربية من اليمين إلى اليسار في كل مكان، بينما تحتفظ الأرقام والمبالغ والمعرّفات باتجاه قراءتها.',
      points: ['دعم بلغة الشركة', 'يعمل على الهواتف التي يملكها الفريق أصلًا', 'مصمَّم لطريقة عمل المتاجر والوكالات هنا'],
    },
    trust: {
      title: 'الثقة والخصوصية والدعم',
      lead: 'هذه الحمايات جزء من طريقة بناء Dukan ERP.',
      items: [
        'لا تُحفظ كلمات المرور والرموز السرية إلا في صورة بصمات أحادية الاتجاه، ولا تُحفظ أبدًا بصيغة مقروءة.',
        'تُدوَّن التعديلات على سجلات الشركة في سجل تدقيق لا يستطيع التطبيق نفسه تعديله أو حذفه.',
        'تُمنح الصلاحيات لكل شخص ولكل متجر، ويتحقق منها الخادم في كل طلب.',
        'يمكن إنهاء الجلسات المفتوحة وإزالة الأجهزة من الحساب في أي وقت.',
      ],
      privacy: 'اقرأ سياسة الخصوصية',
      security: 'صفحة الأمان',
      support: 'الدعم',
    },
    cta: {
      title: 'انقل أعمال شركتك إلى Dukan ERP',
      body: 'تتقدّم الشركات بطلب حساب عبر الإنترنت، ويمكن لكل شركة جديدة بدء فترة تجريبية مجانية لمدة 7 أيام من حساب شركتها، ثم يُرتَّب الوصول المدفوع مع فريق {displayName}.',
      apply: 'اطلب حساب شركة',
      signIn: 'تسجيل الدخول',
      contact: 'تواصل مع {displayName}',
    },
    visual: {
      store: 'المتجر',
      today: 'مبيعات اليوم',
      salesWord: 'عمليات بيع',
      returnsWord: 'مرتجعات',
      counted: 'الصندوق معدود',
      paidCash: 'نقدًا',
      mobileMoney: 'دفع عبر الهاتف',
      owed: 'رصيد مستحق',
      days: 'أيام',
      tabs: ['اليوم', 'بيع', 'المخزون', 'المال', 'الفريق'],
      drawerTitle: 'الصندوق معدود',
      drawerSub: 'المتوقع والمعدود متطابقان',
      imeiTitle: 'IMEI مسجَّل مرة واحدة',
      imeiSub: 'استُلم مرة واحدة · لا يُباع مرتين',
      expected: 'المتوقع في الصندوق',
      countedLabel: 'المعدود',
      noDifference: 'لا فرق',
      inStock: 'في المخزون',
      sold: 'مُباع',
      roles: ['المالك', 'المدير', 'الموظف'],
      closing: 'إقفال اليوم',
      demo: 'قيم تجريبية',
    },
  },
};
