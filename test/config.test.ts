import { describe, it, expect } from 'vitest';
import { resolveConfig, PROVIDERS } from '../src/config';
import { SpotifyApiError } from '../src/errors';

const noopFetch = async () => new Response('{}');

describe('resolveConfig', () => {
  it('defaults to the rapidapi provider (base + host)', () => {
    const cfg = resolveConfig({ apiKey: 'k', fetch: noopFetch });
    expect(cfg.baseUrl).toBe(PROVIDERS.rapidapi.baseUrl);
    expect(cfg.host).toBe('spotify81.p.rapidapi.com');
    expect(cfg.timeoutMs).toBe(30_000);
    expect(cfg.retries).toBe(2);
  });

  it('supports the proxy provider (no host)', () => {
    const cfg = resolveConfig({ apiKey: 'k', provider: 'proxy', fetch: noopFetch });
    expect(cfg.baseUrl).toBe('https://spotify-proxy.checkleaked.cc/spotify-data');
    expect(cfg.host).toBeUndefined();
  });

  it('honors explicit baseUrl/host overrides and trims trailing slashes', () => {
    const cfg = resolveConfig({ apiKey: 'k', baseUrl: 'https://x.test/api/', host: 'h.test', fetch: noopFetch });
    expect(cfg.baseUrl).toBe('https://x.test/api');
    expect(cfg.host).toBe('h.test');
  });

  it('throws without an apiKey', () => {
    expect(() => resolveConfig({ apiKey: '' as unknown as string, fetch: noopFetch })).toThrow(SpotifyApiError);
  });

  it('throws for an unknown provider', () => {
    expect(() => resolveConfig({ apiKey: 'k', provider: 'nope' as unknown as 'rapidapi', fetch: noopFetch })).toThrow(
      SpotifyApiError,
    );
  });
});
