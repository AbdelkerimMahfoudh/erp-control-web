/**
 * The production inputs as the page reads them (rules in `schema.ts`, docs/74 §3). `import.meta.env` is replaced at
 * build time, so a production bundle carries exactly the values its build was given — and a production build with a
 * blank required value never finishes (`vite.config.ts`). Outside production every blank shows its marked test value
 * and every page says it is a preview.
 */
import { readInputs, type BuildMode, type InputName, type SiteInputs } from './schema';

function buildMode(): BuildMode {
  const m = import.meta.env.MODE;
  return m === 'production' || m === 'development' || m === 'test' ? m : 'preview';
}

const env = import.meta.env as unknown as Record<string, string | undefined>;
const MODE = buildMode();
const read = readInputs(env, MODE);

export const SITE: Readonly<SiteInputs> = Object.freeze(read.inputs);

/** True for every build but a production one: the preview banner shows and nothing is indexed. */
export const IS_PREVIEW = MODE !== 'production';

/** The inputs this preview shows as test values. */
export const FILLED_INPUTS: readonly InputName[] = read.filled;

export const BUILD_MODE = MODE;

/** What this build publishes (`schema.ts` SURFACES, docs/95–96): `public` is the pre-launch corporate website. */
export const SURFACE: 'full' | 'public' = SITE.siteSurface === 'public' ? 'public' : 'full';
