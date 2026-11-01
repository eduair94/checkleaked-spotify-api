import { describe, it, expect, vi, afterEach } from 'vitest';
import { SpotifyHttpClient } from '../src/core';
import { SDK_VERSION } from '../src/config';
import { SpotifyApiError } from '../src/errors';
import type { FetchLike } from '../src/types/common';

const BASE = 'https://spotify81.p.rapidapi.com';

function makeClient(fetchImpl: FetchLike, overrides: Record<string, unknown> = {}) {
  return new SpotifyHttpClient({ apiKey: 'test-key', fetch: fetchImpl, retryDelayMs: 1, ...overrides });
}
function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' }, ...init });
}

describe('SpotifyHttpClient transport', () => {
  it('builds the URL + query, drops nullish, joins arrays, and injects headers', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetchMock: FetchLike = async (url, init) => {
      calls.push({ url, init: init! });
      return json({ success: true, data: { ok: 1 } });
    };
    const client = makeClient(fetchMock);
    await client.get('/search', { q: 'daft punk', limit: 10, skip: undefined, none: null, ids: ['a', 'b'] });

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(`${BASE}/search?q=daft+punk&limit=10&ids=a%2Cb`);
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers['x-rapidapi-key']).toBe('test-key');
    expect(headers['x-rapidapi-host']).toBe('spotify81.p.rapidapi.com');
    expect(headers['user-agent']).toBe(`@checkleaked/spotify-api/${SDK_VERSION}`);
  });

  it('unwraps the success envelope', async () => {
    const client = makeClient(async () => json({ success: true, data: { hello: 'world' }, metadata: { a: 1 } }));
    await expect(client.get('/x')).resolves.toEqual({ hello: 'world' });
  });

  it('wraps non-enveloped JSON bodies', async () => {
    const client = makeClient(async () => json([1, 2, 3]));
    await expect(client.get('/x')).resolves.toEqual([1, 2, 3]);
  });

  it('maps non-2xx responses to SpotifyApiError', async () => {
    const client = makeClient(async () =>
      json({ success: false, error: 'not_found', message: 'nope' }, { status: 404 }),
    );
    await expect(client.get('/x')).rejects.toMatchObject({
      name: 'SpotifyApiError',
      status: 404,
      code: 'not_found',
      message: 'nope',
    });
  });

  it('treats a 200 with success:false as an error', async () => {
    const client = makeClient(async () => json({ success: false, error: 'bad', message: 'boom' }));
    await expect(client.get('/x')).rejects.toBeInstanceOf(SpotifyApiError);
  });

  it('retries on 429 then succeeds', async () => {
    const fetchMock = vi
      .fn<FetchLike>()
      .mockResolvedValueOnce(json({ success: false }, { status: 429 }))
      .mockResolvedValueOnce(json({ success: true, data: 'ok' }));
    const client = makeClient(fetchMock);
    await expect(client.get('/x')).resolves.toBe('ok');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries on 5xx then succeeds', async () => {
    const fetchMock = vi
      .fn<FetchLike>()
      .mockResolvedValueOnce(json({}, { status: 503 }))
      .mockResolvedValueOnce(json({ success: true, data: 42 }));
    const client = makeClient(fetchMock);
    await expect(client.get('/x')).resolves.toBe(42);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry on 4xx (except 429)', async () => {
    const fetchMock = vi.fn<FetchLike>().mockResolvedValue(json({ error: 'bad' }, { status: 400 }));
    const client = makeClient(fetchMock);
    await expect(client.get('/x')).rejects.toMatchObject({ status: 400 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('gives up after exhausting retries on persistent 5xx', async () => {
    // A fresh Response per attempt, like real fetch: the transport drains each body before retrying.
    const fetchMock = vi.fn<FetchLike>().mockImplementation(async () => json({}, { status: 500 }));
    const client = makeClient(fetchMock, { retries: 2 });
    await expect(client.get('/x')).rejects.toMatchObject({ status: 500 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('times out and raises a TIMEOUT error', async () => {
    const hangFetch: FetchLike = (_url, init) =>
      new Promise((_resolve, reject) => {
        init!.signal!.addEventListener('abort', () => {
          const err = new Error('aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });
    const client = makeClient(hangFetch, { timeoutMs: 20, retries: 0 });
    await expect(client.get('/x')).rejects.toMatchObject({ code: 'TIMEOUT' });
  });

  it('propagates caller aborts as ABORTED', async () => {
    const controller = new AbortController();
    controller.abort();
    const hangFetch: FetchLike = (_url, init) =>
      new Promise((_resolve, reject) => {
        if (init!.signal!.aborted) {
          const err = new Error('aborted');
          err.name = 'AbortError';
          reject(err);
        }
      });
    const client = makeClient(hangFetch);
    await expect(client.get('/x', undefined, { signal: controller.signal })).rejects.toMatchObject({ code: 'ABORTED' });
  });

  it('sends a JSON body and content-type on POST', async () => {
    const calls: Array<RequestInit> = [];
    const fetchMock: FetchLike = async (_url, init) => {
      calls.push(init!);
      return json({ success: true, data: { created: true } });
    };
    const client = makeClient(fetchMock);
    await client.post('/webhooks/register', { url: 'https://h.test', events: ['x'] });
    expect(calls[0].method).toBe('POST');
    expect(calls[0].body).toBe(JSON.stringify({ url: 'https://h.test', events: ['x'] }));
    expect((calls[0].headers as Record<string, string>)['content-type']).toBe('application/json');
  });

  it('supports DELETE', async () => {
    const calls: Array<RequestInit> = [];
    const client = makeClient(async (_url, init) => {
      calls.push(init!);
      return json({ success: true, data: null });
    });
    await client.delete('/webhooks/abc');
    expect(calls[0].method).toBe('DELETE');
  });

  it('merges per-call extra query params over the method params', async () => {
    const urls: string[] = [];
    const client = makeClient(async (url) => {
      urls.push(url);
      return json({ success: true, data: 1 });
    });
    await client.get('/partner/track', { id: 'abc', slim: true }, { query: { cache: false, slim: false } });
    expect(urls[0]).toBe(`${BASE}/partner/track?id=abc&slim=false&cache=false`);
  });
});

describe('error contract', () => {
  const envelope = {
    success: false,
    error: 'Invalid parameter',
    message: '"ids" must be a comma-separated list of Spotify track ids.',
    code: 'INVALID_PARAMETER',
    status: 400,
    status_code: 400,
    retryable: false,
    param: 'ids',
    request_id: 'body-request-id',
  };

  it('prefers `code` over `error`, and exposes requestId, param and retryable', async () => {
    const client = makeClient(async () =>
      json(envelope, { status: 400, headers: { 'x-request-id': 'hdr-request-id' } }),
    );
    const err = await client.get('/tracks').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(SpotifyApiError);
    expect(err).toMatchObject({
      status: 400,
      code: 'INVALID_PARAMETER',
      requestId: 'hdr-request-id',
      retryable: false,
    });
    expect((err as SpotifyApiError).param).toBe('ids');
    expect((err as SpotifyApiError).message).toBe(envelope.message);
  });

  it('falls back to the body request_id when the header is absent', async () => {
    const client = makeClient(async () => json(envelope, { status: 400 }));
    await expect(client.get('/tracks')).rejects.toMatchObject({ requestId: 'body-request-id' });
  });

  it('raises on a 200 body with error: true and a code (LYRICS_NOT_AVAILABLE)', async () => {
    const client = makeClient(async () =>
      json({
        error: true,
        message: 'lyrics for this track is not available on spotify!',
        code: 'LYRICS_NOT_AVAILABLE',
      }),
    );
    await expect(client.get('/track_lyrics', { id: 'x' })).rejects.toMatchObject({
      status: 200,
      code: 'LYRICS_NOT_AVAILABLE',
      retryable: false,
    });
  });

  it('raises on a 200 body with error: true even without a code', async () => {
    const client = makeClient(async () => json({ error: true, message: 'nope' }));
    await expect(client.get('/x')).rejects.toMatchObject({ status: 200, message: 'nope' });
  });

  it('raises on a 200 body carrying only an error code', async () => {
    const client = makeClient(async () => json({ code: 'UPSTREAM_UNAVAILABLE', message: 'try later' }));
    await expect(client.get('/x')).rejects.toMatchObject({ code: 'UPSTREAM_UNAVAILABLE' });
  });

  it('returns successful payloads that carry error: false (lyrics) or success: true with a code', async () => {
    const lyrics = { error: false, syncType: 'LINE_SYNCED', lines: [{ words: 'hello' }] };
    await expect(makeClient(async () => json(lyrics)).get('/track_lyrics')).resolves.toEqual(lyrics);
    const ok = { success: true, data: { code: 'NOT_AN_ERROR' } };
    await expect(makeClient(async () => json(ok)).get('/x')).resolves.toEqual({ code: 'NOT_AN_ERROR' });
  });

  it('retries a 503 UPSTREAM_THROTTLED honoring Retry-After and exposes it on the final error', async () => {
    const throttled = { success: false, error: 'Upstream throttled', code: 'UPSTREAM_THROTTLED', retryable: true };
    const fetchMock = vi
      .fn<FetchLike>()
      .mockResolvedValueOnce(json(throttled, { status: 503, headers: { 'retry-after': '0' } }))
      .mockResolvedValueOnce(json(throttled, { status: 503, headers: { 'retry-after': '0' } }));
    const onRetry = vi.fn();
    const client = makeClient(fetchMock, { retries: 1, onRetry });
    await expect(client.get('/x')).rejects.toMatchObject({ status: 503, code: 'UPSTREAM_THROTTLED', retryAfterMs: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledWith(expect.objectContaining({ status: 503, delayMs: 0 }));
  });

  it('uses retry_after_s from the body when there is no Retry-After header', async () => {
    const client = makeClient(async () => json({ code: 'UPSTREAM_TIMEOUT', retry_after_s: 30 }, { status: 504 }), {
      retries: 0,
    });
    await expect(client.get('/x')).rejects.toMatchObject({ code: 'UPSTREAM_TIMEOUT', retryAfterMs: 30_000 });
  });

  it('does not retry an exhausted quota (QUOTA_EXCEEDED)', async () => {
    const fetchMock = vi
      .fn<FetchLike>()
      .mockResolvedValue(
        json({ success: false, code: 'QUOTA_EXCEEDED', message: 'Quota used up', retryable: true }, { status: 429 }),
      );
    const client = makeClient(fetchMock, { retries: 2 });
    await expect(client.get('/x')).rejects.toMatchObject({ status: 429, code: 'QUOTA_EXCEEDED', retryable: false });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("normalizes RapidAPI's message-only 429s and skips retrying the monthly quota one", async () => {
    const monthly = {
      message: 'You have exceeded the MONTHLY quota for Requests on your current plan, BASIC. Upgrade your plan.',
    };
    const fetchMock = vi.fn<FetchLike>().mockResolvedValue(json(monthly, { status: 429 }));
    await expect(makeClient(fetchMock, { retries: 2 }).get('/x')).rejects.toMatchObject({
      code: 'QUOTA_EXCEEDED',
      retryable: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const perSecond = {
      message: 'You have exceeded the rate limit per second for your plan, BASIC, by the API provider',
    };
    const client = makeClient(async () => json(perSecond, { status: 429 }), { retries: 0 });
    await expect(client.get('/x')).rejects.toMatchObject({ code: 'RATE_LIMITED', retryable: true });
  });
});

describe('retry waits and 504s', () => {
  const throttled = { success: false, code: 'UPSTREAM_THROTTLED', retryable: true, retry_after_s: 30 };
  const timedOut = { success: false, code: 'UPSTREAM_TIMEOUT', retryable: true };

  afterEach(() => {
    vi.useRealTimers();
  });

  it('caps a long Retry-After at 10 s by default, and still reports the wait the API asked for', async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn<FetchLike>()
      .mockImplementation(async () => json(throttled, { status: 503, headers: { 'retry-after': '30' } }));
    const onRetry = vi.fn();
    const outcome = makeClient(fetchMock, { retries: 1, onRetry })
      .get('/x')
      .catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(fetchMock).toHaveBeenCalledTimes(2); // the retry went out after 10 s, not after the 30 s asked for
    await vi.runAllTimersAsync();
    const err = await outcome;
    expect(onRetry).toHaveBeenCalledWith(expect.objectContaining({ status: 503, delayMs: 10_000 }));
    expect(err).toMatchObject({ status: 503, code: 'UPSTREAM_THROTTLED', retryAfterMs: 30_000 });
  });

  it('maxRetryDelayMs bounds every wait: Retry-After, retry_after_s and backoff', async () => {
    const onRetry = vi.fn();
    const fetchMock = vi
      .fn<FetchLike>()
      .mockResolvedValueOnce(json(throttled, { status: 503, headers: { 'retry-after': '30' } }))
      .mockResolvedValueOnce(json(throttled, { status: 503 }))
      .mockRejectedValueOnce(new TypeError('socket hang up'))
      .mockResolvedValueOnce(json({ success: true, data: 'ok' }));
    const client = makeClient(fetchMock, { retries: 3, retryDelayMs: 60_000, maxRetryDelayMs: 5, onRetry });
    await expect(client.get('/x')).resolves.toBe('ok');
    expect(onRetry.mock.calls.map(([info]) => info.delayMs)).toEqual([5, 5, 5]);
  });

  it('retries a 504 at most once by default, even with more retries left', async () => {
    const fetchMock = vi
      .fn<FetchLike>()
      .mockImplementation(async () => json(timedOut, { status: 504, headers: { 'retry-after': '0' } }));
    await expect(makeClient(fetchMock, { retries: 3 }).get('/x')).rejects.toMatchObject({
      status: 504,
      code: 'UPSTREAM_TIMEOUT',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('gatewayTimeoutRetries is configurable (0 = never retry a 504) and only limits 504s', async () => {
    const always504 = vi
      .fn<FetchLike>()
      .mockImplementation(async () => json(timedOut, { status: 504, headers: { 'retry-after': '0' } }));
    await expect(makeClient(always504, { retries: 3, gatewayTimeoutRetries: 0 }).get('/x')).rejects.toMatchObject({
      status: 504,
    });
    expect(always504).toHaveBeenCalledTimes(1);

    const mixed = vi
      .fn<FetchLike>()
      .mockResolvedValueOnce(json(timedOut, { status: 504, headers: { 'retry-after': '0' } }))
      .mockResolvedValueOnce(json(throttled, { status: 503, headers: { 'retry-after': '0' } }))
      .mockResolvedValueOnce(json({ success: true, data: 7 }));
    await expect(makeClient(mixed, { retries: 2 }).get('/x')).resolves.toBe(7);
    expect(mixed).toHaveBeenCalledTimes(3);
  });

  it('a 503 UPSTREAM_TIMEOUT (the API answer since 2026-10) counts as a timeout: retried at most once', async () => {
    const timeout503 = vi
      .fn<FetchLike>()
      .mockImplementation(async () => json(timedOut, { status: 503, headers: { 'retry-after': '0' } }));
    await expect(makeClient(timeout503, { retries: 3 }).get('/x')).rejects.toMatchObject({
      status: 503,
      code: 'UPSTREAM_TIMEOUT',
    });
    expect(timeout503).toHaveBeenCalledTimes(2);

    // Another 503 code is not a timeout: it may use every retry.
    const unavailable = vi
      .fn<FetchLike>()
      .mockImplementation(async () => json({ success: false, code: 'UPSTREAM_UNAVAILABLE', retryable: true }, { status: 503, headers: { 'retry-after': '0' } }));
    await expect(makeClient(unavailable, { retries: 3 }).get('/x')).rejects.toMatchObject({ status: 503, code: 'UPSTREAM_UNAVAILABLE' });
    expect(unavailable).toHaveBeenCalledTimes(4);
  });

  it("Cloudflare's 524 (plain text, the origin took ~100 s) counts as a timeout; a plain-text 502 is retried like any 5xx", async () => {
    const edge = (status: number) => new Response(`error code: ${status}`, { status, headers: { 'content-type': 'text/plain' } });
    const timeout524 = vi.fn<FetchLike>().mockImplementation(async () => edge(524));
    await expect(makeClient(timeout524, { retries: 3, retryDelayMs: 1, maxRetryDelayMs: 1 }).get('/x')).rejects.toMatchObject({ status: 524 });
    expect(timeout524).toHaveBeenCalledTimes(2); // gatewayTimeoutRetries (1)
    const never524 = vi.fn<FetchLike>().mockImplementation(async () => edge(524));
    await expect(makeClient(never524, { retries: 3, gatewayTimeoutRetries: 0 }).get('/x')).rejects.toMatchObject({ status: 524 });
    expect(never524).toHaveBeenCalledTimes(1);

    const badGateway = vi.fn<FetchLike>().mockImplementation(async () => edge(502));
    await expect(makeClient(badGateway, { retries: 3, retryDelayMs: 1, maxRetryDelayMs: 1 }).get('/x')).rejects.toMatchObject({ status: 502 });
    expect(badGateway).toHaveBeenCalledTimes(4); // not a timeout: every retry
  });

  it('a 503 OUTCOME_UNKNOWN is never retried: the request may already have run', async () => {
    const outcomeUnknown = vi.fn<FetchLike>().mockImplementation(async () =>
      json({ success: false, error: 'Outcome unknown', code: 'OUTCOME_UNKNOWN', status: 503, retryable: false, request_id: 'r-1' }, { status: 503 }),
    );
    await expect(makeClient(outcomeUnknown, { retries: 3, retryDelayMs: 1 }).post('/webhooks/abc/test', {})).rejects.toMatchObject({
      status: 503,
      code: 'OUTCOME_UNKNOWN',
      retryable: false,
      requestId: 'r-1',
    });
    expect(outcomeUnknown).toHaveBeenCalledTimes(1);
    // Even if a body claimed `retryable: true`, the code wins.
    const claimed = vi.fn<FetchLike>().mockImplementation(async () => json({ success: false, code: 'OUTCOME_UNKNOWN', retryable: true }, { status: 503 }));
    await expect(makeClient(claimed, { retries: 3, retryDelayMs: 1 }).get('/x')).rejects.toMatchObject({ code: 'OUTCOME_UNKNOWN', retryable: false });
    expect(claimed).toHaveBeenCalledTimes(1);
  });
});
