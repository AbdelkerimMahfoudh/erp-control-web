import type { Language } from '../i18n/languages';
import type { LegalDocument } from './types';

/**
 * Account deletion, as the backend and the app implement it (account-deletion.service.ts, deletion-rules.ts,
 * app/account/delete.tsx; docs/64): password again, a one-time code to the account's verified number on the one
 * channel the backend supports, immediate and irreversible, the last Owner closes the business. The channel is named
 * from `VITE_ACCOUNT_DELETION_CHANNEL`, which a production build requires — set only once that channel is configured
 * and tested (docs/74 §3). There is no deletion by the support team: it helps a person regain access to the app.
 */
export const accountDeletion: Record<Language, LegalDocument> = {
  en: {
    version: '1.0 (draft)',
    title: 'Deleting a Dukan ERP account',
    summary: 'How to delete a Dukan ERP account, what is removed, what is kept, and why.',
    sections: [
      { id: 'where', heading: 'Delete your account in the app', blocks: [{ kind: 'p', text: 'Open the Dukan ERP app and go to More, then Your account, then Delete account. The same option is offered on the screen shown when access to the business is closed.' }] },
      {
        id: 'steps',
        heading: 'What happens',
        blocks: [
          {
            kind: 'list',
            items: [
              'The app explains what will be deleted and what will be kept, and warns that deletion cannot be undone.',
              'You enter your password again.',
              'A one-time code is sent to your account’s verified {deletionChannelName} number, and you enter it in the app. If your account has no verified number, the app asks you to verify one first.',
              'When the code is confirmed, the deletion is carried out at once.',
              'Every session and every device of the account is signed out.',
            ],
          },
        ],
      },
      {
        id: 'who',
        heading: 'Employees, managers and owners',
        blocks: [
          { kind: 'p', text: 'Deleting your account removes your own sign-in only.' },
          { kind: 'p', text: 'If you are the last owner of the business, deleting your account closes the business: every account of the business is closed and signed out, the contact details of its customers and suppliers are removed, its stores are deactivated, and its subscription is cancelled.' },
        ],
      },
      {
        id: 'kept',
        heading: 'What is kept',
        blocks: [
          { kind: 'p', text: 'Sales, purchases, payments, returns, daily closings, the audit trail and subscription records are kept, because the business’s accounts depend on them. [[blocker:retention_period]]' },
          { kind: 'p', text: 'On the deleted account, the name becomes “Deleted user”, and the email address, the telephone number, the password and the PIN are removed. [[blocker:deidentification_gaps]]' },
        ],
      },
      { id: 'final', heading: 'Deletion cannot be undone', blocks: [{ kind: 'p', text: 'Once completed, a deleted account cannot be restored and can no longer be used to sign in.' }] },
      { id: 'help', heading: 'If you cannot use the app', blocks: [{ kind: 'p', text: 'Deletion is completed in the app, which confirms that the request comes from you. If you cannot open the app, write to {supportEmail} with the business name and the contact you sign in with; {displayName} will help you regain access so that you can delete the account. [[blocker:legal_review]]' }] },
    ],
  },
  fr: {
    version: '1.0 (projet)',
    title: 'Supprimer un compte Dukan ERP',
    summary: 'Comment supprimer un compte Dukan ERP, ce qui est supprimé, ce qui est conservé, et pourquoi.',
    sections: [
      { id: 'where', heading: 'Supprimez votre compte dans l’application', blocks: [{ kind: 'p', text: 'Ouvrez l’application Dukan ERP et allez dans Plus, puis Votre compte, puis Supprimer le compte. La même option est proposée sur l’écran affiché lorsque l’accès à l’entreprise est fermé.' }] },
      {
        id: 'steps',
        heading: 'Ce qui se passe',
        blocks: [
          {
            kind: 'list',
            items: [
              'L’application explique ce qui sera supprimé et ce qui sera conservé, et avertit que la suppression est irréversible.',
              'Vous saisissez à nouveau votre mot de passe.',
              'Un code à usage unique est envoyé au numéro {deletionChannelName} vérifié de votre compte, et vous le saisissez dans l’application. Si votre compte n’a pas de numéro vérifié, l’application vous demande d’abord d’en vérifier un.',
              'Une fois le code confirmé, la suppression est effectuée immédiatement.',
              'Toutes les sessions et tous les appareils du compte sont déconnectés.',
            ],
          },
        ],
      },
      {
        id: 'who',
        heading: 'Employés, responsables et propriétaires',
        blocks: [
          { kind: 'p', text: 'Supprimer votre compte ne supprime que votre propre accès.' },
          { kind: 'p', text: 'Si vous êtes le dernier propriétaire de l’entreprise, supprimer votre compte clôture l’entreprise : tous ses comptes sont fermés et déconnectés, les coordonnées de ses clients et fournisseurs sont supprimées, ses magasins sont désactivés et son abonnement est annulé.' },
        ],
      },
      {
        id: 'kept',
        heading: 'Ce qui est conservé',
        blocks: [
          { kind: 'p', text: 'Les ventes, achats, paiements, retours, clôtures quotidiennes, le journal d’audit et les données d’abonnement sont conservés, car la comptabilité de l’entreprise en dépend. [[blocker:retention_period]]' },
          { kind: 'p', text: 'Sur le compte supprimé, le nom devient « Utilisateur supprimé », et l’adresse e-mail, le numéro de téléphone, le mot de passe et le code PIN sont effacés. [[blocker:deidentification_gaps]]' },
        ],
      },
      { id: 'final', heading: 'La suppression est irréversible', blocks: [{ kind: 'p', text: 'Une fois effectuée, la suppression d’un compte ne peut pas être annulée, et le compte ne permet plus de se connecter.' }] },
      { id: 'help', heading: 'Si vous ne pouvez pas utiliser l’application', blocks: [{ kind: 'p', text: 'La suppression se fait dans l’application, qui confirme que la demande vient bien de vous. Si vous ne pouvez pas ouvrir l’application, écrivez à {supportEmail} en indiquant le nom de l’entreprise et le contact avec lequel vous vous connectez ; {displayName} vous aidera à retrouver l’accès afin que vous puissiez supprimer le compte. [[blocker:legal_review]]' }] },
    ],
  },
  ar: {
    version: '1.0 (مسودة)',
    title: 'حذف حساب Dukan ERP',
    summary: 'كيف تحذف حساب Dukan ERP، وما الذي يُحذف، وما الذي يُحتفَظ به، ولماذا.',
    sections: [
      { id: 'where', heading: 'احذف حسابك من التطبيق', blocks: [{ kind: 'p', text: 'افتح تطبيق Dukan ERP وانتقل إلى «المزيد» ثم «حسابك» ثم «حذف الحساب». ويظهر الخيار نفسه في الشاشة التي تُعرض عند إغلاق الوصول إلى الشركة.' }] },
      {
        id: 'steps',
        heading: 'ماذا يحدث',
        blocks: [
          {
            kind: 'list',
            items: [
              'يشرح التطبيق ما سيُحذف وما سيُحتفَظ به، وينبّه إلى أن الحذف لا يمكن التراجع عنه.',
              'تُدخل كلمة مرورك مرة أخرى.',
              'يُرسَل رمز يُستخدم مرة واحدة إلى رقم {deletionChannelName} الموثَّق في حسابك، وتُدخله في التطبيق. وإن لم يكن في حسابك رقم موثَّق، يطلب منك التطبيق توثيق رقم أولًا.',
              'بعد تأكيد الرمز، يُنفَّذ الحذف فورًا.',
              'تُنهى كل جلسات الحساب ويُسجَّل الخروج من كل أجهزته.',
            ],
          },
        ],
      },
      {
        id: 'who',
        heading: 'الموظفون والمسؤولون والمالكون',
        blocks: [
          { kind: 'p', text: 'حذف حسابك لا يزيل إلا تسجيل دخولك أنت.' },
          { kind: 'p', text: 'إن كنت آخر مالك للشركة، فإن حذف حسابك يُغلق الشركة: تُغلق كل حساباتها ويُسجَّل خروجها، وتُحذف بيانات الاتصال بعملائها ومورّديها، وتُعطَّل متاجرها، ويُلغى اشتراكها.' },
        ],
      },
      {
        id: 'kept',
        heading: 'ما الذي يُحتفَظ به',
        blocks: [
          { kind: 'p', text: 'يُحتفَظ بالمبيعات والمشتريات والمدفوعات والمرتجعات والإغلاقات اليومية وسجل التدقيق وسجلات الاشتراك، لأن حسابات الشركة تعتمد عليها. [[blocker:retention_period]]' },
          { kind: 'p', text: 'في الحساب المحذوف، يصبح الاسم «مستخدم محذوف»، ويُزال البريد الإلكتروني ورقم الهاتف وكلمة المرور والرمز السري. [[blocker:deidentification_gaps]]' },
        ],
      },
      { id: 'final', heading: 'لا يمكن التراجع عن الحذف', blocks: [{ kind: 'p', text: 'بعد إتمام الحذف، لا يمكن استعادة الحساب، ولا يمكن استخدامه لتسجيل الدخول.' }] },
      { id: 'help', heading: 'إن تعذّر عليك استخدام التطبيق', blocks: [{ kind: 'p', text: 'يتم الحذف من التطبيق، الذي يتأكّد من أن الطلب صادر عنك. وإن تعذّر عليك فتح التطبيق، فراسل {supportEmail} ذاكرًا اسم الشركة وجهة الاتصال التي تسجّل الدخول بها، وستساعدك {displayName} على استعادة الوصول لتتمكّن من حذف الحساب. [[blocker:legal_review]]' }] },
    ],
  },
};
