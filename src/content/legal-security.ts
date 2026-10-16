import type { Language } from '../i18n/languages';
import type { LegalDocument } from './types';

/**
 * Reporting a security problem (`/security`). Says how to report and what not to do — never how the system is built,
 * never a reward. The contact is TSX-MR's security address (a required input); the promise not to pursue good-faith
 * research is legal wording and waits for review. A DRAFT, not legal advice.
 */
export const security: Record<Language, LegalDocument> = {
  en: {
    version: '1.0 (draft)',
    status: 'draft',
    title: 'Reporting a security problem',
    summary: 'How to tell {displayName} about a weakness in Dukan ERP or this website, and what we ask of you while you look.',
    sections: [
      {
        id: 'report',
        heading: 'How to report',
        blocks: [
          { kind: 'p', text: 'Write to {securityEmail}. Please include what you found, where, the steps that reproduce it, and what someone could do with it. One problem per message helps.' },
          { kind: 'p', text: 'Do not put another person’s personal information in your report. If you came across some, say so and describe it without copying it.' },
        ],
      },
      {
        id: 'rules',
        heading: 'What we ask of you',
        blocks: [
          {
            kind: 'list',
            items: [
              'Use only accounts and businesses that are yours, or that you have been allowed to test. Never sign in as someone else.',
              'Do not read, copy, change or delete the information of a business or a person. If a test reaches such information, stop and report it.',
              'Do not slow down, overload or interrupt the service, and do not send messages to people through it.',
              'Do not try to trick staff or users, and do not test physical premises.',
              'Give us a reasonable time to fix a problem before you tell anyone else about it.',
              'Never ask for payment in exchange for not publishing or not exploiting what you found.',
            ],
          },
        ],
      },
      {
        id: 'after',
        heading: 'What happens next',
        blocks: [
          { kind: 'p', text: '{displayName} reads every report sent to {securityEmail}, replies to the address it came from, and tells you when the problem is fixed. {displayName} does not offer payment or rewards for reports.' },
          { kind: 'p', text: 'Whether {displayName} undertakes not to take legal action against research done in good faith and within these rules is legal wording still to be approved. [[blocker:legal_review]]' },
        ],
      },
      {
        id: 'not',
        heading: 'Not a security report',
        blocks: [{ kind: 'p', text: 'A lost phone, a forgotten password or a sign-in problem is a support question: see the support page. To stop a lost phone from using your account, sign in on another phone and sign that device out under More → Devices.' }],
      },
    ],
  },
  fr: {
    version: '1.0 (projet)',
    status: 'draft',
    title: 'Signaler un problème de sécurité',
    summary: 'Comment signaler à {displayName} une faiblesse de Dukan ERP ou de ce site, et ce que nous vous demandons pendant vos recherches.',
    sections: [
      {
        id: 'report',
        heading: 'Comment signaler',
        blocks: [
          { kind: 'p', text: 'Écrivez à {securityEmail}. Indiquez ce que vous avez trouvé, où, les étapes pour le reproduire et ce qu’une personne pourrait en faire. Un problème par message nous aide.' },
          { kind: 'p', text: 'N’incluez pas les informations personnelles d’une autre personne dans votre signalement. Si vous en avez vu, dites-le et décrivez-les sans les copier.' },
        ],
      },
      {
        id: 'rules',
        heading: 'Ce que nous vous demandons',
        blocks: [
          {
            kind: 'list',
            items: [
              'N’utilisez que des comptes et des entreprises qui sont les vôtres, ou que vous êtes autorisé à tester. Ne vous connectez jamais à la place de quelqu’un.',
              'Ne lisez, ne copiez, ne modifiez ni ne supprimez les informations d’une entreprise ou d’une personne. Si un test atteint de telles informations, arrêtez-vous et signalez-le.',
              'Ne ralentissez pas, ne surchargez pas et n’interrompez pas le service, et n’envoyez pas de messages à des personnes par son intermédiaire.',
              'N’essayez pas de tromper le personnel ou les utilisateurs, et ne testez pas les locaux.',
              'Laissez-nous un délai raisonnable pour corriger un problème avant d’en parler à quiconque.',
              'Ne demandez jamais d’argent en échange de ne pas publier ou de ne pas exploiter ce que vous avez trouvé.',
            ],
          },
        ],
      },
      {
        id: 'after',
        heading: 'La suite',
        blocks: [
          { kind: 'p', text: '{displayName} lit chaque signalement envoyé à {securityEmail}, répond à l’adresse d’où il vient et vous prévient quand le problème est corrigé. {displayName} n’offre ni paiement ni récompense pour les signalements.' },
          { kind: 'p', text: 'L’engagement éventuel de {displayName} de ne pas engager de poursuites contre une recherche menée de bonne foi et dans le respect de ces règles est une formulation juridique qui reste à approuver. [[blocker:legal_review]]' },
        ],
      },
      {
        id: 'not',
        heading: 'Ce qui n’est pas un problème de sécurité',
        blocks: [{ kind: 'p', text: 'Un téléphone perdu, un mot de passe oublié ou un problème de connexion relève de l’assistance : voir la page d’aide. Pour empêcher un téléphone perdu d’utiliser votre compte, connectez-vous sur un autre téléphone et déconnectez cet appareil dans Plus → Appareils.' }],
      },
    ],
  },
  ar: {
    version: '1.0 (مسودة)',
    status: 'draft',
    title: 'الإبلاغ عن مشكلة أمنية',
    summary: 'كيف تُبلغ {displayName} عن ثغرة في Dukan ERP أو في هذا الموقع، وما نطلبه منك أثناء البحث.',
    sections: [
      {
        id: 'report',
        heading: 'كيفية الإبلاغ',
        blocks: [
          { kind: 'p', text: 'راسل {securityEmail}. اذكر ما وجدته وأين، والخطوات التي تُعيد حدوثه، وما يمكن لشخص ما أن يفعله به. ويساعدنا أن تخصص كل رسالة لمشكلة واحدة.' },
          { kind: 'p', text: 'لا تضع المعلومات الشخصية لشخص آخر في بلاغك. وإن صادفت شيئًا منها فاذكر ذلك وصِفه دون نسخه.' },
        ],
      },
      {
        id: 'rules',
        heading: 'ما نطلبه منك',
        blocks: [
          {
            kind: 'list',
            items: [
              'لا تستخدم إلا حسابات ومؤسسات تخصك، أو سُمح لك باختبارها. ولا تسجّل الدخول أبدًا باسم شخص آخر.',
              'لا تقرأ معلومات مؤسسة أو شخص ولا تنسخها ولا تغيّرها ولا تحذفها. وإن وصل اختبار ما إلى مثل هذه المعلومات فتوقّف وأبلغ عن ذلك.',
              'لا تُبطئ الخدمة ولا تُثقلها ولا توقفها، ولا ترسل عبرها رسائل إلى الناس.',
              'لا تحاول خداع الموظفين أو المستخدمين، ولا تختبر المقرات.',
              'امنحنا وقتًا معقولًا لإصلاح المشكلة قبل أن تخبر بها أحدًا.',
              'لا تطلب أبدًا مقابلًا ماليًا مقابل عدم نشر ما وجدته أو عدم استغلاله.',
            ],
          },
        ],
      },
      {
        id: 'after',
        heading: 'ما يحدث بعد ذلك',
        blocks: [
          { kind: 'p', text: 'تقرأ {displayName} كل بلاغ يُرسل إلى {securityEmail}، وترد على العنوان الذي جاء منه، وتخبرك عند إصلاح المشكلة. ولا تقدّم {displayName} أي مقابل أو مكافأة على البلاغات.' },
          { kind: 'p', text: 'أما التزام {displayName} المحتمل بعدم اتخاذ إجراء قانوني ضد بحث أُجري بحسن نية وفي حدود هذه القواعد، فهو صياغة قانونية لم تُعتمد بعد. [[blocker:legal_review]]' },
        ],
      },
      {
        id: 'not',
        heading: 'ما ليس بلاغًا أمنيًا',
        blocks: [{ kind: 'p', text: 'الهاتف المفقود أو كلمة المرور المنسية أو مشكلة تسجيل الدخول من شؤون الدعم: راجع صفحة الدعم. ولمنع هاتف مفقود من استخدام حسابك، سجّل الدخول على هاتف آخر وسجّل خروج ذلك الجهاز من المزيد ← الأجهزة.' }],
      },
    ],
  },
};
