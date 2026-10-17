/**
 * `PlanPricing.tsx` as a public build has it (`vite.config.ts`, docs/96): the pre-launch website shows no price and
 * loads none, so the price table and its request are not in its bundle.
 */
export function PlanPricing() {
  return null;
}
