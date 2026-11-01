import { describe, it, expect } from 'vitest';
import { createClient, SpotifyApiClient } from '../src/index';
import type { FetchLike } from '../src/types/common';

const BASE = 'https://spotify81.p.rapidapi.com';

function capturingClient(body: unknown = { success: true, data: { ok: true } }) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetchMock: FetchLike = async (url, init) => {
    calls.push({ url, init: init! });
    return new Response(JSON.stringify(body), {
      headers: { 'content-type': 'application/json' },
    });
  };
  return { client: createClient({ apiKey: 'k', fetch: fetchMock }), calls };
}

describe('resource namespaces', () => {
  it('exposes all 23 public namespaces on the client', () => {
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
      'tracking',
      'ai',
      'health',
    ] as const;
    for (const ns of namespaces) {
      expect(client[ns], `missing namespace ${ns}`).toBeDefined();
    }
    expect(client).toBeInstanceOf(SpotifyApiClient);
  });

  it('no longer exposes the operator-only admin methods', () => {
    const { client } = capturingClient();
    const loose = client as unknown as Record<string, unknown>;
    expect(loose.cache).toBeUndefined();
    expect(loose.credentials).toBeUndefined();
    const health = client.health as unknown as Record<string, unknown>;
    for (const name of ['proxies', 'clearProxies', 'clearErrors']) {
      expect(health[name], `health.${name} should be gone`).toBeUndefined();
    }
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

  it('sends audio feature track IDs through the required ids parameter', async () => {
    const { client, calls } = capturingClient();
    await client.analysis.audioFeatures({ ids: ['track-a', 'track-b'] });
    expect(calls[0].url).toBe(`${BASE}/audio_features?ids=track-a%2Ctrack-b`);
    expect(calls[0].url).not.toContain('?id=');
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

describe('2.0.0 endpoints and parameters', () => {
  const status = {
    status: 'operational',
    updatedAt: '2026-10-13T12:00:00.000Z',
    version: 'abc1234',
    statusPage: 'https://stats.uptimerobot.com/y2392u6LY0',
    components: [{ id: 'play_counts', name: 'Play counts', status: 'operational' }],
  };

  it('status() and health.status() call GET /status', async () => {
    const { client, calls } = capturingClient(status);
    await expect(client.status()).resolves.toEqual(status);
    await expect(client.health.status()).resolves.toEqual(status);
    expect(calls.map((c) => c.url)).toEqual([`${BASE}/status`, `${BASE}/status`]);
  });

  it('tracks.counts() batches play counts through /partner/tracks/count', async () => {
    const body = {
      tracks: [
        { id: '0VjIjW4GlUZAMYd2vXMi3b', name: 'Blinding Lights', artists: [], playcount: 5631276067, status: 'ok' },
      ],
      missing: [],
    };
    const { client, calls } = capturingClient(body);
    const result = await client.tracks.counts({
      ids: ['spotify:track:0VjIjW4GlUZAMYd2vXMi3b', 'https://open.spotify.com/track/7ouMYWpwJ422jRcDASZB7P'],
    });
    expect(result).toEqual(body);
    expect(calls[0].url).toBe(`${BASE}/partner/tracks/count?ids=0VjIjW4GlUZAMYd2vXMi3b%2C7ouMYWpwJ422jRcDASZB7P`);
  });

  it('tracks.insights() batches genres / moods / BPM / credits through /track_insights', async () => {
    const body = {
      tracks: [
        {
          id: '0VjIjW4GlUZAMYd2vXMi3b',
          status: 'ok',
          name: 'Blinding Lights',
          bpm: 171,
          genres: [{ name: 'pop', display_name: 'Pop', weight: 0.9169 }],
          moods: [{ name: 'upbeat', display_name: 'Upbeat', weight: 0.7404 }],
          credits: [{ name: 'Max Martin', role: 'Producer', artist_id: '1rjeVTt9Ra1ldvN7SpeK0G' }],
        },
      ],
      missing: [],
      unavailable: [],
    };
    const { client, calls } = capturingClient(body);
    const result = await client.tracks.insights({
      ids: ['spotify:track:0VjIjW4GlUZAMYd2vXMi3b', 'https://open.spotify.com/track/7qiZfU4dY1lWllzX7mPBI3'],
    });
    expect(result).toEqual(body);
    expect(calls[0].url).toBe(`${BASE}/track_insights?ids=0VjIjW4GlUZAMYd2vXMi3b%2C7qiZfU4dY1lWllzX7mPBI3`);
  });

  it('include= on tracks.get / albums.get / artists.get is sent comma-joined', async () => {
    const { client, calls } = capturingClient({ tracks: [], albums: [], artists: [] });
    await client.tracks.get({ ids: ['0VjIjW4GlUZAMYd2vXMi3b'], include: ['insights', 'playcount'] });
    await client.albums.get({ ids: '4yP0hdKOZPNshxUOjY0cZj', include: 'playcounts' });
    await client.artists.get({ ids: ['3TVXtAsR1Inumwj472S9r4'], include: ['stats', 'insights'] });
    expect(calls.map((c) => c.url)).toEqual([
      `${BASE}/tracks?ids=0VjIjW4GlUZAMYd2vXMi3b&include=insights%2Cplaycount`,
      `${BASE}/albums?ids=4yP0hdKOZPNshxUOjY0cZj&include=playcounts`,
      `${BASE}/artists?ids=3TVXtAsR1Inumwj472S9r4&include=stats%2Cinsights`,
    ]);
  });

  it('include= on playlists.tracks and tracks.recommendations', async () => {
    const { client, calls } = capturingClient({ items: [], tracks: [] });
    await client.playlists.tracks({ id: '37i9dQZF1DXcBWIGoYBM5M', limit: 50, include: ['playcount', 'insights'] });
    await client.tracks.recommendations({ seed_tracks: '4iV5W9uYEdYUVa79Axb7Rh', include: 'playcount' });
    expect(calls.map((c) => c.url)).toEqual([
      `${BASE}/playlist_tracks?id=37i9dQZF1DXcBWIGoYBM5M&limit=50&include=playcount%2Cinsights`,
      `${BASE}/recommendations?seed_tracks=4iV5W9uYEdYUVa79Axb7Rh&include=playcount`,
    ]);
  });

  it('include= on charts.top200Tracks and charts.viralTracks', async () => {
    const { client, calls } = capturingClient([]);
    await client.charts.top200Tracks({ country: 'us', include: 'insights' });
    await client.charts.viralTracks({ country: 'global', include: ['insights', 'playcount'] });
    expect(calls.map((c) => c.url)).toEqual([`${BASE}/top_200_tracks?country=us&include=insights`, `${BASE}/viral_tracks?country=global&include=insights%2Cplaycount`]);
  });

  it('include= on artists.overview', async () => {
    const { client, calls } = capturingClient({ data: { artistUnion: {} } });
    await client.artists.overview({ id: '1Xyo4u8uXC1ZmMpatF05PJ', slim: true, include: 'insights' });
    expect(calls[0].url).toBe(`${BASE}/artist_overview?id=1Xyo4u8uXC1ZmMpatF05PJ&slim=true&include=insights`);
  });

  it('include= on search.search', async () => {
    const { client, calls } = capturingClient({ tracks: [] });
    await client.search.search({ q: 'blinding lights', type: 'tracks', include: ['playcount', 'insights'] });
    expect(calls[0].url).toBe(`${BASE}/search?q=blinding+lights&type=tracks&include=playcount%2Cinsights`);
  });

  it('artists.insights() calls GET /artist_insights with normalized ids', async () => {
    const body = { artists: [{ id: '3TVXtAsR1Inumwj472S9r4', status: 'ok', genres: [{ name: 'hip hop', display_name: 'Hip Hop', weight: 0.83, tracks: 10 }] }], missing: [], unavailable: [] };
    const { client, calls } = capturingClient(body);
    await expect(client.artists.insights({ ids: ['spotify:artist:3TVXtAsR1Inumwj472S9r4'] })).resolves.toEqual(body);
    expect(calls[0].url).toBe(`${BASE}/artist_insights?ids=3TVXtAsR1Inumwj472S9r4`);
  });

  it('tracks.getById() calls GET /tracks/{id} with an optional market', async () => {
    const { client, calls } = capturingClient({ id: '4cOdK2wGLETKBW3PvgPWqT' });
    await client.tracks.getById({ id: 'spotify:track:4cOdK2wGLETKBW3PvgPWqT', market: 'US' });
    expect(calls[0].url).toBe(`${BASE}/tracks/4cOdK2wGLETKBW3PvgPWqT?market=US`);
  });

  it('batch catalog calls return the missing (not found) and unavailable (retry later) ids', async () => {
    const body = {
      tracks: [{ id: '4cOdK2wGLETKBW3PvgPWqT' }],
      missing: ['0000000000000000000000'],
      unavailable: ['0VjIjW4GlUZAMYd2vXMi3b'],
    };
    const { client } = capturingClient(body);
    const { tracks, missing, unavailable } = await client.tracks.get({ ids: ['4cOdK2wGLETKBW3PvgPWqT'] });
    expect(tracks).toHaveLength(1);
    expect(missing).toEqual(['0000000000000000000000']);
    expect(unavailable).toEqual(['0VjIjW4GlUZAMYd2vXMi3b']);
    const albums = await capturingClient({ albums: [], unavailable: ['x'] }).client.albums.get({ ids: 'x' });
    expect(albums.unavailable).toEqual(['x']);
    const artists = await capturingClient({ artists: [], missing: ['y'] }).client.artists.get({ ids: 'y' });
    expect(artists.missing).toEqual(['y']);
  });

  it('forwards market on albums, artists and playlists', async () => {
    const { client, calls } = capturingClient();
    await client.albums.get({ ids: ['a'], market: 'GB' });
    await client.artists.get({ ids: 'b', market: 'GB' });
    await client.playlists.tracks({ id: 'p', limit: 50, market: 'GB' });
    expect(calls.map((c) => c.url)).toEqual([
      `${BASE}/albums?ids=a&market=GB`,
      `${BASE}/artists?ids=b&market=GB`,
      `${BASE}/playlist_tracks?id=p&limit=50&market=GB`,
    ]);
  });

  it('sends slim on the heavy partner and overview endpoints', async () => {
    const { client, calls } = capturingClient();
    await client.partner.track({ id: 't', slim: true });
    await client.artists.overview({ id: 'a', slim: true });
    await client.partner.artistOverview({ id: 'a', slim: true });
    expect(calls.map((c) => c.url)).toEqual([
      `${BASE}/partner/track?id=t&slim=true`,
      `${BASE}/artist_overview?id=a&slim=true`,
      `${BASE}/partner/artist-overview?id=a&slim=true`,
    ]);
  });

  it('tracking.track() posts spotifyId / spotifyType / label', async () => {
    const { client, calls } = capturingClient();
    await client.tracking.track({ spotifyId: '4cOdK2wGLETKBW3PvgPWqT', spotifyType: 'track', label: 'single' });
    expect(calls[0].url).toBe(`${BASE}/tracking/track`);
    expect(calls[0].init.method).toBe('POST');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({
      spotifyId: '4cOdK2wGLETKBW3PvgPWqT',
      spotifyType: 'track',
      label: 'single',
    });
  });

  it('tracking.untrack() and tracking.logs() use the server parameter names', async () => {
    const { client, calls } = capturingClient();
    await client.tracking.untrack({ spotifyId: '4cOdK2wGLETKBW3PvgPWqT', spotifyType: 'track' });
    await client.tracking.logs({
      spotifyType: 'artist',
      changeType: 'followers_change',
      since: '2026-10-01',
      limit: 20,
    });
    expect(calls[0].init.method).toBe('DELETE');
    expect(calls[0].url).toBe(`${BASE}/tracking/untrack?spotifyId=4cOdK2wGLETKBW3PvgPWqT&spotifyType=track`);
    expect(calls[1].url).toBe(
      `${BASE}/tracking/logs?spotifyType=artist&changeType=followers_change&since=2026-10-01&limit=20`,
    );
  });

  it('webhooks.register() sends the playlistId / callbackUrl body the API expects', async () => {
    const { client, calls } = capturingClient();
    await client.webhooks.register({
      playlistId: '37i9dQZF1DXcBWIGoYBM5M',
      callbackUrl: 'https://example.test/hook',
      events: ['playlist.tracks.added'],
    });
    expect(calls[0].url).toBe(`${BASE}/webhooks/register`);
    expect(JSON.parse(calls[0].init.body as string)).toEqual({
      playlistId: '37i9dQZF1DXcBWIGoYBM5M',
      callbackUrl: 'https://example.test/hook',
      events: ['playlist.tracks.added'],
    });
  });

  it('charts accept date on every Spotify chart and city on the top 200', async () => {
    const { client, calls } = capturingClient();
    await client.charts.top200Tracks({ country: 'us', city: 'saopaulo', date: '2026-10-01' });
    await client.charts.viralTracks({ country: 'gb', date: '2026-10-01' });
    expect(calls[0].url).toBe(`${BASE}/top_200_tracks?country=us&date=2026-10-01&city=saopaulo`);
    expect(calls[1].url).toBe(`${BASE}/viral_tracks?country=gb&date=2026-10-01`);
  });

  it('per-call options.query adds parameters such as cache=false', async () => {
    const { client, calls } = capturingClient({ result: 'success', streams: 1 });
    await client.partner.trackCount({ spotify_track_id: '4cOdK2wGLETKBW3PvgPWqT' }, { query: { cache: false } });
    expect(calls[0].url).toBe(`${BASE}/partner/track/count?spotify_track_id=4cOdK2wGLETKBW3PvgPWqT&cache=false`);
  });
});
