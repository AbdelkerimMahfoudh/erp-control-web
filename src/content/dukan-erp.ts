import type { Language } from '../i18n/languages';

/**
 * The Dukan ERP product page (docs/74 §4). The two activities as the code implements them (D154–D157, D164). The
 * commission of an exchange is typed by the employee for every exchange and paid by the customer — there is no rate,
 * and it never touches the provider credit (D164 supersedes the configured rate of docs/73 §4.2). No provider is named:
 * Dukan ERP records what the team enters and is connected to none.
 */
export interface ActivityCard {
  title: string;
  lead: string;
  items: string[];
}

export interface DukanErpContent {
  title: string;
  summary: string;
  intro: string;
  activitiesTitle: string;
  activitiesLead: string;
  retail: ActivityCard;
  agent: ActivityCard;
  either: string;
  providers: { title: string; body: string };
  start: { title: string; steps: string[] };
  app: { title: string; body: string; noStore: string };
  subscription: { title: string; body: string };
}

export const dukanErp: Record<Language, DukanErpContent> = {
  en: {
    title: 'Dukan ERP',
    summary: 'Dukan ERP is a business-management platform developed and operated by {displayName}, for retail and electronics shops and for money-services agents.',
    intro: 'Dukan ERP replaces the notebook, the calculator and the end-of-day guesswork with one application the whole team shares. It is used on the mobile app by the business’s owner and staff; the business account and its subscription are managed on this website.',
    activitiesTitle: 'Two activities, one platform',
    activitiesLead: 'Dukan ERP currently supports two business activities. Each store of a business runs one of them or both, as its approved subscription allows.',
    retail: {
      title: 'Retail & Electronics',
      lead: 'For shops that sell phones, electronics, accessories and other goods.',
      items: [
        'Inventory and product models, with specifications, quantities and prices',
        'IMEI and serial-number tracking for every serialised device',
        'Receiving stock by scanning or typing, and importing supplier files',
        'Sales, with the receipt',
        'Payment channels: cash and the payment accounts the business configures',
        'Cash and account positions, counted and closed every day',
        'Returns and refunds',
        'Expenses',
        'Daily, monthly and yearly reporting',
        'Staff and store permissions',
      ],
    },
    agent: {
      title: 'Money Services Agent',
      lead: 'For agents who exchange cash for mobile-money credit on behalf of their customers.',
      items: [
        'Recording exchanges in both directions: cash received for provider credit sent, and provider credit received for cash paid out',
        'The commission is paid by the customer and typed by the employee for every exchange — there is no fixed rate',
        'The commission is the business’s own revenue: the provider neither pays nor checks it, and it never changes the provider credit',
        'Before confirming, the employee sees the principal, the commission, the cash received or handed over, and the credit sent or received',
        'The employee who recorded each exchange is taken from their own sign-in, never chosen by hand',
        'Activity, floats and commissions followed provider by provider',
        'History and reports by day, week, month and year',
        'Customer numbers masked in lists and visible in full only with the permission',
      ],
    },
    either: 'A business may use either activity or both, store by store, subject to its approved subscription.',
    providers: {
      title: 'About mobile-money providers',
      body: 'Dukan ERP records the exchanges that the agent’s team enters. It is not connected to any mobile-money provider and does not check a provider’s balance. No provider has approved, integrated with or endorsed Dukan ERP.',
    },
    start: {
      title: 'How a business starts',
      steps: [
        'The owner applies on this website with the business details and its first store.',
        'The contact details are verified. The owner can then start the business’s one 7-day free trial from the business account on this website; it starts only when the owner confirms it, and no payment is required.',
        'During the trial, and once paid access is arranged with {displayName}, the owner and the team sign in to the mobile app.',
        'More stores, staff seats or activities are requested from the business account and activated once confirmed.',
      ],
    },
    app: {
      title: 'The mobile app',
      body: 'Dukan ERP is used on phones by the business’s own team, in Arabic, French or English.',
      noStore: 'Links to the app stores will appear here once the app is published.',
    },
    subscription: {
      title: 'Subscription',
      body: 'Subscriptions are arranged between the business and {displayName} and managed on this website. The mobile app contains no purchases. The prices below come from the service itself.',
    },
  },
  fr: {
    title: 'Dukan ERP',
    summary: 'Dukan ERP est une plateforme de gestion développée et exploitée par {displayName}, pour les commerces de détail et d’électronique et pour les agents de services monétaires.',
    intro: 'Dukan ERP remplace le cahier, la calculatrice et les approximations de fin de journée par une seule application que toute l’équipe partage. Le propriétaire et le personnel de l’entreprise l’utilisent sur l’application mobile ; le compte de l’entreprise et son abonnement se gèrent sur ce site.',
    activitiesTitle: 'Deux activités, une seule plateforme',
    activitiesLead: 'Dukan ERP prend actuellement en charge deux activités. Chaque magasin d’une entreprise exerce l’une, l’autre ou les deux, selon ce que permet son abonnement approuvé.',
    retail: {
      title: 'Commerce de détail et électronique',
      lead: 'Pour les magasins qui vendent des téléphones, de l’électronique, des accessoires et d’autres articles.',
      items: [
        'Inventaire et modèles de produits, avec caractéristiques, quantités et prix',
        'Suivi par IMEI et numéro de série de chaque appareil concerné',
        'Réception du stock par scan ou par saisie, et import de fichiers fournisseurs',
        'Ventes, avec leur reçu',
        'Moyens de paiement : espèces et comptes de paiement configurés par l’entreprise',
        'Positions de caisse et de comptes, comptées et clôturées chaque jour',
        'Retours et remboursements',
        'Dépenses',
        'Rapports quotidiens, mensuels et annuels',
        'Autorisations du personnel et par magasin',
      ],
    },
    agent: {
      title: 'Agent de services monétaires',
      lead: 'Pour les agents qui échangent des espèces contre du crédit de paiement mobile pour le compte de leurs clients.',
      items: [
        'Enregistrement des échanges dans les deux sens : espèces reçues contre crédit envoyé, et crédit reçu contre espèces versées',
        'La commission est payée par le client et saisie par l’employé pour chaque échange — il n’existe pas de taux fixe',
        'La commission est un revenu de l’entreprise : l’opérateur ne la verse ni ne la vérifie, et elle ne modifie jamais le crédit de l’opérateur',
        'Avant de confirmer, l’employé voit le montant principal, la commission, les espèces reçues ou remises, et le crédit envoyé ou reçu',
        'L’employé qui enregistre chaque échange est repris de sa propre connexion, jamais choisi à la main',
        'Activité, soldes et commissions suivis opérateur par opérateur',
        'Historique et rapports par jour, semaine, mois et année',
        'Numéros des clients masqués dans les listes et visibles en entier seulement avec l’autorisation',
      ],
    },
    either: 'Une entreprise peut utiliser l’une ou l’autre activité, ou les deux, magasin par magasin, selon son abonnement approuvé.',
    providers: {
      title: 'À propos des opérateurs de paiement mobile',
      body: 'Dukan ERP enregistre les échanges que saisit l’équipe de l’agent. Il n’est relié à aucun opérateur de paiement mobile et ne vérifie pas le solde d’un opérateur. Aucun opérateur n’a approuvé ni recommandé Dukan ERP, et aucun n’y est intégré.',
    },
    start: {
      title: 'Comment une entreprise démarre',
      steps: [
        'Le propriétaire fait sa demande sur ce site, avec les informations de l’entreprise et de son premier magasin.',
        'Les coordonnées sont vérifiées. Le propriétaire peut alors démarrer l’essai gratuit unique de 7 jours de l’entreprise depuis le compte entreprise sur ce site ; il ne commence qu’à la confirmation du propriétaire, et aucun paiement n’est demandé.',
        'Pendant l’essai, puis une fois l’accès payant convenu avec {displayName}, le propriétaire et l’équipe se connectent à l’application mobile.',
        'Des magasins, des postes ou des activités supplémentaires se demandent depuis le compte de l’entreprise et sont activés après confirmation.',
      ],
    },
    app: {
      title: 'L’application mobile',
      body: 'Dukan ERP s’utilise sur téléphone par l’équipe de l’entreprise, en arabe, en français ou en anglais.',
      noStore: 'Les liens vers les boutiques d’applications apparaîtront ici une fois l’application publiée.',
    },
    subscription: {
      title: 'Abonnement',
      body: 'Les abonnements sont convenus entre l’entreprise et {displayName} et gérés sur ce site. L’application mobile ne contient aucun achat. Les prix ci-dessous proviennent du service lui-même.',
    },
  },
  ar: {
    title: 'Dukan ERP',
    summary: 'Dukan ERP منصة لإدارة الأعمال تطوّرها {displayName} وتشغّلها، موجّهة إلى متاجر التجزئة والإلكترونيات وإلى وكلاء الخدمات المالية.',
    intro: 'يحلّ Dukan ERP محلّ الدفتر والآلة الحاسبة والتقديرات التقريبية في نهاية اليوم بتطبيق واحد يتشاركه الفريق كله. يستخدمه مالك الشركة وموظفوها على تطبيق الهاتف، ويُدار حساب الشركة واشتراكها على هذا الموقع.',
    activitiesTitle: 'نشاطان ومنصة واحدة',
    activitiesLead: 'يدعم Dukan ERP حاليًا نشاطين تجاريين. ويزاول كل متجر في الشركة أحدهما أو كليهما بحسب ما يسمح به اشتراكه المعتمد.',
    retail: {
      title: 'التجزئة والإلكترونيات',
      lead: 'للمتاجر التي تبيع الهواتف والإلكترونيات والإكسسوارات وغيرها من السلع.',
      items: [
        'المخزون وطُرز المنتجات، مع المواصفات والكميات والأسعار',
        'تتبّع رقم IMEI والرقم التسلسلي لكل جهاز ذي رقم تسلسلي',
        'استلام المخزون بالمسح أو بالإدخال اليدوي، واستيراد ملفات المورّدين',
        'المبيعات مع إيصالاتها',
        'قنوات الدفع: النقد وحسابات الدفع التي تضبطها الشركة',
        'أرصدة الصندوق والحسابات، تُعدّ وتُغلق كل يوم',
        'المرتجعات والمبالغ المستردّة',
        'المصروفات',
        'تقارير يومية وشهرية وسنوية',
        'صلاحيات الموظفين وصلاحيات كل متجر',
      ],
    },
    agent: {
      title: 'وكيل الخدمات المالية',
      lead: 'للوكلاء الذين يبادلون النقد برصيد الدفع عبر الهاتف لصالح عملائهم.',
      items: [
        'تسجيل العمليات في الاتجاهين: نقد مستلَم مقابل رصيد مُرسَل، ورصيد مستلَم مقابل نقد مدفوع',
        'يدفع العميل العمولة، ويُدخلها الموظف بنفسه في كل عملية — لا توجد نسبة ثابتة',
        'العمولة دخل خاص بالشركة: لا يدفعها المزوّد ولا يتحقق منها، ولا تُغيّر رصيد المزوّد أبدًا',
        'قبل التأكيد، يرى الموظف المبلغ الأساسي والعمولة والنقد المستلَم أو المسلَّم والرصيد المرسَل أو المستلَم',
        'يُؤخذ اسم الموظف الذي سجّل كل عملية من حساب دخوله نفسه، ولا يُختار يدويًا أبدًا',
        'متابعة النشاط والأرصدة والعمولات لكل مزوّد على حدة',
        'السجل والتقارير حسب اليوم والأسبوع والشهر والسنة',
        'أرقام العملاء مخفية في القوائم، ولا تظهر كاملة إلا لمن يملك الصلاحية',
      ],
    },
    either: 'يمكن للشركة أن تستخدم أحد النشاطين أو كليهما، متجرًا بمتجر، وفق اشتراكها المعتمد.',
    providers: {
      title: 'بشأن مزوّدي الدفع عبر الهاتف',
      body: 'يسجّل Dukan ERP العمليات التي يُدخلها فريق الوكيل. وهو غير متصل بأي مزوّد للدفع عبر الهاتف ولا يتحقق من رصيد أي مزوّد. ولم يعتمد أي مزوّد Dukan ERP أو يدمجه في خدماته أو يزكِّه.',
    },
    start: {
      title: 'كيف تبدأ الشركة',
      steps: [
        'يتقدّم المالك بطلبه على هذا الموقع مع بيانات الشركة ومتجرها الأول.',
        'يُتحقَّق من بيانات الاتصال، ثم يمكن للمالك بدء الفترة التجريبية المجانية الوحيدة للشركة لمدة 7 أيام من حساب الشركة على هذا الموقع؛ ولا تبدأ إلا عندما يؤكّدها المالك، ولا يلزم أي دفع.',
        'خلال الفترة التجريبية، ثم بعد الاتفاق على الوصول المدفوع مع {displayName}، يسجّل المالك والفريق الدخول إلى تطبيق الهاتف.',
        'تُطلب المتاجر أو مقاعد الموظفين أو الأنشطة الإضافية من حساب الشركة، وتُفعَّل بعد التأكيد.',
      ],
    },
    app: {
      title: 'تطبيق الهاتف',
      body: 'يستخدم فريق الشركة Dukan ERP على الهواتف، بالعربية أو الفرنسية أو الإنجليزية.',
      noStore: 'ستظهر هنا روابط متاجر التطبيقات بعد نشر التطبيق.',
    },
    subscription: {
      title: 'الاشتراك',
      body: 'يُتّفق على الاشتراكات بين الشركة و{displayName}، وتُدار على هذا الموقع. ولا يحتوي تطبيق الهاتف على أي عمليات شراء. والأسعار أدناه صادرة عن الخدمة نفسها.',
    },
  },
};
