import { describe, it, expect, vi, afterEach } from 'vitest';
import { createClient, normalizeId, normalizeIds, paginate, collect } from '../src/index';
import type { FetchLike } from '../src/types/common';

const BASE = 'https://spotify81.p.rapidapi.com';

function capture() {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetchMock: FetchLike = async (url, init) => {
    calls.push({ url, init: init! });
    return new Response(JSON.stringify({ success: true, data: { ok: 1 } }), {
      headers: { 'content-type': 'application/json' },
    });
  };
  return { calls, fetchMock };
}

describe('normalizeId / normalizeIds', () => {
  it('reduces URIs and URLs to bare IDs, passing unknown through', () => {
    expect(normalizeId('4tZwfgrHOc3mvqYlEYSvVi')).toBe('4tZwfgrHOc3mvqYlEYSvVi');
    expect(normalizeId('spotify:artist:4tZwfgrHOc3mvqYlEYSvVi')).toBe('4tZwfgrHOc3mvqYlEYSvVi');
    expect(normalizeId('https://open.spotify.com/artist/4tZwfgrHOc3mvqYlEYSvVi?si=x')).toBe('4tZwfgrHOc3mvqYlEYSvVi');
    expect(normalizeId('https://open.spotify.com/intl-es/track/0DiWol3AO6WpXZgp0goxAV')).toBe('0DiWol3AO6WpXZgp0goxAV');
    expect(normalizeId('toplists')).toBe('toplists');
  });

  it('normalizes comma strings and arrays', () => {
    expect(normalizeIds('a,b,c')).toBe('a,b,c');
    expect(normalizeIds(['a', 'spotify:track:b', 'c'])).toBe('a,b,c');
    expect(normalizeIds('spotify:artist:x, spotify:artist:y')).toBe('x,y');
  });
});

describe('automatic id normalization in requests', () => {
  it('normalizes a single `id` URI in the query string', async () => {
    const { calls, fetchMock } = capture();
    const client = createClient({ apiKey: 'k', fetch: fetchMock });
    await client.artists.overview({ id: 'spotify:artist:06HL4z0CvFAxyc27GXpf02' });
    expect(calls[0].url).toBe(`${BASE}/artist_overview?id=06HL4z0CvFAxyc27GXpf02`);
  });

  it('accepts an array for `ids` and joins normalized', async () => {
    const { calls, fetchMock } = capture();
    const client = createClient({ apiKey: 'k', fetch: fetchMock });
    await client.artists.get({ ids: ['spotify:artist:a', 'b'] });
    expect(calls[0].url).toBe(`${BASE}/artists?ids=a%2Cb`);
  });

  it('normalizes a path-param id URL', async () => {
    const { calls, fetchMock } = capture();
    const client = createClient({ apiKey: 'k', fetch: fetchMock });
    await client.shows.getById({ id: 'https://open.spotify.com/show/5CfCWKI5pZ28U0uOzXkDHe' });
    expect(calls[0].url).toContain('/shows/5CfCWKI5pZ28U0uOzXkDHe');
  });
});

describe('env-var apiKey fallback', () => {
  const original = process.env.SPOTIFY_API_KEY;
  afterEach(() => {
    if (original === undefined) delete process.env.SPOTIFY_API_KEY;
    else process.env.SPOTIFY_API_KEY = original;
  });

  it('uses SPOTIFY_API_KEY when no apiKey is passed', async () => {
    process.env.SPOTIFY_API_KEY = 'env-key-123';
    const { calls, fetchMock } = capture();
    const client = createClient({ fetch: fetchMock });
    await client.markets.get();
    expect((calls[0].init.headers as Record<string, string>)['x-rapidapi-key']).toBe('env-key-123');
  });
});

describe('lifecycle hooks', () => {
  it('fires onRequest and onResponse', async () => {
    const { fetchMock } = capture();
    const onRequest = vi.fn();
    const onResponse = vi.fn();
    const client = createClient({ apiKey: 'k', fetch: fetchMock, onRequest, onResponse });
    await client.search.search({ q: 'x' });
    expect(onRequest).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'GET', url: expect.stringContaining('/search') }),
    );
    expect(onResponse).toHaveBeenCalledWith(expect.objectContaining({ status: 200 }));
  });
});

describe('pagination', () => {
  const pages: Record<number, number[]> = { 0: [1, 2, 3], 3: [4, 5] };
  const fetcher = async ({ offset }: { offset: number; limit: number }) => pages[offset] ?? [];

  it('collect() flattens across pages until a short page', async () => {
    const all = await collect(fetcher, { limit: 3, getItems: (p) => p as number[] });
    expect(all).toEqual([1, 2, 3, 4, 5]);
  });

  it('paginate() yields each page', async () => {
    const seen: number[][] = [];
    for await (const page of paginate(fetcher, { limit: 3, getItems: (p) => p as number[] })) {
      seen.push(page as number[]);
    }
    expect(seen).toEqual([
      [1, 2, 3],
      [4, 5],
    ]);
  });
});
