import type { Language } from '../i18n/languages';
import type { LegalDocument } from './types';

/**
 * The Dukan ERP terms of service — a DRAFT written from the product decisions and the code (docs/21, docs/76), not legal
 * advice. Every rule stated is one the software enforces; every clause the law decides carries a blocker, so a
 * production build cannot publish it unresolved. No price is named here: prices live on the Dukan ERP page.
 */
export const terms: Record<Language, LegalDocument> = {
  en: {
    version: '1.2 (draft)',
    status: 'draft',
    title: 'Dukan ERP terms of service',
    summary: 'The terms on which {displayName} provides Dukan ERP to businesses.',
    sections: [
      {
        id: 'about',
        heading: 'About these terms',
        blocks: [
          { kind: 'p', text: 'These terms apply to Dukan ERP, a service operated under the {displayName} name. {operatorStatus} A business accepts them when its Owner applies for, claims a trial of, or uses a business account. Only a person able to bind the business may accept them on its behalf. [[blocker:legal_review]]' },
        ],
      },
      {
        id: 'service',
        heading: 'The service',
        blocks: [
          { kind: 'p', text: 'Dukan ERP is a business tool. It is a mobile app used by a business’s Owner and staff, and a business account on this website where the Owner manages the business’s access. The customers of a business never sign in to it. It is not offered to consumers or to children.' },
        ],
      },
      {
        id: 'owner',
        heading: 'The Owner and the staff',
        blocks: [
          {
            kind: 'list',
            items: [
              'The Owner applies for the business and confirms that they may act for it. {displayName} reviews each business and may refuse one.',
              'The Owner chooses who works in the app, which stores each person is assigned to and what each person may do, and is responsible for those choices.',
              'Each person keeps their password and verification codes to themselves and tells the Owner, or signs the device out, when a phone is lost.',
            ],
          },
        ],
      },
      {
        id: 'use',
        heading: 'Acceptable use',
        blocks: [
          {
            kind: 'list',
            items: [
              'Use Dukan ERP only for the business’s own lawful activity, and record what really happened.',
              'Enter information about customers, suppliers and staff only when the business may lawfully keep it, and tell those people what it records as the law requires. The business, not {displayName}, decides what it records about them.',
              'Do not try to reach another business’s information, to get around a permission, or to slow down or interrupt the service.',
              'Do not copy, decompile or take apart the app or the service, and do not resell access to it, except where the law allows it despite this term.',
            ],
          },
        ],
      },
      {
        id: 'activities',
        heading: 'Store activities',
        blocks: [
          { kind: 'p', text: 'Each store is subscribed to one activity: electronics retail, money services as an agent, or both. The app shows each store only what its activity includes. Warehouses keep the electronics activity.' },
        ],
      },
      {
        id: 'not_bank',
        heading: 'What Dukan ERP is not',
        blocks: [
          { kind: 'p', text: 'Dukan ERP keeps the business’s own records of what its team enters. It is not a bank, not a payment or money-transfer service, and not Bankily, Sedad or any other mobile-money provider. It is not connected to any of them, does not move or hold money, does not check that a payment or an exchange took place, and holds none of the shop’s funds.' },
          { kind: 'p', text: 'In money services, the commission is the amount the team types for each exchange. {displayName} does not set, calculate or guarantee it.' },
          { kind: 'p', text: 'Reports, balances and expected amounts are bookkeeping figures made from what was recorded. They are not a statement from a bank or a provider, and a difference between them and the real cash or balance is the business’s to resolve.' },
        ],
      },
      {
        id: 'trial',
        heading: 'The free trial',
        blocks: [
          {
            kind: 'list',
            items: [
              'A business that registered itself has one free trial of 7 days (168 hours), once. A business created by {displayName} on its behalf has none, and none is added later.',
              'Every contact the Owner gave must be verified first. The Owner then claims the trial on this website, signed in to the business account; it starts at that moment. The app only shows the trial’s status.',
              'The trial can no longer be claimed once paid access or a grant has been approved, or the business has been refused or cancelled.',
              'No payment is asked for the trial, and nothing is charged or renewed when it ends. From its exact end, the business is read-only until paid access starts.',
              'Paid access approved during the trial starts when the trial ends, never during it.',
            ],
          },
        ],
      },
      {
        id: 'access',
        heading: 'Paid access, stores and seats',
        blocks: [
          {
            kind: 'list',
            items: [
              'Each store has a monthly price for its activity, with staff seats included; extra seats are charged per store. The current prices are on the Dukan ERP page and confirmed in the business account. None is shown or sold in the app.',
              'The business pays {displayName} outside the app, as agreed with it, and {displayName} confirms each payment against its reference. No payment is taken in the mobile app or on this website.',
              'A store or a seat added during a paid month is charged for that month. A removal, or a change to a lower-priced activity, takes effect at the next renewal. A change to a higher-priced activity is charged for the difference when it is confirmed.',
              'A store or a seat requested during the free trial may be paid during it, and starts when the trial ends, with the first paid period — charged once and never started during the trial. If no paid access has been approved by then, it waits for the first paid period.',
              'A month is never charged twice, and nothing renews by itself: each period starts only when {displayName} confirms its payment.',
              'Refunds: [[blocker:refund_policy]]',
            ],
          },
        ],
      },
      {
        id: 'states',
        heading: 'Grace, read-only access, suspension',
        blocks: [
          {
            kind: 'list',
            items: [
              'When a paid period ends without the next one confirmed, the app keeps working for 72 hours. After that the business is read-only: its records can still be read and its reports shared, but nothing new can be recorded until the next period starts.',
              '{displayName} may suspend a business, with a recorded reason. A suspended business cannot use the app until it is reinstated; its Owner can still reach the account page and delete their account.',
              'A business waiting to be approved, or one that was refused, cannot use the app. Its Owner can still reach the account page and delete their account.',
            ],
          },
        ],
      },
      {
        id: 'data',
        heading: 'The business’s records',
        blocks: [
          { kind: 'p', text: 'The records a business enters remain its own. {displayName} uses them only to provide and protect the service, as the privacy policy describes.' },
          { kind: 'p', text: 'A business can share its daily and monthly reports from the app as files. {displayName} keeps backups to restore the service after an incident, not as a copy kept for each business: a business should keep the reports it needs.' },
        ],
      },
      {
        id: 'closing',
        heading: 'Cancellation, termination and deletion',
        blocks: [
          { kind: 'p', text: 'A person ends their own access by deleting their account in the app. When the last active Owner deletes their account, the business is closed and its access ends, as the account deletion page describes. Some records are kept, de-identified, as that page explains.' },
          { kind: 'p', text: 'The grounds on which {displayName} may end the service for a business, and the notice it gives, are legal wording still to be approved. [[blocker:legal_review]]' },
        ],
      },
      {
        id: 'ip',
        heading: 'Intellectual property and feedback',
        blocks: [
          { kind: 'p', text: 'The app, the service and this website belong to the operator. A business receives the right to use them for its own activity while its access lasts, and no other right.' },
          { kind: 'p', text: 'Suggestions sent to {displayName} may be used to improve Dukan ERP, without obligation to the person who sent them.' },
        ],
      },
      {
        id: 'availability',
        heading: 'Availability and changes to the service',
        blocks: [
          { kind: 'p', text: 'Dukan ERP can be unavailable during maintenance or an incident; the app keeps some actions on the phone and sends them when the connection returns. Its features may change.' },
          { kind: 'p', text: 'What {displayName} promises about availability, and what it is not liable for: [[blocker:liability]]' },
        ],
      },
      {
        id: 'liability',
        heading: 'Disclaimers, liability and indemnity',
        blocks: [
          { kind: 'p', text: 'Dukan ERP helps a business keep its records; the business remains responsible for its operations, its money, its tax and accounting obligations and the decisions it takes from its reports. [[blocker:liability]]' },
          { kind: 'p', text: '[[blocker:indemnity]]' },
        ],
      },
      {
        id: 'law',
        heading: 'Governing law and disputes',
        blocks: [
          { kind: 'p', text: '[[blocker:governing_law]]' },
        ],
      },
      {
        id: 'changes',
        heading: 'Changes to these terms',
        blocks: [
          { kind: 'p', text: '{displayName} may change these terms. The version and its effective date are shown at the top of this page. How, and how long in advance, businesses are told of a change is legal wording still to be approved. [[blocker:legal_review]]' },
        ],
      },
      {
        id: 'contact',
        heading: 'Contact',
        blocks: [
          { kind: 'p', text: 'Questions about these terms: {supportEmail}.' },
        ],
      },
    ],
  },
  fr: {
    version: '1.2 (projet)',
    status: 'draft',
    title: 'Conditions d’utilisation de Dukan ERP',
    summary: 'Les conditions auxquelles {displayName} fournit Dukan ERP aux entreprises.',
    sections: [
      {
        id: 'about',
        heading: 'À propos de ces conditions',
        blocks: [
          { kind: 'p', text: 'Ces conditions s’appliquent à Dukan ERP, un service exploité sous le nom {displayName}. {operatorStatus} Une entreprise les accepte lorsque son propriétaire demande un compte entreprise, en réclame l’essai ou l’utilise. Seule une personne habilitée à engager l’entreprise peut les accepter en son nom. [[blocker:legal_review]]' },
        ],
      },
      {
        id: 'service',
        heading: 'Le service',
        blocks: [
          { kind: 'p', text: 'Dukan ERP est un outil professionnel. Il se compose d’une application mobile utilisée par le propriétaire et le personnel d’une entreprise, et d’un compte entreprise sur ce site où le propriétaire gère l’accès de l’entreprise. Les clients d’une entreprise ne s’y connectent jamais. Il n’est proposé ni aux consommateurs ni aux enfants.' },
        ],
      },
      {
        id: 'owner',
        heading: 'Le propriétaire et le personnel',
        blocks: [
          {
            kind: 'list',
            items: [
              'Le propriétaire demande le compte de l’entreprise et confirme qu’il peut agir pour elle. {displayName} examine chaque entreprise et peut en refuser une.',
              'Le propriétaire choisit qui travaille dans l’application, à quels magasins chaque personne est affectée et ce que chacune peut faire, et il est responsable de ces choix.',
              'Chaque personne garde pour elle son mot de passe et ses codes de vérification, et prévient le propriétaire, ou déconnecte l’appareil, lorsqu’un téléphone est perdu.',
            ],
          },
        ],
      },
      {
        id: 'use',
        heading: 'Usage acceptable',
        blocks: [
          {
            kind: 'list',
            items: [
              'Utilisez Dukan ERP uniquement pour l’activité légale de l’entreprise, et enregistrez ce qui s’est réellement passé.',
              'N’enregistrez des informations sur les clients, fournisseurs et employés que lorsque l’entreprise peut légalement les conserver, et informez ces personnes de ce qu’elle enregistre comme la loi l’exige. C’est l’entreprise, et non {displayName}, qui décide de ce qu’elle enregistre à leur sujet.',
              'N’essayez pas d’accéder aux informations d’une autre entreprise, de contourner une autorisation, ni de ralentir ou d’interrompre le service.',
              'Ne copiez, ne décompilez ni ne démontez l’application ou le service, et ne revendez pas l’accès, sauf lorsque la loi le permet malgré cette clause.',
            ],
          },
        ],
      },
      {
        id: 'activities',
        heading: 'Activités des magasins',
        blocks: [
          { kind: 'p', text: 'Chaque magasin est abonné à une activité : la vente d’électronique, les services monétaires en tant qu’agent, ou les deux. L’application ne montre à chaque magasin que ce que comprend son activité. Les entrepôts gardent l’activité électronique.' },
        ],
      },
      {
        id: 'not_bank',
        heading: 'Ce que Dukan ERP n’est pas',
        blocks: [
          { kind: 'p', text: 'Dukan ERP tient les propres registres de l’entreprise à partir de ce que saisit son équipe. Ce n’est ni une banque, ni un service de paiement ou de transfert d’argent, ni Bankily, Sedad ou un autre opérateur de paiement mobile. Il n’est relié à aucun d’eux, ne déplace ni ne détient d’argent, ne vérifie pas qu’un paiement ou un échange a eu lieu, et ne détient aucun fonds de la boutique.' },
          { kind: 'p', text: 'Pour les services monétaires, la commission est le montant que l’équipe saisit pour chaque échange. {displayName} ne la fixe pas, ne la calcule pas et ne la garantit pas.' },
          { kind: 'p', text: 'Les rapports, soldes et montants attendus sont des chiffres comptables établis à partir de ce qui a été enregistré. Ce ne sont pas des relevés d’une banque ou d’un opérateur, et un écart avec l’argent ou le solde réel relève de l’entreprise.' },
        ],
      },
      {
        id: 'trial',
        heading: 'L’essai gratuit',
        blocks: [
          {
            kind: 'list',
            items: [
              'Une entreprise qui s’est inscrite elle-même dispose d’un essai gratuit de 7 jours (168 heures), une seule fois. Une entreprise créée par {displayName} pour son compte n’en a pas, et aucun n’est ajouté plus tard.',
              'Chaque coordonnée donnée par le propriétaire doit d’abord être vérifiée. Le propriétaire réclame ensuite l’essai sur ce site, connecté au compte entreprise ; il commence à ce moment-là. L’application ne fait qu’afficher l’état de l’essai.',
              'L’essai ne peut plus être réclamé une fois qu’un accès payant ou une gratuité a été approuvé, ou que l’entreprise a été refusée ou annulée.',
              'Aucun paiement n’est demandé pour l’essai, et rien n’est facturé ni renouvelé à sa fin. Dès sa fin exacte, l’entreprise passe en lecture seule jusqu’au début de l’accès payant.',
              'Un accès payant approuvé pendant l’essai commence à la fin de l’essai, jamais pendant.',
            ],
          },
        ],
      },
      {
        id: 'access',
        heading: 'Accès payant, magasins et places',
        blocks: [
          {
            kind: 'list',
            items: [
              'Chaque magasin a un prix mensuel pour son activité, avec des places de personnel incluses ; les places supplémentaires sont facturées par magasin. Les prix en vigueur figurent sur la page Dukan ERP et sont confirmés dans le compte entreprise. Aucun n’est affiché ni vendu dans l’application.',
              'L’entreprise paie {displayName} en dehors de l’application, comme convenu avec elle, et {displayName} confirme chaque paiement à partir de sa référence. Aucun paiement n’est encaissé dans l’application mobile ni sur ce site.',
              'Un magasin ou une place ajouté pendant un mois payé est facturé pour ce mois. Une suppression, ou le passage à une activité moins chère, prend effet au renouvellement suivant. Le passage à une activité plus chère est facturé pour la différence lorsqu’il est confirmé.',
              'Un magasin ou une place demandé pendant l’essai gratuit peut être payé pendant celui-ci, et commence à la fin de l’essai, avec la première période payée — facturé une seule fois et jamais commencé pendant l’essai. Si aucun accès payant n’a été approuvé d’ici là, il attend la première période payée.',
              'Un mois n’est jamais facturé deux fois, et rien ne se renouvelle tout seul : chaque période ne commence que lorsque {displayName} confirme son paiement.',
              'Remboursements : [[blocker:refund_policy]]',
            ],
          },
        ],
      },
      {
        id: 'states',
        heading: 'Délai de grâce, lecture seule, suspension',
        blocks: [
          {
            kind: 'list',
            items: [
              'Lorsqu’une période payée prend fin sans que la suivante soit confirmée, l’application continue de fonctionner pendant 72 heures. Ensuite l’entreprise passe en lecture seule : ses registres restent lisibles et ses rapports partageables, mais rien de nouveau ne peut être enregistré avant le début de la période suivante.',
              '{displayName} peut suspendre une entreprise, avec un motif enregistré. Une entreprise suspendue ne peut pas utiliser l’application tant qu’elle n’est pas rétablie ; son propriétaire peut toujours accéder à la page du compte et supprimer son compte.',
              'Une entreprise en attente d’approbation, ou refusée, ne peut pas utiliser l’application. Son propriétaire peut toujours accéder à la page du compte et supprimer son compte.',
            ],
          },
        ],
      },
      {
        id: 'data',
        heading: 'Les registres de l’entreprise',
        blocks: [
          { kind: 'p', text: 'Les registres qu’une entreprise saisit restent les siens. {displayName} ne les utilise que pour fournir et protéger le service, comme le décrit la politique de confidentialité.' },
          { kind: 'p', text: 'Une entreprise peut partager ses rapports quotidiens et mensuels depuis l’application sous forme de fichiers. {displayName} conserve des sauvegardes pour rétablir le service après un incident, et non comme une copie gardée pour chaque entreprise : une entreprise doit conserver les rapports dont elle a besoin.' },
        ],
      },
      {
        id: 'closing',
        heading: 'Résiliation, fin du service et suppression',
        blocks: [
          { kind: 'p', text: 'Une personne met fin à son propre accès en supprimant son compte dans l’application. Lorsque le dernier propriétaire actif supprime son compte, l’entreprise est clôturée et son accès prend fin, comme le décrit la page sur la suppression de compte. Certains registres sont conservés, anonymisés, comme l’explique cette page.' },
          { kind: 'p', text: 'Les motifs pour lesquels {displayName} peut mettre fin au service d’une entreprise, et le préavis qu’elle donne, sont une formulation juridique qui reste à approuver. [[blocker:legal_review]]' },
        ],
      },
      {
        id: 'ip',
        heading: 'Propriété intellectuelle et suggestions',
        blocks: [
          { kind: 'p', text: 'L’application, le service et ce site appartiennent à l’exploitant. Une entreprise reçoit le droit de les utiliser pour sa propre activité tant que dure son accès, et aucun autre droit.' },
          { kind: 'p', text: 'Les suggestions envoyées à {displayName} peuvent servir à améliorer Dukan ERP, sans obligation envers la personne qui les a envoyées.' },
        ],
      },
      {
        id: 'availability',
        heading: 'Disponibilité et évolution du service',
        blocks: [
          { kind: 'p', text: 'Dukan ERP peut être indisponible pendant une maintenance ou un incident ; l’application garde certaines actions sur le téléphone et les envoie au retour de la connexion. Ses fonctionnalités peuvent évoluer.' },
          { kind: 'p', text: 'Ce que {displayName} promet en matière de disponibilité, et ce dont elle n’est pas responsable : [[blocker:liability]]' },
        ],
      },
      {
        id: 'liability',
        heading: 'Exclusions, responsabilité et garantie',
        blocks: [
          { kind: 'p', text: 'Dukan ERP aide une entreprise à tenir ses registres ; l’entreprise reste responsable de son activité, de son argent, de ses obligations fiscales et comptables et des décisions qu’elle prend à partir de ses rapports. [[blocker:liability]]' },
          { kind: 'p', text: '[[blocker:indemnity]]' },
        ],
      },
      {
        id: 'law',
        heading: 'Droit applicable et litiges',
        blocks: [
          { kind: 'p', text: '[[blocker:governing_law]]' },
        ],
      },
      {
        id: 'changes',
        heading: 'Modification de ces conditions',
        blocks: [
          { kind: 'p', text: '{displayName} peut modifier ces conditions. La version et sa date d’entrée en vigueur figurent en haut de cette page. La manière dont les entreprises sont prévenues d’un changement, et le délai, sont une formulation juridique qui reste à approuver. [[blocker:legal_review]]' },
        ],
      },
      {
        id: 'contact',
        heading: 'Contact',
        blocks: [
          { kind: 'p', text: 'Questions sur ces conditions : {supportEmail}.' },
        ],
      },
    ],
  },
  ar: {
    version: '1.2 (مسودة)',
    status: 'draft',
    title: 'شروط خدمة Dukan ERP',
    summary: 'الشروط التي تقدّم بموجبها {displayName} خدمة Dukan ERP للمؤسسات.',
    sections: [
      {
        id: 'about',
        heading: 'حول هذه الشروط',
        blocks: [
          { kind: 'p', text: 'تسري هذه الشروط على Dukan ERP، وهي خدمة تُشغَّل تحت اسم {displayName}. {operatorStatus} وتقبلها المؤسسة عندما يطلب مالكها حساب مؤسسة أو يطالب بتجربته أو يستخدمه. ولا يجوز قبولها نيابة عن المؤسسة إلا لشخص مخوَّل بإلزامها. [[blocker:legal_review]]' },
        ],
      },
      {
        id: 'service',
        heading: 'الخدمة',
        blocks: [
          { kind: 'p', text: 'Dukan ERP أداة للمؤسسات. وهي تطبيق للهاتف يستخدمه مالك المؤسسة وموظفوها، وحساب للمؤسسة على هذا الموقع يدير فيه المالك وصول مؤسسته. ولا يسجّل عملاء المؤسسة الدخول إليها أبدًا. ولا تُقدَّم للمستهلكين ولا للأطفال.' },
        ],
      },
      {
        id: 'owner',
        heading: 'المالك والموظفون',
        blocks: [
          {
            kind: 'list',
            items: [
              'يطلب المالك حساب المؤسسة ويؤكد أنه مخوَّل بالتصرف باسمها. وتراجع {displayName} كل مؤسسة ويجوز لها رفضها.',
              'يختار المالك من يعمل في التطبيق، والمتاجر التي يُكلَّف بها كل شخص، وما يُسمح لكل شخص بفعله، وهو مسؤول عن هذه الاختيارات.',
              'يحتفظ كل شخص بكلمة مروره ورموز التحقق لنفسه، ويُبلغ المالك أو يسجّل خروج الجهاز عند فقدان الهاتف.',
            ],
          },
        ],
      },
      {
        id: 'use',
        heading: 'الاستخدام المقبول',
        blocks: [
          {
            kind: 'list',
            items: [
              'استخدم Dukan ERP لنشاط المؤسسة المشروع فقط، وسجّل ما حدث فعلًا.',
              'لا تُدخل معلومات عن العملاء والموردين والموظفين إلا إذا كان يحق للمؤسسة قانونًا الاحتفاظ بها، وأخبر هؤلاء الأشخاص بما تسجّله كما يقتضي القانون. والمؤسسة، لا {displayName}، هي التي تقرّر ما تسجّله عنهم.',
              'لا تحاول الوصول إلى معلومات مؤسسة أخرى، ولا الالتفاف على إذن، ولا إبطاء الخدمة أو إيقافها.',
              'لا تنسخ التطبيق أو الخدمة ولا تفككها ولا تحلّل شيفرتها، ولا تُعِد بيع الوصول إليها، إلا حيث يسمح القانون بذلك رغم هذا البند.',
            ],
          },
        ],
      },
      {
        id: 'activities',
        heading: 'أنشطة المتاجر',
        blocks: [
          { kind: 'p', text: 'يشترك كل متجر في نشاط واحد: بيع الإلكترونيات، أو الخدمات المالية بصفة وكيل، أو كليهما. ولا يعرض التطبيق لكل متجر إلا ما يتضمنه نشاطه. وتبقى المستودعات على نشاط الإلكترونيات.' },
        ],
      },
      {
        id: 'not_bank',
        heading: 'ما ليس Dukan ERP',
        blocks: [
          { kind: 'p', text: 'يحتفظ Dukan ERP بسجلات المؤسسة الخاصة لما يُدخله فريقها. وهو ليس مصرفًا، ولا خدمة دفع أو تحويل أموال، وليس Bankily ولا Sedad ولا أي مزوّد آخر للدفع عبر الهاتف. وهو غير مرتبط بأي منها، ولا ينقل الأموال ولا يحتفظ بها، ولا يتحقق من حدوث دفعة أو عملية صرف، ولا يحتفظ بأي من أموال المتجر.' },
          { kind: 'p', text: 'في الخدمات المالية، العمولة هي المبلغ الذي يكتبه الفريق لكل عملية. ولا تحددها {displayName} ولا تحسبها ولا تضمنها.' },
          { kind: 'p', text: 'التقارير والأرصدة والمبالغ المتوقعة أرقام محاسبية مأخوذة مما سُجّل. وهي ليست كشفًا صادرًا عن مصرف أو مزوّد، وأي فرق بينها وبين النقد أو الرصيد الفعلي تتولى المؤسسة تسويته.' },
        ],
      },
      {
        id: 'trial',
        heading: 'التجربة المجانية',
        blocks: [
          {
            kind: 'list',
            items: [
              'للمؤسسة التي سجّلت نفسها تجربة مجانية واحدة مدتها 7 أيام (168 ساعة)، مرة واحدة. أما المؤسسة التي أنشأتها {displayName} نيابة عنها فليست لها تجربة، ولا تُضاف لها لاحقًا.',
              'يجب أولًا التحقق من كل وسيلة اتصال قدّمها المالك. ثم يطالب المالك بالتجربة على هذا الموقع، وهو مسجّل الدخول إلى حساب المؤسسة؛ فتبدأ في تلك اللحظة. ولا يعرض التطبيق إلا حالة التجربة.',
              'لا يمكن المطالبة بالتجربة بعد اعتماد وصول مدفوع أو منحة، أو بعد رفض المؤسسة أو إلغائها.',
              'لا يُطلب أي دفع مقابل التجربة، ولا يُفوتر شيء ولا يُجدَّد عند انتهائها. ومنذ لحظة انتهائها بالضبط تصبح المؤسسة للقراءة فقط إلى أن يبدأ الوصول المدفوع.',
              'الوصول المدفوع الذي يُعتمد أثناء التجربة يبدأ عند انتهائها، ولا يبدأ أبدًا أثناءها.',
            ],
          },
        ],
      },
      {
        id: 'access',
        heading: 'الوصول المدفوع والمتاجر والمقاعد',
        blocks: [
          {
            kind: 'list',
            items: [
              'لكل متجر سعر شهري لنشاطه، يشمل مقاعد للموظفين؛ وتُفوتر المقاعد الإضافية لكل متجر. والأسعار السارية معروضة في صفحة Dukan ERP ومؤكدة في حساب المؤسسة. ولا يُعرض أي منها ولا يُباع في التطبيق.',
              'تدفع المؤسسة لـ{displayName} خارج التطبيق، وفق ما يُتفق عليه معها، وتؤكد {displayName} كل دفعة بالاستناد إلى مرجعها. ولا يُحصَّل أي دفع داخل تطبيق الهاتف أو على هذا الموقع.',
              'يُفوتر المتجر أو المقعد المضاف خلال شهر مدفوع عن ذلك الشهر. ويسري الحذف، أو الانتقال إلى نشاط أقل سعرًا، عند التجديد التالي. ويُفوتر الانتقال إلى نشاط أعلى سعرًا بالفرق عند تأكيده.',
              'المتجر أو المقعد المطلوب خلال التجربة المجانية يمكن دفع ثمنه أثناءها، ويبدأ عند انتهائها مع أول فترة مدفوعة — يُفوتر مرة واحدة ولا يبدأ أبدًا أثناء التجربة. وإن لم يُعتمد وصول مدفوع حتى ذلك الحين فإنه ينتظر أول فترة مدفوعة.',
              'لا يُفوتر شهر مرتين أبدًا، ولا يتجدد شيء من تلقاء نفسه: لا تبدأ أي فترة إلا عندما تؤكد {displayName} دفعها.',
              'الاسترداد: [[blocker:refund_policy]]',
            ],
          },
        ],
      },
      {
        id: 'states',
        heading: 'فترة السماح والقراءة فقط والتعليق',
        blocks: [
          {
            kind: 'list',
            items: [
              'عندما تنتهي فترة مدفوعة دون تأكيد الفترة التالية، يستمر التطبيق في العمل 72 ساعة. وبعد ذلك تصبح المؤسسة للقراءة فقط: تبقى سجلاتها مقروءة وتقاريرها قابلة للمشاركة، لكن لا يمكن تسجيل أي جديد قبل بدء الفترة التالية.',
              'يجوز لـ{displayName} تعليق مؤسسة، مع تسجيل السبب. ولا يمكن للمؤسسة المعلَّقة استخدام التطبيق حتى تُعاد؛ ويبقى بإمكان مالكها الوصول إلى صفحة الحساب وحذف حسابه.',
              'لا يمكن للمؤسسة التي تنتظر الاعتماد، أو التي رُفضت، استخدام التطبيق. ويبقى بإمكان مالكها الوصول إلى صفحة الحساب وحذف حسابه.',
            ],
          },
        ],
      },
      {
        id: 'data',
        heading: 'سجلات المؤسسة',
        blocks: [
          { kind: 'p', text: 'تبقى السجلات التي تُدخلها المؤسسة ملكًا لها. ولا تستخدمها {displayName} إلا لتقديم الخدمة وحمايتها، كما تصف سياسة الخصوصية.' },
          { kind: 'p', text: 'يمكن للمؤسسة مشاركة تقاريرها اليومية والشهرية من التطبيق في شكل ملفات. وتحتفظ {displayName} بنسخ احتياطية لاستعادة الخدمة بعد أي حادث، لا كنسخة محفوظة لكل مؤسسة: لذا ينبغي للمؤسسة الاحتفاظ بالتقارير التي تحتاجها.' },
        ],
      },
      {
        id: 'closing',
        heading: 'الإنهاء وإيقاف الخدمة والحذف',
        blocks: [
          { kind: 'p', text: 'يُنهي الشخص وصوله بحذف حسابه في التطبيق. وعندما يحذف آخر مالك نشط حسابه تُغلق المؤسسة وينتهي وصولها، كما تصف صفحة حذف الحساب. وتُحفظ بعض السجلات بعد إزالة الهوية منها، كما تشرح تلك الصفحة.' },
          { kind: 'p', text: 'أما الأسباب التي يجوز لـ{displayName} بموجبها إنهاء الخدمة لمؤسسة، والمهلة التي تمنحها، فهي صياغة قانونية لم تُعتمد بعد. [[blocker:legal_review]]' },
        ],
      },
      {
        id: 'ip',
        heading: 'الملكية الفكرية والاقتراحات',
        blocks: [
          { kind: 'p', text: 'التطبيق والخدمة وهذا الموقع مملوكة للمشغّل. وتحصل المؤسسة على حق استخدامها لنشاطها الخاص ما دام وصولها قائمًا، ولا تحصل على أي حق آخر.' },
          { kind: 'p', text: 'يجوز استخدام الاقتراحات المرسلة إلى {displayName} لتحسين Dukan ERP، دون أي التزام تجاه مرسلها.' },
        ],
      },
      {
        id: 'availability',
        heading: 'توفر الخدمة وتغييرها',
        blocks: [
          { kind: 'p', text: 'قد لا يكون Dukan ERP متاحًا أثناء الصيانة أو عند وقوع حادث؛ ويحتفظ التطبيق ببعض العمليات على الهاتف ويرسلها عند عودة الاتصال. وقد تتغير ميزاتها.' },
          { kind: 'p', text: 'ما تتعهد به {displayName} بشأن التوفر، وما لا تتحمل مسؤوليته: [[blocker:liability]]' },
        ],
      },
      {
        id: 'liability',
        heading: 'إخلاء المسؤولية والمسؤولية والتعويض',
        blocks: [
          { kind: 'p', text: 'يساعد Dukan ERP المؤسسة على مسك سجلاتها؛ وتبقى المؤسسة مسؤولة عن نشاطها وأموالها والتزاماتها الضريبية والمحاسبية والقرارات التي تتخذها بناءً على تقاريرها. [[blocker:liability]]' },
          { kind: 'p', text: '[[blocker:indemnity]]' },
        ],
      },
      {
        id: 'law',
        heading: 'القانون الواجب التطبيق والنزاعات',
        blocks: [
          { kind: 'p', text: '[[blocker:governing_law]]' },
        ],
      },
      {
        id: 'changes',
        heading: 'تعديل هذه الشروط',
        blocks: [
          { kind: 'p', text: 'يجوز لـ{displayName} تعديل هذه الشروط. ويظهر الإصدار وتاريخ سريانه أعلى هذه الصفحة. أما كيفية إبلاغ المؤسسات بأي تغيير ومدة الإشعار المسبق فهي صياغة قانونية لم تُعتمد بعد. [[blocker:legal_review]]' },
        ],
      },
      {
        id: 'contact',
        heading: 'التواصل',
        blocks: [
          { kind: 'p', text: 'أسئلة حول هذه الشروط: {supportEmail}.' },
        ],
      },
    ],
  },
};
