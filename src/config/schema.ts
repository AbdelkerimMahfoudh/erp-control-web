/**
 * The website's production inputs (docs/74 §3): who publishes it, where it lives, and how people reach TSX-MR.
 *
 * Nothing here is invented. Every value comes from the build environment (`VITE_*`, the project's convention —
 * Vite exposes only that prefix to the page). A production build refuses to start while a value the law or the
 * App Store needs is blank, malformed or a test value (`releaseProblems`); a preview build fills each blank with a
 * visibly marked test value and says so on every page. Pure — no `import.meta`, no DOM — so the build, the
 * prerenderer and the tests read the same rules.
 */

export type BuildMode = 'production' | 'preview' | 'development' | 'test';

export type InputKind = 'https-origin' | 'https-url' | 'text' | 'email' | 'phone' | 'phone-list' | 'date' | 'deletion-channel' | 'surface' | 'operator-type';

export interface InputSpec {
  /** The environment variable, `VITE_*`. */
  env: string;
  kind: InputKind;
  /** Needed before a full build (the PORTAL gate) is published. */
  required: boolean;
  /**
   * The PUBLIC_WEBSITE gate (a public build, the pre-launch corporate website, docs/96): `required` — needed before it is
   * published; `forbidden` — refused there, as the pre-launch website links to no portal, API, console or app store;
   * absent — optional, shown when given.
   */
  publicSite?: 'required' | 'forbidden';
  /** Used when the variable is blank, in every mode — only for values the owner gave in the brief. */
  fallback?: string;
  /** What a preview shows in place of a blank: always visibly a test value, never plausible. */
  preview: string;
  /** For the docs and the release message: what the value is. */
  label: string;
}

/** The only verification channel the backend implements for account deletion (docs/64; account-deletion.service.ts). */
export const DELETION_CHANNELS = ['whatsapp'] as const;

/**
 * What one build publishes (the owner's brief of 2026-10-17, docs/95):
 * - `full` — the public pages, the pages that need the API (apply, sign-in, application status) and the protected
 *   areas (`/account`, `/admin`) on one origin; the default, and what the tests run.
 * - `public` — the public pages only, for an origin of their own (`https://tsxmr.com`) while the business account and
 *   the API live elsewhere: no page, link, rewrite or line of code that needs the API or a sign-in, so `VITE_API_BASE`
 *   is not asked for. "Sign in" and "Apply" point at `VITE_PORTAL_ORIGIN` once one is given, and are absent before.
 */
export const SURFACES = ['full', 'public'] as const;

/**
 * Who operates the website (the owner's brief of 2026-10-17, third): `individual` — a natural person operating under a
 * trading or project name, with no separate company, so no legal form and no trade-register number exist; `company` —
 * an incorporated entity, which has both. TSX-MR is today an unincorporated project operated by one individual.
 */
export const OPERATOR_TYPES = ['individual', 'company'] as const;
export type OperatorType = (typeof OPERATOR_TYPES)[number];

/** The inputs that exist only for a company: an individual operator has none, and none is ever invented for one. */
export const COMPANY_ONLY_INPUTS = ['legalForm', 'registrationNumber'] as const;

/**
 * Defaults that describe the individual operator, never a company: the person's name and correspondence address. A
 * company gives its own registered name and address; it never inherits the person's.
 */
export const INDIVIDUAL_ONLY_DEFAULTS = ['legalName', 'address', 'addressAr'] as const;

/** The owner of the website, as the brief of 2026-10-17 gives it: the defaults below, never a guess. */
const OPERATOR_NAME = 'Abdel Kerim Taleb Ould Sidi';

/**
 * The correspondence address as the owner gave it (the brief "Final Legal, Identity, Portal and Website Production
 * Preparation", 2026-10-17): a district and a region, with no street number and no postal code, because none was given.
 * The country is added in the reader's language. The Arabic line is its own input, because a name is not translated
 * letter by letter.
 */
const OPERATOR_ADDRESS = 'Tevragh Zeina, Nouakchott-Ouest';
const OPERATOR_ADDRESS_AR = 'تفرغ زينة، نواكشوط الغربية';

/** The only origin the pre-launch public website may be published at (the owner's brief of 2026-10-17). */
export const PUBLIC_WEBSITE_ORIGIN = 'https://tsxmr.com';

/**
 * The release gates (docs/96), each with its own verdict:
 * - `PUBLIC_WEBSITE` — a public build: the pre-launch corporate website. Needs the real TSX-MR identity and contacts,
 *   the approved pre-launch texts and the exact origin; refuses any portal, API, console or app-store address.
 * - `PORTAL` — a full build: the business account and the console. Needs everything, the API and the service's approved
 *   texts with no legal blocker left; and, outside this repository, a running backend with its channels.
 * - `APP_STORE` — not a website build: the service texts approved, WhatsApp deletion working end to end, and every
 *   App Store gate (`gates.ts`, docs/94).
 */
export type Gate = 'PUBLIC_WEBSITE' | 'PORTAL' | 'APP_STORE';

export function gateOfSurface(surface: string): 'PUBLIC_WEBSITE' | 'PORTAL' {
  return surface === 'public' ? 'PUBLIC_WEBSITE' : 'PORTAL';
}
export type Surface = (typeof SURFACES)[number];
export type DeletionChannel = (typeof DELETION_CHANNELS)[number];

export const INPUTS = {
  publicSiteOrigin: { env: 'VITE_PUBLIC_SITE_ORIGIN', kind: 'https-origin', required: true, publicSite: 'required', preview: 'https://preview.invalid', label: 'Public website origin, e.g. https://<domain>' },
  adminSiteOrigin: { env: 'VITE_ADMIN_SITE_ORIGIN', kind: 'https-origin', required: false, publicSite: 'forbidden', preview: '', label: 'Separate Super Admin origin, if one is chosen' },
  siteSurface: { env: 'VITE_SITE_SURFACE', kind: 'surface', required: true, fallback: 'full', preview: 'full', label: 'What this build publishes: full (one origin) or public (the public pages only)' },
  apiBase: { env: 'VITE_API_BASE', kind: 'https-url', required: true, publicSite: 'forbidden', preview: '', label: 'API base URL including /api/v1, e.g. https://api.<domain>/api/v1 (not used by a public build)' },
  portalOrigin: { env: 'VITE_PORTAL_ORIGIN', kind: 'https-origin', required: false, publicSite: 'forbidden', preview: '', label: 'The business account origin when it is separate, e.g. https://dukan.<domain> (a public build links to it)' },
  displayName: { env: 'VITE_ORGANIZATION_DISPLAY_NAME', kind: 'text', required: true, publicSite: 'required', fallback: 'TSX-MR', preview: 'TSX-MR', label: 'Public trading or project name' },
  operatorType: { env: 'VITE_OPERATOR_TYPE', kind: 'operator-type', required: true, publicSite: 'required', fallback: 'individual', preview: 'individual', label: 'Who operates the website: individual (a natural person, no company) or company' },
  legalName: { env: 'VITE_ORGANIZATION_LEGAL_NAME', kind: 'text', required: true, publicSite: 'required', fallback: OPERATOR_NAME, preview: '[TEST] Legal operator name', label: 'The legal operator: the individual’s full name, or the company’s registered name' },
  publicationDirector: { env: 'VITE_PUBLICATION_DIRECTOR', kind: 'text', required: true, publicSite: 'required', fallback: OPERATOR_NAME, preview: '[TEST] Person responsible for publication', label: 'The person responsible for publication' },
  legalForm: { env: 'VITE_ORGANIZATION_LEGAL_FORM', kind: 'text', required: true, publicSite: 'required', preview: '[TEST] Legal form', label: 'Legal form (a company only)' },
  registrationNumber: { env: 'VITE_ORGANIZATION_REGISTRATION_NUMBER', kind: 'text', required: true, publicSite: 'required', preview: '[TEST] Registration number', label: 'Trade-register (RCCM) number (a company only)' },
  country: { env: 'VITE_ORGANIZATION_COUNTRY', kind: 'text', required: true, publicSite: 'required', fallback: 'Mauritania', preview: 'Mauritania', label: 'Country' },
  city: { env: 'VITE_ORGANIZATION_CITY', kind: 'text', required: true, publicSite: 'required', fallback: 'Nouakchott', preview: '[TEST] City', label: 'City' },
  address: { env: 'VITE_ORGANIZATION_ADDRESS', kind: 'text', required: true, publicSite: 'required', fallback: OPERATOR_ADDRESS, preview: '[TEST] Street address', label: 'Correspondence address in Latin script, without the country (a company: its registered address)' },
  addressAr: { env: 'VITE_ORGANIZATION_ADDRESS_AR', kind: 'text', required: false, fallback: OPERATOR_ADDRESS_AR, preview: '', label: 'The same address in Arabic, without the country (blank: the Latin address is shown)' },
  phone: { env: 'VITE_ORGANIZATION_PHONE', kind: 'phone-list', required: false, preview: '', label: 'Public telephone numbers, separated by commas' },
  contactEmail: { env: 'VITE_CONTACT_EMAIL', kind: 'email', required: false, publicSite: 'required', fallback: 'contact@tsxmr.com', preview: 'contact@preview.invalid', label: 'General enquiries email' },
  supportEmail: { env: 'VITE_SUPPORT_EMAIL', kind: 'email', required: true, publicSite: 'required', fallback: 'support@tsxmr.com', preview: 'support@preview.invalid', label: 'Support email' },
  privacyEmail: { env: 'VITE_PRIVACY_EMAIL', kind: 'email', required: true, publicSite: 'required', fallback: 'privacy@tsxmr.com', preview: 'privacy@preview.invalid', label: 'Privacy email' },
  commercialEmail: { env: 'VITE_COMMERCIAL_EMAIL', kind: 'email', required: false, preview: '', label: 'Commercial email (optional; none given)' },
  securityEmail: { env: 'VITE_SECURITY_EMAIL', kind: 'email', required: true, publicSite: 'required', fallback: 'security@tsxmr.com', preview: 'security@preview.invalid', label: 'Security contact email: the /security page and security.txt' },
  supportHours: { env: 'VITE_SUPPORT_HOURS', kind: 'text', required: true, preview: '[TEST] Support hours', label: 'When support answers, in words (days, hours and time zone), as TSX-MR commits to them' },
  supportLanguages: { env: 'VITE_SUPPORT_LANGUAGES', kind: 'text', required: true, preview: '[TEST] Support languages', label: 'The languages support answers in, in words, as TSX-MR commits to them' },
  supportResponseTime: { env: 'VITE_SUPPORT_RESPONSE_TIME', kind: 'text', required: true, preview: '[TEST] Response time', label: 'How soon support replies, in words, as TSX-MR commits to it' },
  supportWhatsapp: { env: 'VITE_SUPPORT_WHATSAPP', kind: 'phone', required: false, preview: '', label: 'Support WhatsApp number' },
  appleAppStoreUrl: { env: 'VITE_APPLE_APP_STORE_URL', kind: 'https-url', required: false, publicSite: 'forbidden', preview: '', label: 'App Store listing, once the app is published there' },
  googlePlayUrl: { env: 'VITE_GOOGLE_PLAY_URL', kind: 'https-url', required: false, publicSite: 'forbidden', preview: '', label: 'Google Play listing, once the app is published there' },
  deletionChannel: { env: 'VITE_ACCOUNT_DELETION_CHANNEL', kind: 'deletion-channel', required: true, preview: '', label: 'The deletion verification channel configured AND tested in production (whatsapp)' },
  legalEffectiveDate: { env: 'VITE_LEGAL_EFFECTIVE_DATE', kind: 'date', required: true, publicSite: 'required', preview: '', label: 'Effective date of the published privacy policy and terms (YYYY-MM-DD)' },
} as const satisfies Record<string, InputSpec>;

export type InputName = keyof typeof INPUTS;
export type SiteInputs = Record<InputName, string>;

/** Anything that reads as a test value. A production build carrying one is refused. */
const TEST_MARKERS = [/\[test\]/i, /\.invalid\b/i, /\bexample\.(com|org|net|test)\b/i, /\blocalhost\b/i, /\b127\.0\.0\.1\b/, /\btest value\b/i, /\blorem\b/i];

/**
 * A fact somebody meant to supply later — `[TO BE PROVIDED]`, `[TBD]`, `TODO`, `XXX`. Allowed in a preview, refused in
 * a production build wherever it appears: an input or a published text. Never replaced by a guess.
 */
export const PLACEHOLDER_MARKERS = [/\[\s*to be (provided|confirmed|decided)\s*\]/i, /\[\s*tbd\s*\]/i, /\btbd\b/i, /\btodo\b/i, /\bxxx\b/i, /\[\s*placeholder\s*\]/i];

export function looksLikePlaceholder(value: string): boolean {
  return PLACEHOLDER_MARKERS.some((re) => re.test(value));
}

export function looksLikeTestValue(value: string): boolean {
  return TEST_MARKERS.some((re) => re.test(value));
}

const PHONE = /^\+?[0-9][0-9 ]{6,19}$/;

/** The public telephone numbers, as configured: one or more, separated by commas, in the order given. */
export function phoneList(value: string): string[] {
  return value
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
}

function validFormat(kind: InputKind, value: string): boolean {
  switch (kind) {
    case 'https-origin':
      try {
        const u = new URL(value);
        return u.protocol === 'https:' && (u.pathname === '/' || u.pathname === '') && !u.search && !u.hash && !value.endsWith('/');
      } catch {
        return false;
      }
    case 'https-url':
      try {
        return new URL(value).protocol === 'https:';
      } catch {
        return false;
      }
    case 'email':
      return /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[a-z]{2,}$/i.test(value) && !/[\r\n]/.test(value);
    case 'phone':
      return PHONE.test(value);
    case 'phone-list':
      return phoneList(value).length > 0 && value.split(',').every((p) => PHONE.test(p.trim()));
    case 'operator-type':
      return (OPERATOR_TYPES as readonly string[]).includes(value);
    case 'date':
      return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
    case 'surface':
      return (SURFACES as readonly string[]).includes(value);
    case 'deletion-channel':
      return (DELETION_CHANNELS as readonly string[]).includes(value);
    case 'text':
      return value.length <= 300 && !/[<>\r\n]/.test(value);
  }
}

export interface ReadResult {
  inputs: SiteInputs;
  /** Inputs a preview filled with its test value (or left blank): the banner names them. */
  filled: InputName[];
}

/** The inputs as a page of this mode shows them. A test value is used only outside production. */
export function readInputs(env: Record<string, string | undefined>, mode: BuildMode): ReadResult {
  const inputs = {} as SiteInputs;
  const filled: InputName[] = [];
  for (const [name, spec] of Object.entries(INPUTS) as [InputName, InputSpec][]) {
    const given = (env[spec.env] ?? '').trim() || spec.fallback || '';
    if (!given && mode !== 'production') {
      inputs[name] = spec.preview;
      filled.push(name);
    } else {
      inputs[name] = given;
    }
  }
  // The Arabic default describes the default address only: a configured address with no Arabic line of its own is
  // shown in Latin script rather than beside a translation of an address that is no longer the operator's.
  if ((env[INPUTS.address.env] ?? '').trim() && !(env[INPUTS.addressAr.env] ?? '').trim()) inputs.addressAr = '';
  if (inputs.operatorType !== 'individual') {
    for (const name of INDIVIDUAL_ONLY_DEFAULTS) {
      const spec: InputSpec = INPUTS[name];
      if ((env[spec.env] ?? '').trim()) continue;
      inputs[name] = mode === 'production' ? '' : spec.preview;
      if (mode !== 'production' && !filled.includes(name)) filled.push(name);
    }
  }
  if (inputs.operatorType === 'individual') {
    for (const name of COMPANY_ONLY_INPUTS) {
      if (filled.includes(name)) {
        inputs[name] = '';
        filled.splice(filled.indexOf(name), 1);
      }
    }
  }
  return { inputs, filled };
}

/**
 * What an individual operator cannot settle alone before the portal sells access (the owner's brief "Final Legal,
 * Identity, Portal and Website Production Preparation"). The portal takes applications, trials and subscriptions paid to
 * TSX-MR. Dropping the company fields does not answer whether that paid activity needs the operator registered first,
 * so the PORTAL gate keeps this blocker in individual mode. Only counsel's answer, or a registration, lifts it. Company
 * mode does not carry it: there, the legal form and the RCCM number are required instead.
 */
export const OPERATOR_REGISTRATION = {
  id: 'operator_registration',
  summary:
    'TSX-MR is operated by an individual with no trade registration. Mauritanian counsel must confirm whether the paid Dukan ERP service may be sold before the operator registers (for example as an individual trader at the RCCM, with a tax identification number), and what invoices and receipts must then show. The portal stays closed until then.',
} as const;

export interface ReleaseProblem {
  input?: InputName;
  env?: string;
  problem: 'missing' | 'malformed' | 'test_value' | 'placeholder' | 'not_https' | 'legal_blocker' | 'legal_draft' | 'forbidden' | 'wrong_origin' | 'external';
  detail: string;
}

/** What the published texts still lack: documents not yet approved, and placeholder texts (docs/85). */
export interface ContentState {
  /** Legal documents still marked draft, by name. */
  drafts: readonly string[];
  /** Published texts that still carry a placeholder marker. */
  placeholders: readonly string[];
}

/**
 * Why a production build must not be published. Empty means every required input is present, well formed and real,
 * no legal blocker is left in the published texts, no legal document is still a draft and no text is a placeholder.
 */
export function releaseProblems(
  env: Record<string, string | undefined>,
  legalBlockers: readonly { id: string; summary: string }[],
  content: ContentState = { drafts: [], placeholders: [] },
): ReleaseProblem[] {
  const problems: ReleaseProblem[] = [];
  const { inputs } = readInputs(env, 'production');
  const gate = gateOfSurface(inputs.siteSurface);
  for (const [name, spec] of Object.entries(INPUTS) as [InputName, InputSpec][]) {
    const value = inputs[name];
    if (gate === 'PUBLIC_WEBSITE' && spec.publicSite === 'forbidden') {
      if (value) problems.push({ input: name, env: spec.env, problem: 'forbidden', detail: `${spec.label} — the pre-launch website links to no portal, API, console or app store (docs/96)` });
      continue;
    }
    // An individual operator has no legal form and no trade-register number: neither gate asks for them, and both
    // refuse one rather than publish a company detail that does not exist (the owner's briefs of 2026-10-17). A company
    // still needs both on both gates.
    if (inputs.operatorType === 'individual' && (COMPANY_ONLY_INPUTS as readonly string[]).includes(name)) {
      if (value) problems.push({ input: name, env: spec.env, problem: 'forbidden', detail: `${spec.label} — an individual operator has none; set VITE_OPERATOR_TYPE=company only once a company exists` });
      continue;
    }
    if (!value) {
      const required = gate === 'PORTAL' ? spec.required : spec.publicSite === 'required';
      if (required) problems.push({ input: name, env: spec.env, problem: 'missing', detail: spec.label });
      continue;
    }
    if (looksLikeTestValue(value)) {
      problems.push({ input: name, env: spec.env, problem: 'test_value', detail: spec.label });
      continue;
    }
    if (looksLikePlaceholder(value)) {
      problems.push({ input: name, env: spec.env, problem: 'placeholder', detail: spec.label });
      continue;
    }
    if (!validFormat(spec.kind, value)) {
      const httpsKind = spec.kind === 'https-origin' || spec.kind === 'https-url';
      problems.push({ input: name, env: spec.env, problem: httpsKind && value.startsWith('http:') ? 'not_https' : 'malformed', detail: spec.label });
      continue;
    }
    if (gate === 'PUBLIC_WEBSITE' && name === 'publicSiteOrigin' && value !== PUBLIC_WEBSITE_ORIGIN) {
      problems.push({ input: name, env: spec.env, problem: 'wrong_origin', detail: `the pre-launch website is published at ${PUBLIC_WEBSITE_ORIGIN} only` });
    }
  }
  if (gate === 'PORTAL' && inputs.operatorType === 'individual') problems.push({ problem: 'legal_blocker', detail: `${OPERATOR_REGISTRATION.id}: ${OPERATOR_REGISTRATION.summary}` });
  for (const b of legalBlockers) problems.push({ problem: 'legal_blocker', detail: `${b.id}: ${b.summary}` });
  for (const d of content.drafts) problems.push({ problem: 'legal_draft', detail: `${d}: still marked DRAFT — REQUIRES TSX-MR APPROVAL` });
  for (const t of content.placeholders) problems.push({ problem: 'placeholder', detail: `a published text is a placeholder: “${t.slice(0, 80)}”` });
  return problems;
}

export function formatProblems(problems: readonly ReleaseProblem[], gate?: Gate): string {
  return [
    `This website cannot be built for production yet${gate ? ` (gate ${gate})` : ''}. Nothing was published.`,
    ...problems.map((p) => `  - ${p.env ? `${p.env} ` : ''}[${p.problem}] ${p.detail}`),
    'Set the values in the hosting provider’s environment (docs/74 §3) or resolve the legal blockers (docs/74 §7); use `npm run build:preview` for a test build.',
  ].join('\n');
}
