import type { Language } from '../i18n/languages';
import type { LegalDocument } from './types';

/**
 * The Dukan ERP terms of service — a DRAFT built from the approved commercial decisions (D135, D154, D158; docs/68)
 * and the implemented access rules (72-hour grace, then read-only). No price is written here: prices are the
 * server's, shown on the product page. Law, liability and legal review are blockers, never invented.
 */
export const terms: Record<Language, LegalDocument> = {
  en: {
    version: '1.0 (draft)',
    title: 'Dukan ERP terms of service',
    summary: 'The terms on which {displayName} provides Dukan ERP to businesses.',
    sections: [
      { id: 'about', heading: 'About these terms', blocks: [{ kind: 'p', text: 'These terms apply to the use of Dukan ERP, developed and operated by {legalName} ({displayName}). By applying for or using a business account, the business accepts them. [[blocker:legal_review]]' }] },
      { id: 'service', heading: 'The service', blocks: [{ kind: 'p', text: 'Dukan ERP is offered to businesses only. It consists of a mobile app used by the business’s owner and staff, and of a business account on this website where the subscription is managed. Each store runs the retail and electronics activity, the money-services agent activity, or both, as its subscription allows.' }] },
      {
        id: 'accounts',
        heading: 'Business accounts',
        blocks: [
          {
            kind: 'list',
            items: [
              'The owner applies for the business. {displayName} reviews each application and may refuse it; nothing is activated before approval.',
              'The owner is responsible for the staff accounts of the business and for the permissions given to each person.',
              'Each person keeps their password and verification codes to themselves and gives accurate contact details.',
            ],
          },
        ],
      },
      {
        id: 'subscription',
        heading: 'Subscriptions',
        blocks: [
          {
            kind: 'list',
            items: [
              'Each store has a monthly subscription for its activity, with staff seats included; additional seats are charged per store. The current prices are shown on the Dukan ERP page and confirmed in the business account.',
              'There is no free trial.',
              'A store or a seat added during a month is charged for that month. A removal, or a change to a lower-priced activity, takes effect at the next renewal.',
              'A change to a higher-priced activity is charged for the difference when it is confirmed.',
            ],
          },
        ],
      },
      { id: 'payments', heading: 'Payments', blocks: [{ kind: 'p', text: 'Payments are made as agreed with {displayName}, which confirms each one against the payment’s reference. No payment is taken in the mobile app or on this website.' }] },
      {
        id: 'access',
        heading: 'Grace period, read-only access and suspension',
        blocks: [
          { kind: 'p', text: 'When a paid period ends, the app keeps working for 72 hours. After that it becomes read-only — records can still be read and exported — until the next period is confirmed.' },
          { kind: 'p', text: '{displayName} may suspend a business, with a recorded reason.' },
        ],
      },
      {
        id: 'use',
        heading: 'Acceptable use',
        blocks: [
          {
            kind: 'list',
            items: [
              'Use Dukan ERP only for the business’s lawful operations.',
              'Do not try to reach another business’s information or to disrupt the service.',
              'Record accurate information.',
            ],
          },
        ],
      },
      { id: 'data', heading: 'The business’s information', blocks: [{ kind: 'p', text: 'The business is responsible for the information it records about its customers, suppliers and staff. Personal information is handled as described in the privacy policy.' }] },
      { id: 'providers', heading: 'Mobile-money providers', blocks: [{ kind: 'p', text: 'Dukan ERP records the exchanges that the business’s team enters. It is not connected to any mobile-money provider and does not check a provider’s balance; no provider has approved or endorsed it.' }] },
      { id: 'availability', heading: 'Availability and liability', blocks: [{ kind: 'p', text: '[[blocker:liability]]' }] },
      { id: 'closing', heading: 'Closing an account', blocks: [{ kind: 'p', text: 'An account is closed by deleting it in the app. When the last owner deletes their account, the business is closed and its subscription cancelled, as described on the account deletion page.' }] },
      { id: 'law', heading: 'Governing law', blocks: [{ kind: 'p', text: '[[blocker:governing_law]]' }] },
      { id: 'contact', heading: 'Contact', blocks: [{ kind: 'p', text: 'Questions about these terms: {supportEmail}.' }] },
    ],
  },
  fr: {
    version: '1.0 (projet)',
    title: 'Conditions d’utilisation de Dukan ERP',
    summary: 'Les conditions dans lesquelles {displayName} fournit Dukan ERP aux entreprises.',
    sections: [
      { id: 'about', heading: 'À propos de ces conditions', blocks: [{ kind: 'p', text: 'Ces conditions s’appliquent à l’utilisation de Dukan ERP, développé et exploité par {legalName} ({displayName}). En demandant ou en utilisant un compte entreprise, l’entreprise les accepte. [[blocker:legal_review]]' }] },
      { id: 'service', heading: 'Le service', blocks: [{ kind: 'p', text: 'Dukan ERP est proposé uniquement aux entreprises. Il se compose d’une application mobile utilisée par le propriétaire et le personnel de l’entreprise, et d’un compte entreprise sur ce site où se gère l’abonnement. Chaque magasin exerce l’activité de commerce de détail et d’électronique, celle d’agent de services monétaires, ou les deux, selon son abonnement.' }] },
      {
        id: 'accounts',
        heading: 'Comptes entreprise',
        blocks: [
          {
            kind: 'list',
            items: [
              'Le propriétaire fait la demande pour l’entreprise. {displayName} examine chaque demande et peut la refuser ; rien n’est activé avant l’approbation.',
              'Le propriétaire est responsable des comptes du personnel de l’entreprise et des autorisations données à chacun.',
              'Chacun garde pour lui son mot de passe et ses codes de vérification, et fournit des coordonnées exactes.',
            ],
          },
        ],
      },
      {
        id: 'subscription',
        heading: 'Abonnements',
        blocks: [
          {
            kind: 'list',
            items: [
              'Chaque magasin a un abonnement mensuel pour son activité, avec des postes inclus pour le personnel ; les postes supplémentaires sont facturés par magasin. Les prix en vigueur figurent sur la page Dukan ERP et sont confirmés dans le compte de l’entreprise.',
              'Il n’y a pas d’essai gratuit.',
              'Un magasin ou un poste ajouté en cours de mois est facturé pour ce mois. Une suppression, ou le passage à une activité moins chère, prend effet au renouvellement suivant.',
              'Le passage à une activité plus chère est facturé pour la différence lorsqu’il est confirmé.',
            ],
          },
        ],
      },
      { id: 'payments', heading: 'Paiements', blocks: [{ kind: 'p', text: 'Les paiements se font comme convenu avec {displayName}, qui confirme chacun à partir de la référence du paiement. Aucun paiement n’est encaissé dans l’application mobile ni sur ce site.' }] },
      {
        id: 'access',
        heading: 'Délai de grâce, lecture seule et suspension',
        blocks: [
          { kind: 'p', text: 'À la fin d’une période payée, l’application continue de fonctionner pendant 72 heures. Elle passe ensuite en lecture seule — les données restent consultables et exportables — jusqu’à la confirmation de la période suivante.' },
          { kind: 'p', text: '{displayName} peut suspendre une entreprise, avec un motif enregistré.' },
        ],
      },
      {
        id: 'use',
        heading: 'Usage acceptable',
        blocks: [
          {
            kind: 'list',
            items: [
              'Utiliser Dukan ERP uniquement pour les activités licites de l’entreprise.',
              'Ne pas tenter d’accéder aux informations d’une autre entreprise ni de perturber le service.',
              'Enregistrer des informations exactes.',
            ],
          },
        ],
      },
      { id: 'data', heading: 'Les informations de l’entreprise', blocks: [{ kind: 'p', text: 'L’entreprise est responsable des informations qu’elle enregistre sur ses clients, fournisseurs et employés. Les informations personnelles sont traitées comme le décrit la politique de confidentialité.' }] },
      { id: 'providers', heading: 'Opérateurs de paiement mobile', blocks: [{ kind: 'p', text: 'Dukan ERP enregistre les échanges que saisit l’équipe de l’entreprise. Il n’est relié à aucun opérateur de paiement mobile et ne vérifie pas le solde d’un opérateur ; aucun opérateur ne l’a approuvé ni recommandé.' }] },
      { id: 'availability', heading: 'Disponibilité et responsabilité', blocks: [{ kind: 'p', text: '[[blocker:liability]]' }] },
      { id: 'closing', heading: 'Clôturer un compte', blocks: [{ kind: 'p', text: 'Un compte se clôture en le supprimant dans l’application. Lorsque le dernier propriétaire supprime son compte, l’entreprise est clôturée et son abonnement annulé, comme l’explique la page sur la suppression de compte.' }] },
      { id: 'law', heading: 'Droit applicable', blocks: [{ kind: 'p', text: '[[blocker:governing_law]]' }] },
      { id: 'contact', heading: 'Contact', blocks: [{ kind: 'p', text: 'Questions sur ces conditions : {supportEmail}.' }] },
    ],
  },
  ar: {
    version: '1.0 (مسودة)',
    title: 'شروط استخدام Dukan ERP',
    summary: 'الشروط التي تقدّم بموجبها {displayName} خدمة Dukan ERP للشركات.',
    sections: [
      { id: 'about', heading: 'حول هذه الشروط', blocks: [{ kind: 'p', text: 'تسري هذه الشروط على استخدام Dukan ERP الذي تطوّره وتشغّله {legalName} ({displayName}). وبطلب حساب شركة أو استخدامه، تقبل الشركة هذه الشروط. [[blocker:legal_review]]' }] },
      { id: 'service', heading: 'الخدمة', blocks: [{ kind: 'p', text: 'يُقدَّم Dukan ERP للشركات فقط. ويتكوّن من تطبيق للهاتف يستخدمه مالك الشركة وموظفوها، ومن حساب للشركة على هذا الموقع يُدار فيه الاشتراك. ويزاول كل متجر نشاط التجزئة والإلكترونيات أو نشاط وكيل الخدمات المالية أو كليهما، بحسب اشتراكه.' }] },
      {
        id: 'accounts',
        heading: 'حسابات الشركات',
        blocks: [
          {
            kind: 'list',
            items: [
              'يتقدّم المالك بالطلب باسم الشركة. وتراجع {displayName} كل طلب ويجوز لها رفضه، ولا يُفعَّل أي شيء قبل الموافقة.',
              'المالك مسؤول عن حسابات موظفي الشركة وعن الصلاحيات الممنوحة لكل شخص.',
              'يحتفظ كل شخص بكلمة مروره ورموز التحقق لنفسه، ويقدّم بيانات اتصال صحيحة.',
            ],
          },
        ],
      },
      {
        id: 'subscription',
        heading: 'الاشتراكات',
        blocks: [
          {
            kind: 'list',
            items: [
              'لكل متجر اشتراك شهري لنشاطه يشمل مقاعد للموظفين، وتُحتسب المقاعد الإضافية لكل متجر. وتظهر الأسعار السارية في صفحة Dukan ERP وتُؤكَّد في حساب الشركة.',
              'لا توجد فترة تجريبية مجانية.',
              'يُحتسب المتجر أو المقعد المضاف خلال الشهر عن ذلك الشهر. أما الإزالة، أو التحويل إلى نشاط أقل سعرًا، فيسري عند التجديد التالي.',
              'يُحتسب التحويل إلى نشاط أعلى سعرًا بقيمة الفرق عند تأكيده.',
            ],
          },
        ],
      },
      { id: 'payments', heading: 'المدفوعات', blocks: [{ kind: 'p', text: 'تتم المدفوعات وفق الاتفاق مع {displayName}، التي تؤكّد كل دفعة بالاستناد إلى مرجعها. ولا يُحصَّل أي دفع داخل تطبيق الهاتف أو على هذا الموقع.' }] },
      {
        id: 'access',
        heading: 'فترة السماح والقراءة فقط والتعليق',
        blocks: [
          { kind: 'p', text: 'عند انتهاء الفترة المدفوعة، يستمر التطبيق في العمل لمدة 72 ساعة، ثم يصبح للقراءة فقط — تبقى السجلات قابلة للاطلاع والتصدير — إلى أن تُؤكَّد الفترة التالية.' },
          { kind: 'p', text: 'يجوز لـ{displayName} تعليق شركة، مع تسجيل السبب.' },
        ],
      },
      {
        id: 'use',
        heading: 'الاستخدام المقبول',
        blocks: [
          {
            kind: 'list',
            items: [
              'استخدام Dukan ERP لأعمال الشركة المشروعة فقط.',
              'عدم محاولة الوصول إلى معلومات شركة أخرى أو تعطيل الخدمة.',
              'تسجيل معلومات صحيحة.',
            ],
          },
        ],
      },
      { id: 'data', heading: 'معلومات الشركة', blocks: [{ kind: 'p', text: 'الشركة مسؤولة عن المعلومات التي تسجّلها عن عملائها ومورّديها وموظفيها. وتُعالَج المعلومات الشخصية على النحو الموضّح في سياسة الخصوصية.' }] },
      { id: 'providers', heading: 'مزوّدو الدفع عبر الهاتف', blocks: [{ kind: 'p', text: 'يسجّل Dukan ERP العمليات التي يُدخلها فريق الشركة. وهو غير متصل بأي مزوّد للدفع عبر الهاتف ولا يتحقق من رصيد أي مزوّد، ولم يعتمده أي مزوّد أو يزكِّه.' }] },
      { id: 'availability', heading: 'التوفر والمسؤولية', blocks: [{ kind: 'p', text: '[[blocker:liability]]' }] },
      { id: 'closing', heading: 'إغلاق الحساب', blocks: [{ kind: 'p', text: 'يُغلق الحساب بحذفه من التطبيق. وعندما يحذف آخر مالك حسابه، تُغلق الشركة ويُلغى اشتراكها، على النحو الموضّح في صفحة حذف الحساب.' }] },
      { id: 'law', heading: 'القانون الواجب التطبيق', blocks: [{ kind: 'p', text: '[[blocker:governing_law]]' }] },
      { id: 'contact', heading: 'التواصل', blocks: [{ kind: 'p', text: 'للأسئلة عن هذه الشروط: {supportEmail}.' }] },
    ],
  },
};
