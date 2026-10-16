/**
 * The title and description of every public page in every language, from the same content the page renders — the
 * prerenderer and the page itself call this, so the `<title>` a crawler reads is the heading a person reads.
 * Values are raw texts (with `{inputs}`); `plainText` fills them.
 */
import { about, accountDeletion, applicationStatus, contact, dukanErp, home, legalNotice, login, privacy, privacyChoices, products, security, support, terms } from '../content';
import { translate } from '../i18n';
import type { Language } from '../i18n/languages';
import type { PublicRouteId } from './routes';

export interface PageMeta {
  title: string;
  description: string;
}

const SUFFIX = ' — {displayName}';

export function metaFor(id: PublicRouteId, lang: Language): PageMeta {
  switch (id) {
    case 'home':
      return { title: translate(lang, 'page.home.title', { name: '{displayName}' }), description: home[lang].hero.lead };
    case 'dukanErp':
      return { title: `${dukanErp[lang].title}${SUFFIX}`, description: dukanErp[lang].summary };
    case 'apply':
      return { title: `${translate(lang, 'page.apply.title')}${SUFFIX}`, description: translate(lang, 'page.apply.description', { name: '{displayName}' }) };
    case 'about':
      return { title: about[lang].title, description: about[lang].summary };
    case 'products':
      return { title: `${products[lang].title}${SUFFIX}`, description: products[lang].summary };
    case 'contact':
      return { title: contact[lang].title, description: contact[lang].summary };
    case 'support':
      return { title: `${support[lang].title}${SUFFIX}`, description: support[lang].summary };
    case 'privacy':
      return { title: `${privacy[lang].title}${SUFFIX}`, description: privacy[lang].summary };
    case 'terms':
      return { title: `${terms[lang].title}${SUFFIX}`, description: terms[lang].summary };
    case 'accountDeletion':
      return { title: `${accountDeletion[lang].title}${SUFFIX}`, description: accountDeletion[lang].summary };
    case 'privacyChoices':
      return { title: `${privacyChoices[lang].title}${SUFFIX}`, description: privacyChoices[lang].summary };
    case 'legalNotice':
      return { title: `${legalNotice[lang].title}${SUFFIX}`, description: legalNotice[lang].summary };
    case 'security':
      return { title: `${security[lang].title}${SUFFIX}`, description: security[lang].summary };
    case 'applicationStatus':
      return { title: `${applicationStatus[lang].title}${SUFFIX}`, description: applicationStatus[lang].summary };
    case 'login':
      return { title: `${login[lang].title}${SUFFIX}`, description: login[lang].summary };
  }
}
