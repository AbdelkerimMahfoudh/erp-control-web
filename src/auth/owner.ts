import { ApiError, request } from '../api/client';

/**
 * The Owner's tenant session: a bearer token in a module variable for the
 * length of the visit. Nothing is ever written to storage (docs/38). An Owner
 * who arrived from the app carries the portal cookie instead; the API accepts
 * either, so the page asks the API and believes the answer.
 */
let accessToken: string | null = null;

export function ownerToken(): string | null {
  return accessToken;
}

export interface AccountChoice {
  accountRef: string;
  companyName: string;
  userName: string;
}

export type LoginResult =
  | { status: 'signed_in' }
  | { status: 'choose_account'; continuationToken: string; expiresIn: number; accounts: AccountChoice[] };

interface RawLogin {
  accessToken?: string;
  status?: string;
  continuationToken?: string;
  expiresIn?: number;
  accounts?: AccountChoice[];
}

export async function ownerLogin(identifier: string, password: string): Promise<LoginResult> {
  const result = await request<RawLogin>('auth/login', { method: 'POST', body: { identifier, password } });
  if (result.status === 'choose_account' && result.continuationToken && result.accounts) {
    return { status: 'choose_account', continuationToken: result.continuationToken, expiresIn: result.expiresIn ?? 0, accounts: result.accounts };
  }
  if (!result.accessToken) throw new ApiError('Invalid credentials', 401, null, result);
  accessToken = result.accessToken;
  return { status: 'signed_in' };
}

/** The same contact at more than one business: continue as the one chosen. */
export async function ownerChooseAccount(continuationToken: string, accountRef: string): Promise<void> {
  const result = await request<RawLogin>('auth/choose-account', { method: 'POST', body: { continuationToken, accountRef } });
  if (!result.accessToken) throw new ApiError('Invalid credentials', 401, null, result);
  accessToken = result.accessToken;
}

export async function ownerLogout(): Promise<void> {
  const token = accessToken;
  accessToken = null;
  try {
    if (token) await request('auth/logout', { method: 'POST', token });
  } catch {
    /* the token is gone locally whatever the server says */
  }
  try {
    await request('platform/portal-sign-out', { method: 'POST' });
  } catch {
    /* no portal cookie: fine */
  }
}

/** Owner-realm request: the bearer token when there is one, the portal cookie always. */
export function ownerRequest<T>(path: string, options: { method?: 'GET' | 'POST'; body?: unknown } = {}): Promise<T> {
  return request<T>(path, { ...options, token: accessToken });
}

export function isUnauthorized(e: unknown): boolean {
  return e instanceof ApiError && e.status === 401;
}
