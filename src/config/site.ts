/**
 * The production inputs as the page reads them (rules in `schema.ts`, docs/74 §3). They are read at build time
 * (`vite.config.ts`) and inlined, so a production bundle carries exactly the values its build was given, and not the
 * rules or the preview values — and a production build with a blank required value never finishes. Outside
 * production every blank shows its marked test value and every page says it is a preview.
 */
import type { BuildMode, InputName, ReadResult, SiteInputs } from './schema';
import { surfaceOf, type Surface } from './surface';

/** Computed by `vite.config.ts` from the build's environment (`siteInputs`) and inlined. */
declare const __SITE_INPUTS__: ReadResult & { mode: BuildMode };

const read = __SITE_INPUTS__;
const MODE = read.mode;

export const SITE: Readonly<SiteInputs> = Object.freeze(read.inputs);

/** True for every build but a production one: the preview banner shows and nothing is indexed. */
export const IS_PREVIEW = MODE !== 'production';

/** The inputs this preview shows as test values. */
export const FILLED_INPUTS: readonly InputName[] = read.filled;

export const BUILD_MODE = MODE;

/**
 * What this build publishes (`schema.ts` SURFACES, docs/95–96, docs/101): `public` is the pre-launch corporate website,
 * `portal` the Dukan ERP portal.
 */
export const SURFACE: Surface = surfaceOf(SITE.siteSurface);
