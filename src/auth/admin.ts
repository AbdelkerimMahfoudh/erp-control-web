import { request } from '../api/client';
import type { AdminIdentity } from '../api/types';

/**
 * The administrator realm. The session is an HttpOnly cookie the API sets on
 * sign-in; this module never sees the token. Whether a session exists is
 * learned by asking `admin/me` — a script cannot read the cookie, so it does
 * not try.
 *
 * Since 0094 a password opens a PENDING session: it reaches nothing until a
 * code from the administrator's authenticator verifies it — or, with no
 * authenticator enrolled yet, until it is enrolled with the one-time token
 * issued on the server. No secret, code or token is kept by this module.
 */
export type AdminMfaState = 'required' | 'enrolment_required';

export async function adminSignIn(email: string, password: string): Promise<{ admin: AdminIdentity; mfa: AdminMfaState }> {
  const result = await request<{ admin: AdminIdentity; mfa?: AdminMfaState }>('platform/admin/sign-in', {
    method: 'POST',
    body: { email, password },
    admin: true,
  });
  // An older API said nothing: the session is then treated as needing a code, never as complete.
  return { admin: result.admin, mfa: result.mfa ?? 'required' };
}

/** A code from the authenticator, or one recovery code: completes the pending session. */
export async function adminVerify(input: { code: string } | { recoveryCode: string }): Promise<void> {
  await request('platform/admin/mfa/verify', { method: 'POST', body: input, admin: true });
}

/** The server's one-time token → the key to put into the authenticator (shown once, never stored here). */
export function adminEnrolStart(enrolmentToken: string): Promise<{ secret: string; otpauthUri: string }> {
  return request('platform/admin/mfa/enrolment/start', { method: 'POST', body: { enrolmentToken }, admin: true });
}

/** The authenticator's first code: the factor counts from now; the recovery codes come back once. */
export function adminEnrolConfirm(code: string): Promise<{ recoveryCodes: string[] }> {
  return request('platform/admin/mfa/enrolment/confirm', { method: 'POST', body: { code }, admin: true });
}

/** Step-up: the password and a fresh code, recorded on this session for five minutes. */
export function adminStepUp(password: string, code: string): Promise<{ expiresAt: string }> {
  return request('platform/admin/step-up', { method: 'POST', body: { password, code }, admin: true });
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
