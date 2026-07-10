import { describe, it, expect, vi } from 'vitest';
import { SpotifyHttpClient } from '../src/core';
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
    expect(headers['user-agent']).toBe('@checkleaked/spotify-api');
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
    const fetchMock = vi.fn<FetchLike>().mockResolvedValue(json({}, { status: 500 }));
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
});
