import type { Language } from '../i18n/languages';

/**
 * The TSX-MR home page (docs/74 §4). Every capability and every security sentence is something the code does
 * (audited 2026-10-12, docs/74 §6) — no figures, clients, awards or availability claims.
 */
export interface Card {
  title: string;
  body: string;
}

export interface HomeContent {
  hero: { title: string; lead: string; primary: string; secondary: string };
  product: { kicker: string; title: string; lead: string; cta: string };
  problems: { title: string; items: Card[] };
  capabilities: { title: string; lead: string; items: Card[] };
  security: { title: string; lead: string; items: string[]; link: string };
  languages: { title: string; body: string; access: string };
  cta: { title: string; body: string; apply: string; signIn: string; contact: string };
}

export const home: Record<Language, HomeContent> = {
  en: {
    hero: {
      title: 'Practical digital tools for businesses',
      lead: '{displayName} develops software that helps businesses run their daily operations. Its first product, Dukan ERP, brings stock, sales, money and teams into one application.',
      primary: 'Discover Dukan ERP',
      secondary: 'Contact {displayName}',
    },
    product: {
      kicker: 'Our product',
      title: 'Dukan ERP',
      lead: 'A business-management platform for retail and electronics shops and for money-services agents — or for a business that does both.',
      cta: 'Learn about Dukan ERP',
    },
    problems: {
      title: 'Built for the problems businesses actually have',
      items: [
        { title: 'Notebooks and memory', body: 'Stock, credit and cash kept on paper are slow to check and easy to lose. Dukan ERP keeps one record that the whole team works from.' },
        { title: 'Money that does not add up', body: 'Cash and account movements are recorded as they happen, so each day can be counted and closed against what the application expected.' },
        { title: 'Devices that are hard to trace', body: 'Phones and other serialised devices are followed by IMEI or serial number, from the moment they are received until they are sold or returned.' },
        { title: 'Teams and several stores', body: 'Each person sees and does only what their role allows, store by store, and changes are kept in an audit trail.' },
      ],
    },
    capabilities: {
      title: 'What Dukan ERP does',
      lead: 'The features below are available today. Each business uses the activities its subscription includes.',
      items: [
        { title: 'Stock and products', body: 'Product models with their specifications, quantities and prices. Stock is received by scanning, typing or importing a supplier file.' },
        { title: 'IMEI and serial tracking', body: 'Each phone or serialised device is recorded once by its IMEI or serial number, so the same device cannot be sold twice.' },
        { title: 'Sales and customer payments', body: 'Sales paid in cash or through the payment accounts the business configures, including partial payments and balances owed.' },
        { title: 'Cash and account reconciliation', body: 'The drawer and each configured account are counted at the end of the day; any difference is shown in words, not hidden.' },
        { title: 'Returns and refunds', body: 'Returns and refunds are recorded with their reason, and stock and money are corrected together.' },
        { title: 'Expenses and results', body: 'Expenses with an optional receipt photo, and the results of the day and of the month.' },
        { title: 'Multiple stores', body: 'Several stores under one business, each with its own stock, cash and team.' },
        { title: 'Team access and permissions', body: 'Employees and managers are invited by the owner, who chooses what each person may see and do, store by store.' },
        { title: 'Store-to-store operations', body: 'Stock moved between the business’s own stores and trade with connected stores, recorded on both sides.' },
        { title: 'Money-services agent activity', body: 'Where the activity is enabled, cash-for-credit exchanges with mobile-money providers, with their commissions and floats.' },
        { title: 'Daily and monthly reports', body: 'The daily closing, monthly summaries, and exports as PDF and spreadsheet files.' },
      ],
    },
    security: {
      title: 'Security and privacy, by design',
      lead: 'These protections are part of how Dukan ERP is built.',
      items: [
        'Passwords and PINs are stored only as one-way hashes, never in readable form.',
        'Changes to business records are written to an audit trail that the application itself cannot edit or delete.',
        'Permissions are granted per person and per store, and the server checks them on every request.',
        'The administration area has its own separate sign-in and asks for the administrator’s password again before every decision.',
        'Customer numbers of money-services exchanges are masked in lists; only people with the permission can see them in full.',
        'Signed-in sessions can be ended, and devices removed from an account, at any time.',
      ],
      link: 'Read the privacy policy',
    },
    languages: {
      title: 'Arabic, French and English',
      body: 'Dukan ERP and this website are available in Arabic, French and English. Arabic is laid out from right to left throughout, while numbers, amounts and identifiers keep their reading order.',
      access: 'This website is built to work with a keyboard and with screen readers, at larger text sizes and on small phone screens.',
    },
    cta: {
      title: 'Bring your business onto Dukan ERP',
      body: 'Businesses apply for an account online. A new business can start one 7-day free trial from its business account; paid access afterwards is arranged with the {displayName} team.',
      apply: 'Apply for a business account',
      signIn: 'Sign in',
      contact: 'Contact {displayName}',
    },
  },
  fr: {
    hero: {
      title: 'Des outils numériques pratiques pour les entreprises',
      lead: '{displayName} développe des logiciels qui aident les entreprises à gérer leur activité au quotidien. Son premier produit, Dukan ERP, réunit le stock, les ventes, l’argent et les équipes dans une seule application.',
      primary: 'Découvrir Dukan ERP',
      secondary: 'Contacter {displayName}',
    },
    product: {
      kicker: 'Notre produit',
      title: 'Dukan ERP',
      lead: 'Une plateforme de gestion pour les commerces de détail et d’électronique et pour les agents de services monétaires — ou pour une entreprise qui fait les deux.',
      cta: 'En savoir plus sur Dukan ERP',
    },
    problems: {
      title: 'Conçu pour les problèmes réels des entreprises',
      items: [
        { title: 'Cahiers et mémoire', body: 'Un stock, des crédits et une caisse tenus sur papier sont longs à vérifier et faciles à perdre. Dukan ERP tient un seul registre sur lequel toute l’équipe travaille.' },
        { title: 'Des comptes qui ne tombent pas juste', body: 'Les mouvements de caisse et de comptes sont enregistrés au moment où ils ont lieu, pour que chaque journée soit comptée et clôturée par rapport à ce que l’application attendait.' },
        { title: 'Des appareils difficiles à suivre', body: 'Les téléphones et autres appareils à numéro de série sont suivis par IMEI ou numéro de série, de leur réception jusqu’à leur vente ou leur retour.' },
        { title: 'Des équipes et plusieurs magasins', body: 'Chacun ne voit et ne fait que ce que son rôle permet, magasin par magasin, et les modifications sont conservées dans un journal d’audit.' },
      ],
    },
    capabilities: {
      title: 'Ce que fait Dukan ERP',
      lead: 'Les fonctions ci-dessous sont disponibles aujourd’hui. Chaque entreprise utilise les activités incluses dans son abonnement.',
      items: [
        { title: 'Stock et produits', body: 'Des modèles de produits avec leurs caractéristiques, quantités et prix. Le stock est réceptionné par scan, par saisie ou par import d’un fichier fournisseur.' },
        { title: 'Suivi des IMEI et numéros de série', body: 'Chaque téléphone ou appareil à numéro de série est enregistré une seule fois par son IMEI ou son numéro de série : le même appareil ne peut pas être vendu deux fois.' },
        { title: 'Ventes et paiements des clients', body: 'Des ventes payées en espèces ou par les comptes de paiement que l’entreprise configure, y compris les paiements partiels et les soldes dus.' },
        { title: 'Rapprochement de la caisse et des comptes', body: 'La caisse et chaque compte configuré sont comptés en fin de journée ; tout écart est affiché en toutes lettres, jamais masqué.' },
        { title: 'Retours et remboursements', body: 'Les retours et remboursements sont enregistrés avec leur motif, et le stock et l’argent sont corrigés ensemble.' },
        { title: 'Dépenses et résultats', body: 'Des dépenses avec une photo de reçu facultative, et les résultats de la journée et du mois.' },
        { title: 'Plusieurs magasins', body: 'Plusieurs magasins dans une même entreprise, chacun avec son stock, sa caisse et son équipe.' },
        { title: 'Accès de l’équipe et autorisations', body: 'Les employés et responsables sont invités par le propriétaire, qui choisit ce que chacun peut voir et faire, magasin par magasin.' },
        { title: 'Opérations entre magasins', body: 'Du stock déplacé entre les magasins de l’entreprise et des échanges avec des magasins connectés, enregistrés des deux côtés.' },
        { title: 'Activité d’agent de services monétaires', body: 'Lorsque l’activité est activée, des échanges d’espèces contre du crédit avec des opérateurs de paiement mobile, avec leurs commissions et leurs soldes.' },
        { title: 'Rapports quotidiens et mensuels', body: 'La clôture quotidienne, les synthèses mensuelles et des exports en PDF et en tableur.' },
      ],
    },
    security: {
      title: 'Sécurité et confidentialité, dès la conception',
      lead: 'Ces protections font partie de la manière dont Dukan ERP est construit.',
      items: [
        'Les mots de passe et codes PIN ne sont conservés que sous forme d’empreintes à sens unique, jamais lisibles.',
        'Les modifications des données de l’entreprise sont inscrites dans un journal d’audit que l’application elle-même ne peut ni modifier ni supprimer.',
        'Les autorisations sont accordées par personne et par magasin, et le serveur les vérifie à chaque requête.',
        'L’espace d’administration a sa propre connexion, distincte, et redemande le mot de passe de l’administrateur avant chaque décision.',
        'Les numéros des clients des échanges de services monétaires sont masqués dans les listes ; seules les personnes autorisées les voient en entier.',
        'Les sessions ouvertes peuvent être fermées, et les appareils retirés d’un compte, à tout moment.',
      ],
      link: 'Lire la politique de confidentialité',
    },
    languages: {
      title: 'Arabe, français et anglais',
      body: 'Dukan ERP et ce site sont disponibles en arabe, en français et en anglais. L’arabe s’affiche de droite à gauche partout, tandis que les nombres, les montants et les identifiants gardent leur sens de lecture.',
      access: 'Ce site est conçu pour fonctionner au clavier et avec les lecteurs d’écran, avec un texte agrandi et sur les petits écrans de téléphone.',
    },
    cta: {
      title: 'Passez votre entreprise sur Dukan ERP',
      body: 'Les entreprises demandent un compte en ligne. Une nouvelle entreprise peut démarrer un essai gratuit de 7 jours depuis son compte entreprise ; l’accès payant qui suit s’organise avec l’équipe de {displayName}.',
      apply: 'Demander un compte entreprise',
      signIn: 'Se connecter',
      contact: 'Contacter {displayName}',
    },
  },
  ar: {
    hero: {
      title: 'أدوات رقمية عملية للشركات',
      lead: 'تطوّر {displayName} برمجيات تساعد الشركات على إدارة أعمالها اليومية. ويجمع منتجها الأول، Dukan ERP، المخزون والمبيعات والأموال والفرق في تطبيق واحد.',
      primary: 'اكتشف Dukan ERP',
      secondary: 'تواصل مع {displayName}',
    },
    product: {
      kicker: 'منتجنا',
      title: 'Dukan ERP',
      lead: 'منصة لإدارة الأعمال موجّهة إلى متاجر التجزئة والإلكترونيات وإلى وكلاء الخدمات المالية — أو إلى الشركة التي تجمع بين النشاطين.',
      cta: 'تعرّف على Dukan ERP',
    },
    problems: {
      title: 'مصمَّم لحلّ المشكلات الحقيقية التي تواجهها الشركات',
      items: [
        { title: 'الدفاتر والذاكرة', body: 'المخزون والديون والصندوق المدوَّنة على الورق بطيئة المراجعة وسهلة الضياع. يحتفظ Dukan ERP بسجلّ واحد يعمل عليه الفريق كله.' },
        { title: 'حسابات لا تتطابق', body: 'تُسجَّل حركات الصندوق والحسابات لحظة حدوثها، فيُعدّ كل يوم ويُغلق مقارنةً بما كان التطبيق يتوقّعه.' },
        { title: 'أجهزة يصعب تتبّعها', body: 'تُتابَع الهواتف وسائر الأجهزة ذات الأرقام التسلسلية برقم IMEI أو الرقم التسلسلي، منذ استلامها حتى بيعها أو إرجاعها.' },
        { title: 'فرق ومتاجر متعددة', body: 'لا يرى كل شخص ولا يفعل إلا ما يسمح به دوره، متجرًا بمتجر، وتُحفظ التعديلات في سجل تدقيق.' },
      ],
    },
    capabilities: {
      title: 'ماذا يفعل Dukan ERP',
      lead: 'الوظائف التالية متاحة اليوم. وتستخدم كل شركة الأنشطة المشمولة في اشتراكها.',
      items: [
        { title: 'المخزون والمنتجات', body: 'طُرز منتجات بمواصفاتها وكمياتها وأسعارها. ويُستلَم المخزون بالمسح أو بالإدخال اليدوي أو باستيراد ملف المورّد.' },
        { title: 'تتبّع IMEI والأرقام التسلسلية', body: 'يُسجَّل كل هاتف أو جهاز ذي رقم تسلسلي مرة واحدة برقم IMEI أو رقمه التسلسلي، فلا يمكن بيع الجهاز نفسه مرتين.' },
        { title: 'المبيعات ومدفوعات العملاء', body: 'مبيعات تُدفع نقدًا أو عبر حسابات الدفع التي تضبطها الشركة، بما في ذلك الدفعات الجزئية والأرصدة المستحقة.' },
        { title: 'مطابقة الصندوق والحسابات', body: 'يُعدّ الصندوق وكل حساب مضبوط في نهاية اليوم، ويُعرض أي فرق بالكلمات دون إخفائه.' },
        { title: 'المرتجعات والمبالغ المستردّة', body: 'تُسجَّل المرتجعات والمبالغ المستردّة مع سببها، ويُصحَّح المخزون والمال معًا.' },
        { title: 'المصروفات والنتائج', body: 'مصروفات مع صورة إيصال اختيارية، ونتائج اليوم والشهر.' },
        { title: 'متاجر متعددة', body: 'عدة متاجر ضمن شركة واحدة، لكل منها مخزونه وصندوقه وفريقه.' },
        { title: 'صلاحيات الفريق', body: 'يدعو المالك الموظفين والمسؤولين، ويختار ما يمكن لكل شخص أن يراه ويفعله، متجرًا بمتجر.' },
        { title: 'العمليات بين المتاجر', body: 'نقل المخزون بين متاجر الشركة نفسها والتعامل مع متاجر متصلة، مع تسجيل ذلك لدى الطرفين.' },
        { title: 'نشاط وكيل الخدمات المالية', body: 'عند تفعيل النشاط، عمليات تبادل النقد مقابل الرصيد مع مزوّدي الدفع عبر الهاتف، مع عمولاتها وأرصدتها.' },
        { title: 'تقارير يومية وشهرية', body: 'الإغلاق اليومي والملخّصات الشهرية، والتصدير بصيغة PDF وجداول البيانات.' },
      ],
    },
    security: {
      title: 'الأمان والخصوصية منذ التصميم',
      lead: 'هذه الحمايات جزء من طريقة بناء Dukan ERP.',
      items: [
        'لا تُحفظ كلمات المرور والرموز السرية إلا في صورة بصمات أحادية الاتجاه، ولا تُحفظ أبدًا بصيغة مقروءة.',
        'تُدوَّن التعديلات على سجلات الشركة في سجل تدقيق لا يستطيع التطبيق نفسه تعديله أو حذفه.',
        'تُمنح الصلاحيات لكل شخص ولكل متجر، ويتحقق منها الخادم في كل طلب.',
        'لمساحة الإدارة تسجيل دخول مستقل خاص بها، وتطلب كلمة مرور المسؤول مجددًا قبل كل قرار.',
        'تُخفى أرقام العملاء في عمليات الخدمات المالية داخل القوائم، ولا يراها كاملة إلا من يملك الصلاحية.',
        'يمكن إنهاء الجلسات المفتوحة وإزالة الأجهزة من الحساب في أي وقت.',
      ],
      link: 'اقرأ سياسة الخصوصية',
    },
    languages: {
      title: 'العربية والفرنسية والإنجليزية',
      body: 'يتوفر Dukan ERP وهذا الموقع باللغات العربية والفرنسية والإنجليزية. وتُعرض العربية من اليمين إلى اليسار في كل مكان، مع احتفاظ الأرقام والمبالغ والمعرّفات باتجاه قراءتها.',
      access: 'صُمّم هذا الموقع ليعمل بلوحة المفاتيح ومع قارئات الشاشة، وبأحجام نص أكبر، وعلى شاشات الهواتف الصغيرة.',
    },
    cta: {
      title: 'انقل أعمال شركتك إلى Dukan ERP',
      body: 'تتقدّم الشركات بطلب حساب عبر الإنترنت، ويمكن لكل شركة جديدة بدء فترة تجريبية مجانية لمدة 7 أيام من حساب شركتها، ثم يُرتَّب الوصول المدفوع مع فريق {displayName}.',
      apply: 'اطلب حساب شركة',
      signIn: 'تسجيل الدخول',
      contact: 'تواصل مع {displayName}',
    },
  },
};
