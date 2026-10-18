/** What the API answered when it refused, shared by the client and by a public build's stub (`client.public.ts`). */
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
  /** Administrator realm: cookie + CSRF header. */
  admin?: boolean;
  /** Headers a realm adds: the portal session's CSRF token (`auth/owner.ts`). */
  headers?: Record<string, string>;
}

/** No session, or one that ended: whichever realm asked, the page shows its sign-in. */
export function isUnauthorized(e: unknown): boolean {
  return e instanceof ApiError && e.status === 401;
}
