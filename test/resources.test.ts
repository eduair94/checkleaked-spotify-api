import { describe, it, expect } from 'vitest';
import { createClient, SpotifyApiClient } from '../src/index';
import type { FetchLike } from '../src/types/common';

const BASE = 'https://spotify81.p.rapidapi.com';

function capturingClient() {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetchMock: FetchLike = async (url, init) => {
    calls.push({ url, init: init! });
    return new Response(JSON.stringify({ success: true, data: { ok: true } }), {
      headers: { 'content-type': 'application/json' },
    });
  };
  return { client: createClient({ apiKey: 'k', fetch: fetchMock }), calls };
}

describe('resource namespaces', () => {
  it('exposes all 25 namespaces on the client', () => {
    const { client } = capturingClient();
    const namespaces = [
      'search',
      'albums',
      'artists',
      'tracks',
      'batch',
      'analysis',
      'lookups',
      'playlists',
      'snapshots',
      'users',
      'charts',
      'downloads',
      'browse',
      'audiobooks',
      'shows',
      'episodes',
      'markets',
      'partner',
      'concerts',
      'webhooks',
      'cache',
      'tracking',
      'ai',
      'health',
      'credentials',
    ] as const;
    for (const ns of namespaces) {
      expect(client[ns], `missing namespace ${ns}`).toBeDefined();
    }
    expect(client).toBeInstanceOf(SpotifyApiClient);
  });

  it('builds a simple query request', async () => {
    const { client, calls } = capturingClient();
    await client.search.search({ q: 'daft punk', limit: 5 });
    expect(calls[0].url).toBe(`${BASE}/search?q=daft+punk&limit=5`);
  });

  it('serializes comma-separated id lists', async () => {
    const { client, calls } = capturingClient();
    await client.artists.get({ ids: 'a,b' });
    expect(calls[0].url).toBe(`${BASE}/artists?ids=a%2Cb`);
  });

  it('interpolates path params and keeps them out of the query string', async () => {
    const { client, calls } = capturingClient();
    await client.browse.category({ id: 'dinner', country: 'US' });
    expect(calls[0].url).toBe(`${BASE}/browse/categories/dinner?country=US`);
    expect(calls[0].url).not.toContain('id=');
  });

  it('URL-encodes path params', async () => {
    const { client, calls } = capturingClient();
    await client.browse.category({ id: 'a/b c' });
    expect(calls[0].url).toBe(`${BASE}/browse/categories/a%2Fb%20c`);
  });
});
