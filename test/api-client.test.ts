import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, request } from '../src/api/client';

/** An answer whose status arrived and whose body was cut off on its way. */
const cutOff = (status: number) =>
  new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"statusCode":'));
        controller.error(new TypeError('network error'));
      },
    }),
    { status, headers: { 'Content-Type': 'application/json' } },
  );

/*
 * What every page learns from an answer whose body never came. A success whose body is lost got no answer the page can
 * use — the server did what was asked, and what it said is gone — so it is told exactly as a request the network
 * dropped (status 0), which a caller treats as an outcome it cannot know. A refusal keeps the status it came with.
 */
describe('request(): an answer whose body was cut off on its way', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('a success whose body never came is a request that got no answer — never a refusal', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => cutOff(200)));
    const error = await request('platform/register/verify/confirm', { method: 'POST', body: { code: '123456' } }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 0, code: 'network' });
  });

  it.each([400, 409, 429, 500])('a refusal whose body never came is still the answer its status says (%i)', async (status) => {
    vi.stubGlobal('fetch', vi.fn(async () => cutOff(status)));
    const error = await request('platform/my-subscription').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status, code: null, message: `Request failed (${status})` });
  });
});
