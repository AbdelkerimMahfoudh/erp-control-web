/**
 * `client.ts` as a public build has it (`VITE_SITE_SURFACE=public`, `vite.config.ts`, docs/95–96): the pre-launch
 * website calls no API, so no address, request or credential handling reaches its bundle. `ApiError` stays, because
 * shared components name it; `request` is never reached on a public page, and says why if it ever is.
 */
export { ApiError, isUnauthorized } from './error';
export type { RequestOptions } from './error';

export async function request<T>(path: string): Promise<T> {
  throw new Error(`A public build calls no API (requested: ${path}).`);
}
