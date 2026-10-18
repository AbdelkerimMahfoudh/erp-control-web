import { ApiError, isUnauthorized, request } from '../api/client';

/**
 * The Owner's Dukan ERP portal session (0099; docs/101 §4), on the same identity as the app: the WhatsApp number or
 * email address and the password.
 *
 * The session is two HttpOnly, SameSite=Strict cookies the API sets at sign-in — no script on this page can read
 * them, and this module never sees a token. What it keeps, in memory for this visit and never in storage, is the
 * session's CSRF token: the API hands it over in the body of the sign-in, refresh and session answers, which only the
 * portal's own origin can read, and every unsafe request carries it back in `x-csrf-token`. The page asks the API who
 * is signed in and believes the answer; it never gates on what it can see locally.
 */

export { isUnauthorized };

export interface PortalSession {
  owner: { name: string };
  business: { name: string };
  csrfToken: string;
}

export interface AccountChoice {
  accountRef: string;
  companyName: string;
  userName: string;
}

export type SignInResult =
  | { status: 'signed_in'; session: PortalSession }
  | { status: 'choose_account'; continuationToken: string; expiresIn: number; accounts: AccountChoice[] };

interface RawSignIn {
  status?: string;
  session?: PortalSession;
  continuationToken?: string;
  expiresIn?: number;
  accounts?: AccountChoice[];
}

let csrfToken: string | null = null;
let refreshing: Promise<PortalSession | null> | null = null;
/** Bumped by every refresh that renewed the session: a request sent before one needs no other. */
let renewals = 0;

function keep(session: PortalSession): PortalSession {
  csrfToken = session.csrfToken;
  return session;
}

function opened(result: RawSignIn): PortalSession {
  if (result.status !== 'signed_in' || !result.session) throw new ApiError('Invalid credentials', 401, null, result);
  return keep(result.session);
}

export async function portalSignIn(identifier: string, password: string): Promise<SignInResult> {
  const result = await request<RawSignIn>('platform/portal/sign-in', { method: 'POST', body: { identifier, password } });
  if (result.status === 'choose_account' && result.continuationToken && result.accounts) {
    return { status: 'choose_account', continuationToken: result.continuationToken, expiresIn: result.expiresIn ?? 0, accounts: result.accounts };
  }
  return { status: 'signed_in', session: opened(result) };
}

/** The same contact and password at more than one business: continue as the one chosen. */
export async function portalChooseAccount(continuationToken: string, accountRef: string): Promise<PortalSession> {
  return opened(await request<RawSignIn>('platform/portal/choose-account', { method: 'POST', body: { continuationToken, accountRef } }));
}

/**
 * A new access cookie from the refresh cookie — one rotation at a time, so requests refused together share it rather
 * than spend the same refresh token twice. Null when the session is over (or no longer the Owner's).
 */
function refresh(): Promise<PortalSession | null> {
  refreshing ??= request<RawSignIn>('platform/portal/refresh', { method: 'POST' })
    .then((result) => {
      const session = opened(result);
      renewals++;
      return session;
    })
    .catch((e: unknown) => {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        csrfToken = null;
        return null;
      }
      throw e;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

/** Who is signed in, or null: the session's own route, then — the access cookie expired — one refresh. */
export async function portalSession(): Promise<PortalSession | null> {
  try {
    return keep(await request<PortalSession>('platform/portal/session'));
  } catch (e) {
    if (!isUnauthorized(e)) throw e;
  }
  return refresh();
}

/** Ends the session on the server — the cookies are cleared by its answer — and forgets the token here, whatever it says. */
export async function portalSignOut(): Promise<void> {
  csrfToken = null;
  try {
    await request('platform/portal/sign-out', { method: 'POST' });
  } catch {
    /* signed out here whatever the server says */
  }
}

/**
 * An Owner request on the portal session: the session's CSRF token on every unsafe one. An access cookie that expired
 * is refreshed once and the request sent again — a request refused for its session was refused before anything ran.
 * Requests refused together share that one refresh, and so does one whose refusal arrives after it: it is sent again
 * on the renewed session, never made to renew it a second time.
 */
export async function ownerRequest<T>(path: string, options: { method?: 'GET' | 'POST'; body?: unknown } = {}): Promise<T> {
  const send = () => request<T>(path, { ...options, headers: options.method === 'POST' && csrfToken ? { 'x-csrf-token': csrfToken } : undefined });
  const renewedBefore = renewals;
  try {
    return await send();
  } catch (e) {
    if (!isUnauthorized(e)) throw e;
    if (renewals === renewedBefore && !(await refresh())) throw e;
    return send();
  }
}
