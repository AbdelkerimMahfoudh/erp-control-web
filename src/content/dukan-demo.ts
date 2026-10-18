import type { Language } from '../i18n/languages';

/**
 * The words of the Dukan ERP showcase (components/public/DukanShowcase.tsx; the owner's approval of 2026-10-18): one
 * short walkthrough on the phone for each activity, three steps each. It is an illustration, said so under it: fictional
 * figures, no real transaction, nothing sent anywhere.
 *
 * What it may say is what the app does (D154–D157, D164):
 *  - a sale is recorded, never taken: Dukan ERP records the payment the customer made and moves no money;
 *  - an exchange is recorded, never sent: no "transfer sent", no provider confirming anything, no provider paying the
 *    commission. The commission is typed by the operator for each exchange and paid by the customer — there is no
 *    rate — and the operator is whoever is signed in, never chosen. The walkthrough shows the amount and the commission
 *    apart and says nothing of the cash or credit balances, whose arithmetic is the app's to show.
 *
 * Its figures are the same in every language (`DEMO_FIGURES`), formatted, never computed. The two providers are
 * labels the reader would see on the agent's own counter, not partners: no logo, no link, and no claim that either
 * knows Dukan ERP (the product page says so in `dukan-erp.ts` `providers`). They are the only provider names in this
 * file, on one line the source rules exempt.
 */
export const DEMO_PROVIDERS = ['Bankily', 'Sedad'] as const;

/** One phone at 20,000 MRU paid in full; one exchange of 1,000 MRU with a 20 MRU commission. Fictional, not a tariff. */
export const DEMO_FIGURES = { salePrice: 20000, exchangeAmount: 1000, commission: 20, imei: '···4821' } as const;

export interface DemoStep {
  title: string;
  body: string;
}

export interface DukanDemo {
  /** Above the showcase on the product page (the home page's card has its own heading). */
  title: string;
  lead: string;
  tabsLabel: string;
  stepsLabel: string;
  screenLabel: string;
  note: string;
  play: string;
  pause: string;
  replay: string;
  electronics: {
    tab: string;
    steps: [DemoStep, DemoStep, DemoStep];
    newSale: string;
    scan: string;
    product: string;
    variant: string;
    inStock: string;
    price: string;
    payment: string;
    saleAmount: string;
    received: string;
    method: string;
    cash: string;
    paidInFull: string;
    recorded: string;
    sold: string;
    today: string;
    sales: string;
    amount: string;
  };
  agent: {
    tab: string;
    steps: [DemoStep, DemoStep, DemoStep];
    directionLabel: string;
    receiveCash: string;
    giveCash: string;
    newExchange: string;
    provider: string;
    amount: string;
    commission: string;
    commissionHint: string;
    operator: string;
    demoOperator: string;
    fromSignIn: string;
    example: string;
    recorded: string;
    today: string;
    exchanges: string;
    commissionEarned: string;
  };
}

export const dukanDemo: Record<Language, DukanDemo> = {
  en: {
    title: 'See each activity at work',
    lead: 'A short walkthrough on the phone for each activity, one step at a time.',
    tabsLabel: 'Choose an activity',
    stepsLabel: 'Steps of the walkthrough',
    screenLabel: 'Phone screen',
    note: 'Interactive illustration · fictional data · no real transactions',
    play: 'Play',
    pause: 'Pause',
    replay: 'Replay',
    electronics: {
      tab: 'Electronics stores',
      steps: [
        { title: 'Select the product', body: 'Scan or pick the phone: its variant, stock ID and price fill in by themselves.' },
        { title: 'Record the payment', body: 'Enter what the customer paid, and how. {productName} records the payment; it does not take it.' },
        { title: 'Review', body: 'The sale is recorded, the phone is marked sold and the day’s totals are updated.' },
      ],
      newSale: 'New sale',
      scan: 'Scan or search',
      product: 'Smartphone · 128 GB',
      variant: 'Black',
      inStock: 'In stock',
      price: 'Price',
      payment: 'Payment',
      saleAmount: 'Sale amount',
      received: 'Received',
      method: 'Paid by',
      cash: 'Cash',
      paidInFull: 'Paid in full',
      recorded: 'Sale recorded',
      sold: 'Sold',
      today: 'Today',
      sales: 'Sales',
      amount: 'Amount',
    },
    agent: {
      tab: 'Money-service agents',
      steps: [
        { title: 'Choose the provider and direction', body: 'Pick the provider and which way the exchange goes.' },
        {
          title: 'Enter the amount and commission',
          body: 'The operator types the amount and the commission the customer pays — there is no fixed rate. The operator is whoever is signed in.',
        },
        {
          title: 'Review',
          body: 'The exchange is recorded under the operator’s name, the commission is kept apart and the day’s summary is updated. {productName} does not send or receive money.',
        },
      ],
      directionLabel: 'Direction',
      receiveCash: 'Receive cash · give electronic credit',
      giveCash: 'Give cash · receive electronic credit',
      newExchange: 'New exchange',
      provider: 'Provider',
      amount: 'Amount',
      commission: 'Commission paid by the customer',
      commissionHint: 'Typed for this exchange',
      operator: 'Operator',
      demoOperator: 'Demo operator',
      fromSignIn: 'From the sign-in',
      example: 'Example figures, not a tariff',
      recorded: 'Transaction recorded',
      today: 'Today',
      exchanges: 'Exchanges',
      commissionEarned: 'Commission earned',
    },
  },
  fr: {
    title: 'Chaque activité, en pratique',
    lead: 'Une courte démonstration sur le téléphone pour chaque activité, étape par étape.',
    tabsLabel: 'Choisir une activité',
    stepsLabel: 'Étapes de la démonstration',
    screenLabel: 'Écran du téléphone',
    note: 'Illustration interactive · données fictives · aucune transaction réelle',
    play: 'Lecture',
    pause: 'Mettre en pause',
    replay: 'Rejouer',
    electronics: {
      tab: 'Magasins d’électronique',
      steps: [
        { title: 'Choisir le produit', body: 'Scannez ou choisissez le téléphone : sa variante, son identifiant de stock et son prix se remplissent seuls.' },
        { title: 'Enregistrer le paiement', body: 'Indiquez ce que le client a payé, et comment. {productName} enregistre le paiement ; il ne l’encaisse pas.' },
        { title: 'Vérifier', body: 'La vente est enregistrée, le téléphone passe en vendu et les totaux du jour sont mis à jour.' },
      ],
      newSale: 'Nouvelle vente',
      scan: 'Scanner ou rechercher',
      product: 'Smartphone · 128 Go',
      variant: 'Noir',
      inStock: 'En stock',
      price: 'Prix',
      payment: 'Paiement',
      saleAmount: 'Montant de la vente',
      received: 'Reçu',
      method: 'Payé en',
      cash: 'Espèces',
      paidInFull: 'Payé en totalité',
      recorded: 'Vente enregistrée',
      sold: 'Vendu',
      today: 'Aujourd’hui',
      sales: 'Ventes',
      amount: 'Montant',
    },
    agent: {
      tab: 'Agents de services monétaires',
      steps: [
        { title: 'Choisir le fournisseur et le sens', body: 'Choisissez le fournisseur et le sens de l’échange.' },
        {
          title: 'Saisir le montant et la commission',
          body: 'L’opérateur saisit le montant et la commission payée par le client — il n’y a pas de taux fixe. L’opérateur est la personne connectée.',
        },
        {
          title: 'Vérifier',
          body: 'L’échange est enregistré au nom de l’opérateur, la commission à part, et le résumé du jour est mis à jour. {productName} n’envoie ni ne reçoit d’argent.',
        },
      ],
      directionLabel: 'Sens',
      receiveCash: 'Recevoir des espèces · donner du crédit électronique',
      giveCash: 'Donner des espèces · recevoir du crédit électronique',
      newExchange: 'Nouvel échange',
      provider: 'Fournisseur',
      amount: 'Montant',
      commission: 'Commission payée par le client',
      commissionHint: 'Saisie pour cet échange',
      operator: 'Opérateur',
      demoOperator: 'Opérateur de démonstration',
      fromSignIn: 'Selon la connexion',
      example: 'Montants d’exemple, pas un tarif',
      recorded: 'Transaction enregistrée',
      today: 'Aujourd’hui',
      exchanges: 'Échanges',
      commissionEarned: 'Commission perçue',
    },
  },
  ar: {
    title: 'شاهد كل نشاط أثناء العمل',
    lead: 'عرض قصير على الهاتف لكل نشاط، خطوة بخطوة.',
    tabsLabel: 'اختر نشاطًا',
    stepsLabel: 'خطوات العرض',
    screenLabel: 'شاشة الهاتف',
    note: 'رسم توضيحي تفاعلي · بيانات وهمية · لا معاملات حقيقية',
    play: 'تشغيل',
    pause: 'إيقاف مؤقت',
    replay: 'إعادة التشغيل',
    electronics: {
      tab: 'متاجر الإلكترونيات',
      steps: [
        { title: 'اختيار المنتج', body: 'امسح الهاتف أو اختره: يُملأ طرازه ومعرّف المخزون وسعره تلقائيًا.' },
        { title: 'تسجيل الدفع', body: 'أدخل ما دفعه الزبون وطريقة الدفع. يسجّل {productName} الدفع ولا يحصّله.' },
        { title: 'المراجعة', body: 'يُسجَّل البيع، ويُعلَّم الهاتف مُباعًا، وتُحدَّث مجاميع اليوم.' },
      ],
      newSale: 'بيع جديد',
      scan: 'امسح أو ابحث',
      product: 'هاتف ذكي · 128 غيغابايت',
      variant: 'أسود',
      inStock: 'متوفر في المخزون',
      price: 'السعر',
      payment: 'الدفع',
      saleAmount: 'مبلغ البيع',
      received: 'المبلغ المستلم',
      method: 'طريقة الدفع',
      cash: 'نقدًا',
      paidInFull: 'مدفوع بالكامل',
      recorded: 'تم تسجيل البيع',
      sold: 'مُباع',
      today: 'اليوم',
      sales: 'المبيعات',
      amount: 'المبلغ',
    },
    agent: {
      tab: 'وكلاء الخدمات المالية',
      steps: [
        { title: 'اختيار المزوّد والاتجاه', body: 'اختر المزوّد واتجاه المبادلة.' },
        {
          title: 'إدخال المبلغ والعمولة',
          body: 'يكتب المشغّل المبلغ والعمولة التي يدفعها الزبون — لا توجد نسبة ثابتة. المشغّل هو الشخص الذي سجّل الدخول.',
        },
        {
          title: 'المراجعة',
          body: 'تُسجَّل المبادلة باسم المشغّل، وتبقى العمولة منفصلة، ويُحدَّث ملخص اليوم. لا يرسل {productName} المال ولا يستلمه.',
        },
      ],
      directionLabel: 'الاتجاه',
      receiveCash: 'استلام النقد · منح رصيد إلكتروني',
      giveCash: 'دفع النقد · استلام رصيد إلكتروني',
      newExchange: 'مبادلة جديدة',
      provider: 'المزوّد',
      amount: 'المبلغ',
      commission: 'العمولة التي يدفعها الزبون',
      commissionHint: 'تُكتب لهذه المبادلة',
      operator: 'المشغّل',
      demoOperator: 'مشغّل تجريبي',
      fromSignIn: 'من تسجيل الدخول',
      example: 'أرقام للتوضيح، وليست تعرفة',
      recorded: 'تم تسجيل المعاملة',
      today: 'اليوم',
      exchanges: 'المبادلات',
      commissionEarned: 'العمولة المحصّلة',
    },
  },
};
