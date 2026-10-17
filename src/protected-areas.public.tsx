/**
 * `protected-areas.tsx` as a public build has it (`VITE_SITE_SURFACE=public`, `vite.config.ts`): no business account,
 * no console — their addresses are unknown pages on this origin. Nothing here imports either area.
 */
export const PROTECTED_AREAS_BUILT = false;

export function ProtectedRoutes() {
  return null;
}
