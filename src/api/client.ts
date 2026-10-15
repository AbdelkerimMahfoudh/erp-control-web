/**
 * One HTTP client for both realms (docs/38, docs/68).
 *
 *  - **Owner (tenant)**: a bearer token held in a module variable for the visit —
 *    never in storage. The API also accepts the portal session cookie set by the
 *    app's handoff, so requests are sent with credentials too and the API decides.
 *  - **Administrator**: an HttpOnly cookie the browser attaches itself; no script
 *    can read it. Mutations carry `x-requested-with`, which a browser will not
 *    attach cross-origin without a CORS grant the API does not give.
 *
 * Nothing here computes a price. Every figure on every page is rendered from a
 * server response.
 */

const configured = (import.meta.env.VITE_API_BASE as string | undefined)?.trim().replace(/\/+$/, '');

export function apiBase(): string {
  if (configured) return configured;
  if (typeof window === 'undefined') return 'http://127.0.0.1:3010/api/v1';
  return `${window.location.protocol}//${window.location.hostname}:3010/api/v1`;
}

export class ApiError extends Error {
  status: number;
  code: string | null;
  body: unknown;
  constructor(message: string, status: number, code: string | null, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  token?: string | null;
  /** Administrator realm: cookie + CSRF header. */
  admin?: boolean;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.admin && method !== 'GET') headers['x-requested-with'] = 'erp-control-web';

  let res: Response;
  try {
    res = await fetch(`${apiBase()}/${path.replace(/^\/+/, '')}`, {
      method,
      headers,
      credentials: 'include',
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError('network', 0, 'network', null);
  }

  // The status arrived but the body was cut off on its way. A success whose body never came is a request that got no
  // answer: the server did what was asked, and what it answered (a session, a record) is lost, so a caller must treat
  // it as one whose outcome is unknown, never as a refusal. A refusal stays the refusal its status says, as when its
  // body is not JSON.
  let text = '';
  try {
    text = await res.text();
  } catch {
    if (res.ok) throw new ApiError('network', 0, 'network', null);
  }
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }
  if (!res.ok) {
    const p = payload as { message?: unknown; error?: unknown; code?: unknown } | null;
    const raw = p?.message ?? p?.error ?? `Request failed (${res.status})`;
    const message = Array.isArray(raw) ? raw.join(', ') : String(raw);
    throw new ApiError(message, res.status, typeof p?.code === 'string' ? p.code : null, payload);
  }
  return payload as T;
}
