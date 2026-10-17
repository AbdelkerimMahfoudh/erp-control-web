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

export type InputKind = 'https-origin' | 'https-url' | 'text' | 'email' | 'phone' | 'date' | 'deletion-channel' | 'surface';

export interface InputSpec {
  /** The environment variable, `VITE_*`. */
  env: string;
  kind: InputKind;
  /** Needed before anything is published. */
  required: boolean;
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
export type Surface = (typeof SURFACES)[number];
export type DeletionChannel = (typeof DELETION_CHANNELS)[number];

export const INPUTS = {
  publicSiteOrigin: { env: 'VITE_PUBLIC_SITE_ORIGIN', kind: 'https-origin', required: true, preview: 'https://preview.invalid', label: 'Public website origin, e.g. https://<domain>' },
  adminSiteOrigin: { env: 'VITE_ADMIN_SITE_ORIGIN', kind: 'https-origin', required: false, preview: '', label: 'Separate Super Admin origin, if one is chosen' },
  siteSurface: { env: 'VITE_SITE_SURFACE', kind: 'surface', required: true, fallback: 'full', preview: 'full', label: 'What this build publishes: full (one origin) or public (the public pages only)' },
  apiBase: { env: 'VITE_API_BASE', kind: 'https-url', required: true, preview: '', label: 'API base URL including /api/v1, e.g. https://api.<domain>/api/v1 (not used by a public build)' },
  portalOrigin: { env: 'VITE_PORTAL_ORIGIN', kind: 'https-origin', required: false, preview: '', label: 'The business account origin when it is separate, e.g. https://dukan.<domain> (a public build links to it)' },
  displayName: { env: 'VITE_ORGANIZATION_DISPLAY_NAME', kind: 'text', required: true, fallback: 'TSX-MR', preview: 'TSX-MR', label: 'Public organization name' },
  legalName: { env: 'VITE_ORGANIZATION_LEGAL_NAME', kind: 'text', required: true, preview: '[TEST] Registered legal name', label: 'Full registered legal name' },
  legalForm: { env: 'VITE_ORGANIZATION_LEGAL_FORM', kind: 'text', required: true, preview: '[TEST] Legal form', label: 'Legal form' },
  registrationNumber: { env: 'VITE_ORGANIZATION_REGISTRATION_NUMBER', kind: 'text', required: true, preview: '[TEST] Registration number', label: 'Trade-register number' },
  country: { env: 'VITE_ORGANIZATION_COUNTRY', kind: 'text', required: true, fallback: 'Mauritania', preview: 'Mauritania', label: 'Country' },
  city: { env: 'VITE_ORGANIZATION_CITY', kind: 'text', required: true, preview: '[TEST] City', label: 'City' },
  address: { env: 'VITE_ORGANIZATION_ADDRESS', kind: 'text', required: true, preview: '[TEST] Street address', label: 'Registered street address' },
  phone: { env: 'VITE_ORGANIZATION_PHONE', kind: 'phone', required: false, preview: '', label: 'Public telephone number' },
  supportEmail: { env: 'VITE_SUPPORT_EMAIL', kind: 'email', required: true, preview: 'support@preview.invalid', label: 'Support email' },
  privacyEmail: { env: 'VITE_PRIVACY_EMAIL', kind: 'email', required: true, preview: 'privacy@preview.invalid', label: 'Privacy email' },
  commercialEmail: { env: 'VITE_COMMERCIAL_EMAIL', kind: 'email', required: false, preview: 'sales@preview.invalid', label: 'Commercial email' },
  securityEmail: { env: 'VITE_SECURITY_EMAIL', kind: 'email', required: true, preview: 'security@preview.invalid', label: 'Security contact email: the /security page and security.txt' },
  supportHours: { env: 'VITE_SUPPORT_HOURS', kind: 'text', required: true, preview: '[TEST] Support hours', label: 'When support answers, in words (days, hours and time zone), as TSX-MR commits to them' },
  supportLanguages: { env: 'VITE_SUPPORT_LANGUAGES', kind: 'text', required: true, preview: '[TEST] Support languages', label: 'The languages support answers in, in words, as TSX-MR commits to them' },
  supportResponseTime: { env: 'VITE_SUPPORT_RESPONSE_TIME', kind: 'text', required: true, preview: '[TEST] Response time', label: 'How soon support replies, in words, as TSX-MR commits to it' },
  supportWhatsapp: { env: 'VITE_SUPPORT_WHATSAPP', kind: 'phone', required: false, preview: '', label: 'Support WhatsApp number' },
  appleAppStoreUrl: { env: 'VITE_APPLE_APP_STORE_URL', kind: 'https-url', required: false, preview: '', label: 'App Store listing, once the app is published there' },
  googlePlayUrl: { env: 'VITE_GOOGLE_PLAY_URL', kind: 'https-url', required: false, preview: '', label: 'Google Play listing, once the app is published there' },
  deletionChannel: { env: 'VITE_ACCOUNT_DELETION_CHANNEL', kind: 'deletion-channel', required: true, preview: '', label: 'The deletion verification channel configured AND tested in production (whatsapp)' },
  legalEffectiveDate: { env: 'VITE_LEGAL_EFFECTIVE_DATE', kind: 'date', required: true, preview: '', label: 'Effective date of the published privacy policy and terms (YYYY-MM-DD)' },
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
      return /^\+?[0-9][0-9 ]{6,19}$/.test(value);
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
  return { inputs, filled };
}

export interface ReleaseProblem {
  input?: InputName;
  env?: string;
  problem: 'missing' | 'malformed' | 'test_value' | 'placeholder' | 'not_https' | 'legal_blocker' | 'legal_draft';
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
  for (const [name, spec] of Object.entries(INPUTS) as [InputName, InputSpec][]) {
    const value = inputs[name];
    if (!value) {
      // A public build reaches no API: its address is not asked for (and not used).
      if (spec.required && !(name === 'apiBase' && inputs.siteSurface === 'public')) problems.push({ input: name, env: spec.env, problem: 'missing', detail: spec.label });
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
    }
  }
  for (const b of legalBlockers) problems.push({ problem: 'legal_blocker', detail: `${b.id}: ${b.summary}` });
  for (const d of content.drafts) problems.push({ problem: 'legal_draft', detail: `${d}: still marked DRAFT — REQUIRES TSX-MR APPROVAL` });
  for (const t of content.placeholders) problems.push({ problem: 'placeholder', detail: `a published text is a placeholder: “${t.slice(0, 80)}”` });
  return problems;
}

export function formatProblems(problems: readonly ReleaseProblem[]): string {
  return [
    'This website cannot be built for production yet. Nothing was published.',
    ...problems.map((p) => `  - ${p.env ? `${p.env} ` : ''}[${p.problem}] ${p.detail}`),
    'Set the values in the hosting provider’s environment (docs/74 §3) or resolve the legal blockers (docs/74 §7); use `npm run build:preview` for a test build.',
  ].join('\n');
}
