import { request } from '../api/client';
import type { AdminIdentity } from '../api/types';

/**
 * The administrator realm. The session is an HttpOnly cookie the API sets on
 * sign-in; this module never sees the token. Whether a session exists is
 * learned by asking `admin/me` — a script cannot read the cookie, so it does
 * not try.
 */
export async function adminSignIn(email: string, password: string): Promise<AdminIdentity> {
  const result = await request<{ admin: AdminIdentity }>('platform/admin/sign-in', {
    method: 'POST',
    body: { email, password },
    admin: true,
  });
  return result.admin;
}

export function adminMe(): Promise<AdminIdentity> {
  return request<AdminIdentity>('platform/admin/me', { admin: true });
}

export async function adminSignOut(): Promise<void> {
  await request('platform/admin/sign-out', { method: 'POST', admin: true });
}

export function adminRequest<T>(path: string, options: { method?: 'GET' | 'POST'; body?: unknown } = {}): Promise<T> {
  return request<T>(path, { ...options, admin: true });
}
