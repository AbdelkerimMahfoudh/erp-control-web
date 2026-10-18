/**
 * What one build publishes (the owner's briefs of 2026-10-17 and 2026-10-18, docs/95, docs/101):
 * - `full` — the public pages, the pages that need the API (apply, sign-in, application status) and the protected
 *   areas (`/subscription`, `/admin`) on one origin; the default, and what the tests run.
 * - `public` — the public pages only, for an origin of their own (`https://tsxmr.com`) while the business account and
 *   the API live elsewhere: no page, link, rewrite or line of code that needs the API or a sign-in, so `VITE_API_BASE`
 *   is not asked for. "Sign in" points at `VITE_PORTAL_ORIGIN` once one is given, and is absent before.
 * - `portal` — the Dukan ERP portal alone, for `https://dukan.tsxmr.com`: the Owner's `/subscription` with its own
 *   sign-in, and the platform console at `/admin` — no public page of the company site, nothing indexed. Its legal and
 *   support pages are the company site's, linked at `VITE_PUBLIC_SITE_ORIGIN`.
 */
export const SURFACES = ['full', 'public', 'portal'] as const;

export type Surface = (typeof SURFACES)[number];

/**
 * The surface a value names; `full` for anything else — what a build that names none publishes. Its own module, with
 * no table of inputs: the page names its surface from it (`site.ts`), and the rules and preview values stay out of
 * every bundle.
 */
export function surfaceOf(value: string | undefined): Surface {
  return (SURFACES as readonly string[]).includes(value ?? '') ? (value as Surface) : 'full';
}
