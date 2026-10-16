import type { Language } from '../i18n/languages';
import type { LegalDocument } from './types';

/**
 * Your privacy choices (`/privacy-choices`): only what the software lets a person or a business do today, and where.
 * Nothing here promises a tool that does not exist — there is no self-service export of all of a person's data, and no
 * way to correct or delete one customer record in the app; both are said plainly. A DRAFT, not legal advice.
 */
export const privacyChoices: Record<Language, LegalDocument> = {
  en: {
    version: '1.0 (draft)',
    status: 'draft',
    title: 'Your privacy choices',
    summary: 'What you can see, correct, export or delete in Dukan ERP yourself, and how to ask {displayName} for the rest.',
    sections: [
      {
        id: 'account',
        heading: 'Your own account',
        blocks: [
          {
            kind: 'list',
            items: [
              'See your sign-in identifier and verify your WhatsApp number in the app, under More → Your account.',
              'Sign a phone out of your account under More → Devices — for example when a phone is lost.',
              'Delete your account in the app, under More → Your account → Delete account. The account deletion page explains what happens.',
            ],
          },
        ],
      },
      {
        id: 'staff',
        heading: 'If you work for a business',
        blocks: [{ kind: 'p', text: 'Your name and contact details are kept by the business you work for. Its Owner can correct them, or deactivate your login, in the app under Team. Ask the Owner first; if that is not possible, write to {privacyEmail}.' }],
      },
      {
        id: 'business',
        heading: 'For a business',
        blocks: [
          {
            kind: 'list',
            items: [
              'The Owner, and staff allowed to see reports, can share the daily and monthly reports as PDF files and export reports as spreadsheet files from the app.',
              'There is no button that exports everything Dukan ERP holds about a business or a person. To ask for a copy, write to {privacyEmail}.',
            ],
          },
        ],
      },
      {
        id: 'customers',
        heading: 'If you are a customer of a shop',
        blocks: [
          { kind: 'p', text: 'A shop decides what it records about its customers, such as a name or a telephone number used for a sale or a money exchange. Ask the shop first.' },
          { kind: 'p', text: 'The app has no way today for a shop to correct or delete one customer’s record on its own. A shop, or a customer who cannot reach the shop, can write to {privacyEmail}; what {displayName} can then do depends on the records a shop must keep and on the law that applies. [[blocker:privacy_law]]' },
        ],
      },
      {
        id: 'messages',
        heading: 'Messages, advertising and tracking',
        blocks: [{ kind: 'p', text: 'Dukan ERP sends only the messages the service needs, such as verification codes and set-up instructions. It sends no marketing, shows no advertising and does not track you across other apps or websites, so there is nothing to opt out of.' }],
      },
      {
        id: 'website',
        heading: 'On this website',
        blocks: [{ kind: 'p', text: 'This website keeps only your language and light or dark theme in your browser, and a sign-in cookie while you are signed in to a business account. You can clear them in your browser’s settings; nothing else needs a choice.' }],
      },
      {
        id: 'contact',
        heading: 'Ask {displayName}',
        blocks: [
          { kind: 'p', text: 'For anything not listed here — a copy of your information, a correction you cannot make yourself, or an objection — write to {privacyEmail} from an address or number on your account, so that {displayName} can check it is you.' },
          { kind: 'p', text: 'The rights the law gives you, how quickly {displayName} must answer, and where you may complain are being confirmed with legal counsel. [[blocker:privacy_law]]' },
        ],
      },
    ],
  },
  fr: {
    version: '1.0 (projet)',
    status: 'draft',
    title: 'Vos choix de confidentialité',
    summary: 'Ce que vous pouvez consulter, corriger, exporter ou supprimer vous-même dans Dukan ERP, et comment demander le reste à {displayName}.',
    sections: [
      {
        id: 'account',
        heading: 'Votre propre compte',
        blocks: [
          {
            kind: 'list',
            items: [
              'Consultez votre identifiant de connexion et vérifiez votre numéro WhatsApp dans l’application, sous Plus → Votre compte.',
              'Déconnectez un téléphone de votre compte sous Plus → Appareils — par exemple lorsqu’un téléphone est perdu.',
              'Supprimez votre compte dans l’application, sous Plus → Votre compte → Supprimer le compte. La page sur la suppression de compte explique ce qui se passe.',
            ],
          },
        ],
      },
      {
        id: 'staff',
        heading: 'Si vous travaillez pour une entreprise',
        blocks: [{ kind: 'p', text: 'Votre nom et vos coordonnées sont conservés par l’entreprise pour laquelle vous travaillez. Son propriétaire peut les corriger, ou désactiver votre accès, dans l’application sous Équipe. Adressez-vous d’abord au propriétaire ; si ce n’est pas possible, écrivez à {privacyEmail}.' }],
      },
      {
        id: 'business',
        heading: 'Pour une entreprise',
        blocks: [
          {
            kind: 'list',
            items: [
              'Le propriétaire, et le personnel autorisé à voir les rapports, peuvent partager les rapports quotidiens et mensuels en fichiers PDF et exporter des rapports en fichiers tableur depuis l’application.',
              'Aucun bouton n’exporte tout ce que Dukan ERP détient sur une entreprise ou une personne. Pour en demander une copie, écrivez à {privacyEmail}.',
            ],
          },
        ],
      },
      {
        id: 'customers',
        heading: 'Si vous êtes client d’une boutique',
        blocks: [
          { kind: 'p', text: 'Une boutique décide de ce qu’elle enregistre sur ses clients, par exemple un nom ou un numéro de téléphone utilisé pour une vente ou un échange d’argent. Adressez-vous d’abord à la boutique.' },
          { kind: 'p', text: 'L’application ne permet pas aujourd’hui à une boutique de corriger ou de supprimer seule la fiche d’un client. Une boutique, ou un client qui ne peut pas joindre la boutique, peut écrire à {privacyEmail} ; ce que {displayName} peut alors faire dépend des registres qu’une boutique doit conserver et de la loi applicable. [[blocker:privacy_law]]' },
        ],
      },
      {
        id: 'messages',
        heading: 'Messages, publicité et suivi',
        blocks: [{ kind: 'p', text: 'Dukan ERP n’envoie que les messages nécessaires au service, comme les codes de vérification et les instructions de configuration. Il n’envoie aucun message commercial, n’affiche aucune publicité et ne vous suit pas sur d’autres applications ou sites : il n’y a rien à refuser.' }],
      },
      {
        id: 'website',
        heading: 'Sur ce site',
        blocks: [{ kind: 'p', text: 'Ce site ne conserve dans votre navigateur que votre langue et votre thème clair ou sombre, ainsi qu’un cookie de connexion tant que vous êtes connecté à un compte entreprise. Vous pouvez les effacer dans les réglages de votre navigateur ; rien d’autre ne demande de choix.' }],
      },
      {
        id: 'contact',
        heading: 'Demander à {displayName}',
        blocks: [
          { kind: 'p', text: 'Pour tout ce qui n’est pas listé ici — une copie de vos informations, une correction que vous ne pouvez pas faire vous-même, ou une opposition — écrivez à {privacyEmail} depuis une adresse ou un numéro de votre compte, afin que {displayName} puisse vérifier qu’il s’agit bien de vous.' },
          { kind: 'p', text: 'Les droits que la loi vous accorde, le délai dans lequel {displayName} doit répondre et l’autorité auprès de laquelle vous pouvez vous plaindre sont en cours de confirmation avec un conseil juridique. [[blocker:privacy_law]]' },
        ],
      },
    ],
  },
  ar: {
    version: '1.0 (مسودة)',
    status: 'draft',
    title: 'خيارات الخصوصية',
    summary: 'ما يمكنك الاطلاع عليه أو تصحيحه أو تصديره أو حذفه بنفسك في Dukan ERP، وكيف تطلب الباقي من {displayName}.',
    sections: [
      {
        id: 'account',
        heading: 'حسابك الخاص',
        blocks: [
          {
            kind: 'list',
            items: [
              'اطّلع على معرّف تسجيل الدخول الخاص بك وتحقق من رقم واتساب في التطبيق، ضمن المزيد ← حسابك.',
              'سجّل خروج هاتف من حسابك ضمن المزيد ← الأجهزة — عند فقدان الهاتف مثلًا.',
              'احذف حسابك في التطبيق، ضمن المزيد ← حسابك ← حذف الحساب. وتشرح صفحة حذف الحساب ما يحدث بعد ذلك.',
            ],
          },
        ],
      },
      {
        id: 'staff',
        heading: 'إذا كنت تعمل لدى مؤسسة',
        blocks: [{ kind: 'p', text: 'تحتفظ المؤسسة التي تعمل لديها باسمك ووسائل الاتصال بك. ويمكن لمالكها تصحيحها، أو تعطيل دخولك، في التطبيق ضمن الفريق. توجّه إلى المالك أولًا؛ وإن تعذّر ذلك فراسل {privacyEmail}.' }],
      },
      {
        id: 'business',
        heading: 'بالنسبة للمؤسسة',
        blocks: [
          {
            kind: 'list',
            items: [
              'يمكن للمالك، وللموظفين المسموح لهم برؤية التقارير، مشاركة التقارير اليومية والشهرية كملفات PDF وتصدير التقارير كملفات جداول بيانات من التطبيق.',
              'لا يوجد زر يصدّر كل ما يحتفظ به Dukan ERP عن مؤسسة أو شخص. ولطلب نسخة، راسل {privacyEmail}.',
            ],
          },
        ],
      },
      {
        id: 'customers',
        heading: 'إذا كنت عميلًا لدى متجر',
        blocks: [
          { kind: 'p', text: 'يقرّر المتجر ما يسجّله عن عملائه، مثل اسم أو رقم هاتف استُخدم في عملية بيع أو صرف. توجّه إلى المتجر أولًا.' },
          { kind: 'p', text: 'لا يتيح التطبيق اليوم للمتجر تصحيح سجل عميل واحد أو حذفه بنفسه. ويمكن للمتجر، أو للعميل الذي يتعذّر عليه الوصول إلى المتجر، مراسلة {privacyEmail}؛ وما يمكن لـ{displayName} فعله عندئذ يتوقف على السجلات التي يجب على المتجر الاحتفاظ بها وعلى القانون المطبَّق. [[blocker:privacy_law]]' },
        ],
      },
      {
        id: 'messages',
        heading: 'الرسائل والإعلانات والتتبع',
        blocks: [{ kind: 'p', text: 'لا يرسل Dukan ERP إلا الرسائل التي تحتاجها الخدمة، مثل رموز التحقق وتعليمات الإعداد. ولا يرسل رسائل تسويقية، ولا يعرض إعلانات، ولا يتتبعك عبر التطبيقات أو المواقع الأخرى، فلا يوجد ما يلزم رفضه.' }],
      },
      {
        id: 'website',
        heading: 'على هذا الموقع',
        blocks: [{ kind: 'p', text: 'لا يحتفظ هذا الموقع في متصفحك إلا بلغتك ومظهرك الفاتح أو الداكن، وبملف تعريف ارتباط لتسجيل الدخول ما دمت مسجّلًا في حساب مؤسسة. ويمكنك مسحها من إعدادات متصفحك؛ ولا يحتاج أي شيء آخر إلى اختيار.' }],
      },
      {
        id: 'contact',
        heading: 'اطلب من {displayName}',
        blocks: [
          { kind: 'p', text: 'لكل ما لم يُذكر هنا — نسخة من معلوماتك، أو تصحيح لا يمكنك إجراؤه بنفسك، أو اعتراض — راسل {privacyEmail} من عنوان أو رقم مسجّل في حسابك، حتى تتمكن {displayName} من التحقق من هويتك.' },
          { kind: 'p', text: 'يجري التأكد مع مستشار قانوني من الحقوق التي يمنحك إياها القانون، والمهلة التي يجب أن ترد فيها {displayName}، والجهة التي يمكنك تقديم شكوى إليها. [[blocker:privacy_law]]' },
        ],
      },
    ],
  },
};
