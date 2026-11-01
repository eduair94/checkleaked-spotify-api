import { afterEach, describe, expect, it, vi } from 'vitest';
import { SpotifyHttpClient } from '../src/core';
import type { FetchLike } from '../src/types/common';

afterEach(() => vi.useRealTimers());

function http(fetch: FetchLike, retries = 0) {
  return new SpotifyHttpClient({ apiKey: 'test-key', fetch, timeoutMs: 20, retries, retryDelayMs: 1 });
}

/** Models fetch resolving its headers while the response body is still downloading. */
function stalled(status = 200) {
  let signal: AbortSignal | undefined;
  let stream: ReadableStreamDefaultController<Uint8Array> | undefined;
  const fetch: FetchLike = async (_url, init) => {
    signal = init!.signal!;
    return new Response(new ReadableStream<Uint8Array>({
      start(controller) {
        stream = controller;
        signal!.addEventListener('abort', () => controller.error(new Error('aborted body')), { once: true });
      },
    }), { status });
  };
  return { fetch, signal: () => signal, cleanup: () => stream?.error(new Error('test cleanup')) };
}

describe('Spotify SDK response body lifecycle', () => {
  it.each([200, 503])('times out a stalled HTTP %s body and cleans up without raw AbortErrors', async (status) => {
    vi.useFakeTimers();
    const pending = stalled(status);
    const result = http(pending.fetch).get('/x').catch((error: unknown) => error);
    try {
      await vi.advanceTimersByTimeAsync(25);
      expect(pending.signal()?.aborted).toBe(true);
      expect(await result).toMatchObject({ code: 'TIMEOUT' });
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      pending.cleanup();
      await result;
    }
  });

  it('honors caller cancellation after headers arrive without retrying', async () => {
    const pending = stalled();
    const fetch = vi.fn<FetchLike>(pending.fetch);
    const controller = new AbortController();
    const result = http(fetch, 2).get('/x', undefined, { signal: controller.signal }).catch((error: unknown) => error);
    try {
      await Promise.resolve();
      controller.abort();
      expect(pending.signal()?.aborted).toBe(true);
      expect(await result).toMatchObject({ code: 'ABORTED' });
      expect(fetch).toHaveBeenCalledTimes(1);
    } finally {
      pending.cleanup();
      await result;
    }
  });

  it('retries a body connection failure under the configured network retry budget', async () => {
    const fetch = vi.fn<FetchLike>()
      .mockImplementationOnce(async () => new Response(new ReadableStream({
        start(controller) { controller.error(new Error('socket interrupted')); },
      })))
      .mockImplementationOnce(async () => new Response(JSON.stringify({ ready: true })));
    await expect(http(fetch, 1).get('/x')).resolves.toEqual({ ready: true });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('does not replay a write whose response body was lost after headers arrived', async () => {
    const fetch = vi.fn<FetchLike>().mockImplementation(async () => new Response(new ReadableStream({
      start(controller) { controller.error(new Error('socket interrupted')); },
    })));
    await expect(http(fetch, 2).request({ path: '/x', method: 'POST', body: { value: 1 } })).rejects.toMatchObject({ code: 'NETWORK' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('clears timeout and caller listeners when the body completes', async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const controller = new AbortController();
    const fetch: FetchLike = async (_url, init) => {
      signal = init!.signal!;
      return new Response(JSON.stringify({ ready: true }));
    };
    await expect(http(fetch).get('/x', undefined, { signal: controller.signal })).resolves.toEqual({ ready: true });
    controller.abort();
    await vi.advanceTimersByTimeAsync(50);
    expect(signal?.aborted).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
});
