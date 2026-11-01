# @checkleaked/spotify-api

Zero-dependency, fully-typed TypeScript SDK for the **Spotify Data API** — 108 typed methods across 23 namespaces covering play counts, artists, tracks, albums, lyrics, playlists, charts, browse, podcasts, concerts, tracking, webhooks and AI analysis.

- 🟢 **Zero runtime dependencies** — built on native `fetch`.
- 🌐 Runs on **Node 18+, Deno, Bun, edge runtimes and the browser**.
- 📦 Ships **ESM + CJS** with complete `.d.ts` types.
- 🆔 Pass a Spotify **ID, URI (`spotify:…`) or URL** anywhere an id is expected — and **arrays** for multi-id endpoints.
- 🔁 Built-in **timeouts, retries with backoff** (honors `Retry-After` up to a configurable cap, skips errors waiting cannot fix), **lifecycle hooks** and **uniform error handling** with error codes and request ids.
- 📄 **Pagination helpers** for every `offset`/`limit` endpoint.
- 🔌 **RapidAPI-compatible** out of the box (`spotify81.p.rapidapi.com`), with a `proxy` preset for direct keys.

**Links:** [API reference](https://spotify-proxy.checkleaked.cc/docs) · [Status page](https://stats.uptimerobot.com/y2392u6LY0) · [RapidAPI listing](https://rapidapi.com/airaudoeduardo/api/spotify81) · [Changelog](./CHANGELOG.md) · Support: admin@checkleaked.cc

## Install

```bash
npm install @checkleaked/spotify-api
```

## Quick start

```ts
import { createClient } from '@checkleaked/spotify-api';

const spotify = createClient({ apiKey: process.env.RAPIDAPI_KEY! });
// …or just `createClient()` and set SPOTIFY_API_KEY / RAPIDAPI_KEY in the env.

// Play counts — up to 50 tracks per call
const { tracks: counts, missing } = await spotify.tracks.counts({
  ids: ['0VjIjW4GlUZAMYd2vXMi3b', 'spotify:track:7ouMYWpwJ422jRcDASZB7P'],
});

// Artists — id, URI, or URL all work. `slim` drops the heavy blocks (stats are kept).
const artist = await spotify.artists.overview({ id: 'spotify:artist:4tZwfgrHOc3mvqYlEYSvVi', slim: true });
const top = await spotify.artists.topTracks({ id: '4tZwfgrHOc3mvqYlEYSvVi', market: 'US' });

// Tracks & lyrics — pass an array of ids
const tracks = await spotify.tracks.get({ ids: ['0DiWol3AO6WpXZgp0goxAV', '7ouMYWpwJ422jRcDASZB7P'] });
const lyrics = await spotify.tracks.lyrics({ id: '0DiWol3AO6WpXZgp0goxAV', format: 'lrc' });

// Genres, moods, BPM, credits and 30 s previews for up to 50 tracks in one call
const { tracks } = await spotify.tracks.insights({ ids: ['0VjIjW4GlUZAMYd2vXMi3b', '7qiZfU4dY1lWllzX7mPBI3'] });
console.log(tracks[0].bpm, tracks[0].genres[0]?.name, tracks[0].moods.map((m) => m.name));

// Search & charts
const results = await spotify.search.search({ q: 'daft punk', type: 'artists', limit: 5 });
const top200 = await spotify.charts.top200Tracks({ country: 'us' });

// Service status (per endpoint family)
const status = await spotify.status();
```

Methods return the payload directly. Endpoints that wrap their answer in `{ success, data, metadata }` (most `partner` and concert routes) are unwrapped to `data`; use `spotify.request({ method: 'GET', path, query })` when you need the whole envelope.

## Play counts

| Need | Method | Endpoint |
| --- | --- | --- |
| Many tracks (≤ 50 per call) | `tracks.counts({ ids })` | `GET /partner/tracks/count` |
| One track, by id or ISRC | `partner.trackCount({ spotify_track_id })` / `({ isrc })` | `GET /partner/track/count` |
| Track + album + artists + play count | `partner.track({ id, slim: true })` | `GET /partner/track` |
| Every track of an album | `partner.album({ id })` or `albums.tracks({ id })` | `GET /partner/album`, `GET /album_tracks` |
| Every track of a playlist | `partner.playlist({ id })` | `GET /partner/playlist` |
| An artist's top tracks | `artists.overview({ id, slim: true })` | `GET /artist_overview` |

Spotify reports `0` for tracks with fewer than 1,000 plays. `tracks.counts` needs an API release that serves `/partner/tracks/count`; an older deployment answers 404, so fall back to `partner.trackCount()` per id.

## Extra data (`include`)

Several methods take an `include` option that adds data the plain response lacks, in the same call. Each option
costs some extra time; a value that could not be fetched is `null`, never an error, and the response's
`include_status` says how many resolved (`{ playcount: { requested: 50, resolved: 50 } }`).

| Method | `include` options |
| --- | --- |
| `tracks.get` | `insights` (genres, moods, activities, BPM, credits, lyrics flag, languages), `playcount`, `total_tracks` |
| `albums.get` | `playcounts` (on every album track) |
| `artists.get` | `stats` (followers, monthly listeners, world rank, top cities), `insights` (genre / mood / tempo profile) |
| `artists.overview` | `insights` (in `data.artistUnion.insights`) |
| `playlists.tracks`, `tracks.recommendations`, `search.search` (track hits) | `insights`, `playcount` |
| `charts.top200Tracks`, `charts.viralTracks` | `insights`, `playcount` (in each entry's `trackMetadata`; the report is the `X-Include-Status` header) |

```ts
const page = await spotify.playlists.tracks({ id: '37i9dQZF1DXcBWIGoYBM5M', include: ['playcount', 'insights'] });
const hits = await spotify.search.search({ q: 'get lucky', type: 'tracks', limit: 10, include: 'playcount' });
```

These options need the 2026-10-21 API release; an older deployment ignores `include` (or answers 404 for the
`insights` methods).

## IDs, URIs & URLs

Anywhere an `id` or `ids` is accepted you can pass a bare Spotify ID, a URI, or an open.spotify.com URL — they're reduced to the bare ID automatically. Multi-id endpoints also accept an **array**. Non-Spotify values (category slugs, webhook IDs) pass through untouched.

```ts
await spotify.artists.overview({ id: 'https://open.spotify.com/intl-es/artist/4tZwfgrHOc3mvqYlEYSvVi' });
await spotify.artists.get({ ids: ['spotify:artist:4tZwfgrHOc3mvqYlEYSvVi', '06HL4z0CvFAxyc27GXpf02'] });

// Or normalize yourself:
import { normalizeId, normalizeIds } from '@checkleaked/spotify-api';
normalizeId('spotify:track:0DiWol3AO6WpXZgp0goxAV'); // '0DiWol3AO6WpXZgp0goxAV'
```

Spotify relinks some tracks to another id in a market: `tracks.get` then returns an object whose `id` differs from the one you asked for, with `linked_from.id` set to your id.

`tracks.get`, `albums.get` and `artists.get` leave out ids they have no object for and list them in one of two arrays: `missing` means Spotify does not know the id (asking again will not help); `unavailable` means it could not be fetched this time, so ask for those ids again later. When none of the ids could be fetched, the call throws a 503 `UPSTREAM_UNAVAILABLE` error instead (retried automatically). `tracks.getById` throws 404 for an id Spotify does not know and 503 when it could not be fetched.

```ts
const { tracks, missing = [], unavailable = [] } = await spotify.tracks.get({ ids });
// drop `missing` ids for good; ask for `unavailable` ones again later
```

## Pagination

Every `offset`/`limit` endpoint can be iterated. You supply `getItems` to point at the page's array (shapes vary per endpoint):

```ts
import { paginate, collect } from '@checkleaked/spotify-api';

const getItems = (p: any) => p?.data?.artist?.discography?.albums?.items ?? [];

// Iterate page by page
for await (const page of paginate((p) => spotify.artists.albums({ id, ...p }), { limit: 50, getItems })) {
  // …handle page
}

// Or collect everything (bounded by maxItems / maxPages)
const albums = await collect((p) => spotify.artists.albums({ id, ...p }), { limit: 50, getItems, maxItems: 500 });
```

## Configuration

```ts
const spotify = createClient({
  apiKey: 'xxxxx',            // sent as `x-rapidapi-key` (or env SPOTIFY_API_KEY / RAPIDAPI_KEY)
  provider: 'rapidapi',       // 'rapidapi' (default) | 'proxy'
  // baseUrl: 'https://…',    // override the base URL entirely
  // host: 'spotify81.p.rapidapi.com', // override the x-rapidapi-host header
  timeoutMs: 30_000,          // per-request timeout (default 30s)
  retries: 2,                 // retries on 429 / 5xx / network (default 2)
  retryDelayMs: 500,          // base backoff, exponential + jitter (default 500ms)
  maxRetryDelayMs: 10_000,    // longest wait before a retry, even if Retry-After asks for more (default 10s)
  gatewayTimeoutRetries: 1,   // retries a timeout (503 UPSTREAM_TIMEOUT, 504 or 524) may use (default 1; 0 = never)
  headers: { 'x-my-header': '1' }, // merged into every request
  // fetch: customFetch,      // inject a fetch implementation
  // userAgent: 'my-app/1.0',
  // debug: true,             // log every request/response/retry
  // onRequest, onResponse, onRetry,  // lifecycle hooks (see below)
});
```

### Providers

| Provider | Base URL | Notes |
| --- | --- | --- |
| `rapidapi` (default) | `https://spotify81.p.rapidapi.com` | Adds `x-rapidapi-host`. Use your RapidAPI key. |
| `proxy` | `https://spotify-proxy.checkleaked.cc/spotify-data` | Direct API. Use a key from the direct portal. |

### Per-call options

Every method takes a trailing `options?: { signal?, headers?, query? }`. `query` adds parameters this SDK version does not type yet, or forces a fresh fetch:

```ts
await spotify.partner.trackCount({ spotify_track_id: '0VjIjW4GlUZAMYd2vXMi3b' }, { query: { cache: false } });
```

Responses are cached for a while (play counts about an hour, catalog objects up to a day). `cache: false` skips the cached copy; a given URL is refreshed at most once every 10 seconds.

## Debugging & hooks

```ts
const spotify = createClient({
  apiKey,
  debug: true, // or a custom (message, detail) => void
  onRequest: ({ method, url }) => metrics.count('spotify.request', { url }),
  onResponse: ({ status, durationMs }) => metrics.timing('spotify.latency', durationMs, { status }),
  onRetry: ({ attempt, status, delayMs }) => log.warn(`retry #${attempt} in ${delayMs}ms (${status})`),
});
```

## Error handling

Any non-2xx response throws a `SpotifyApiError`. So does a 2xx body that reports a failure (`success: false`, `error: true`, or an error `code` such as `LYRICS_NOT_AVAILABLE` for a track without lyrics):

```ts
import { SpotifyApiError } from '@checkleaked/spotify-api';

try {
  await spotify.tracks.lyrics({ id: '4iV5W9uYEdYUVa79Axb7Rh' });
} catch (err) {
  if (err instanceof SpotifyApiError) {
    console.log(err.status);       // HTTP status (e.g. 400, 503)
    console.log(err.code);         // e.g. 'INVALID_PARAMETER', 'UPSTREAM_THROTTLED', 'LYRICS_NOT_AVAILABLE', or TIMEOUT/NETWORK/ABORTED/CONFIG
    console.log(err.requestId);    // quote this when contacting support
    console.log(err.param);        // the rejected query parameter, on 400s
    console.log(err.retryable, err.retryAfterMs);
    console.log(err.body);         // parsed response body
  }
}
```

| HTTP | `code` | Meaning |
| --- | --- | --- |
| 400 | `INVALID_PARAMETER`, `MISSING_PARAMETER` | Fix the request (`err.param`, `err.body.example`) |
| 401 | `MISSING_API_KEY`, `INVALID_API_KEY`, `KEY_REVOKED`, `KEY_EXPIRED` | Key problem |
| 404 | `NOT_FOUND`, `UNKNOWN_ENDPOINT` | Entity or route does not exist |
| 422 | `VIDEO_UNAVAILABLE`, `AGE_RESTRICTED`, `PREMIUM_ONLY` | Downloads only: the source cannot be served |
| 429 | `RATE_LIMITED`, `QUOTA_EXCEEDED` | **Your** rate limit or quota |
| 503 | `UPSTREAM_UNAVAILABLE`, `UPSTREAM_THROTTLED`, `UPSTREAM_TIMEOUT`, `LOAD_SHED` | Temporary, retried automatically |
| 503 | `OUTCOME_UNKNOWN` | A request that changes something may or may not have run: never retried automatically, check its effect first |

Spotify-side problems arrive as 503 with `Retry-After`, never as 401/429, so a 401 or 429 always concerns your own key or plan. The API never answers 502 or 504: a request that runs out of time is a 503 `UPSTREAM_TIMEOUT` (it was a 504 before 2026-10). A 502, 504 or 524 with a plain-text body comes from the network edge in front of the API: a 504 or 524 (the edge stopped waiting, after about 100 s) counts as a timeout, like a 503 `UPSTREAM_TIMEOUT`; a 502 is retried like any other 5xx.

## Timeouts, retries & cancellation

- Requests time out after `timeoutMs` (default 30s) and raise a `SpotifyApiError` with `code: 'TIMEOUT'`.
- `429` and `5xx` responses are retried up to `retries` times with exponential backoff + jitter, honoring `Retry-After` (or the body's `retry_after_s`). Errors that waiting cannot fix — `QUOTA_EXCEEDED`, a bad or revoked key, `retryable: false` — are not retried.
- No single wait is longer than `maxRetryDelayMs` (default 10s), even when `Retry-After` asks for more; `err.retryAfterMs` still tells you what the API asked for.
- A timeout — a 503 whose `code` is `UPSTREAM_TIMEOUT` (a 504 before 2026-10), or a 504 or 524 from the network edge — means the API already spent its whole time budget on the request, so it is retried at most `gatewayTimeoutRetries` times (default once). Every other 5xx (a 502 from the edge included) can use all `retries`.
- The `timeout` parameter of `search.search` is the API's own search budget in milliseconds, not the HTTP timeout: it can only shorten a search, which ends within about 20 seconds anyway.
- Cancel a request with an `AbortSignal`:

```ts
const controller = new AbortController();
setTimeout(() => controller.abort(), 1000);
await spotify.search.search({ q: 'muse' }, { signal: controller.signal });
```

## Tracking & webhooks

```ts
await spotify.tracking.track({ spotifyType: 'artist', spotifyId: '06HL4z0CvFAxyc27GXpf02', label: 'Taylor' });
const changes = await spotify.tracking.logs({ spotifyType: 'artist', changeType: 'monthly_listeners_change' });

await spotify.webhooks.register({
  playlistId: '37i9dQZF1DXcBWIGoYBM5M',
  callbackUrl: 'https://example.com/spotify-hook',
  events: ['playlist.tracks.added', 'playlist.tracks.removed'],
});
```

Tracked items and webhooks belong to the calling account; RapidAPI identifies you automatically. Tracking also works with a direct API key; webhooks are not available with direct API keys yet.

## Custom `fetch` (edge / browser / testing)

```ts
const spotify = createClient({ apiKey, fetch: (url, init) => myFetch(url, init) });
```

## API reference

All 23 namespaces and their methods. Every method takes a typed `params` object (where applicable) and an optional trailing `options?: { signal?, headers?, query? }`. The client itself also has `status()`.

| Namespace | # | Methods |
| --- | --- | --- |
| `search` | 5 | `search`, `topResults`, `lyrics`, `suggestions`, `multiMarket` |
| `albums` | 3 | `get`, `tracks`, `metadata` |
| `artists` | 10 | `get`, `overview`, `discographyOverview`, `albums`, `singles`, `appearsOn`, `discoveredOn`, `featuring`, `related`, `topTracks` |
| `tracks` | 6 | `get`, `getById`, `counts`, `credits`, `lyrics`, `recommendations` |
| `batch` | 5 | `albumMetadata`, `artistOverview`, `trackCredits`, `trackLyrics`, `trackPopularity` |
| `analysis` | 3 | `artistCompare`, `audioFeatures`, `playlistAnalysis` |
| `lookups` | 2 | `isrc`, `upc` |
| `playlists` | 3 | `get`, `tracks`, `fromSeed` |
| `snapshots` | 2 | `list`, `create` |
| `users` | 2 | `profile`, `followers` |
| `charts` | 6 | `topByMonthlyListeners`, `top200Tracks`, `topArtists`, `topAlbums`, `viralTracks`, `topByFollowers` |
| `downloads` | 2 | `track`, `soundcloud` |
| `browse` | 5 | `categories`, `category`, `featuredPlaylists`, `newReleases`, `recommendations` |
| `audiobooks` | 3 | `get`, `getById`, `chapters` |
| `shows` | 3 | `get`, `getById`, `episodes` |
| `episodes` | 2 | `get`, `byId` |
| `markets` | 1 | `get` |
| `partner` | 6 | `playlist`, `track`, `trackCount`, `album`, `artistOverview`, `artistDiscography` |
| `concerts` | 5 | `locations`, `feed`, `get`, `byArtist`, `searchArtists` |
| `webhooks` | 6 | `get`, `register`, `stats`, `delete`, `test`, `deliveries` |
| `tracking` | 7 | `track`, `untrack`, `items`, `item`, `logs`, `stats`, `health` |
| `ai` | 13 | `health`, `types`, `analyze`, `chartTrends`, `artistSummary`, `albumReview`, `trackDeepDive`, `playlistCurator`, `marketComparison`, `genreLandscape`, `moodProfile`, `viralPotential`, `custom` |
| `health` | 6 | `ping`, `status`, `get`, `instance` *(deprecated)*, `cluster` *(deprecated)*, `clusterStrict` *(deprecated)* |

> **Response typing.** Request parameters are precisely typed from the API's OpenAPI spec. Response payload types for most endpoints were inferred from real API responses (via [quicktype](https://quicktype.io/)); `status()` and `tracks.counts()` have hand-written types; the remaining endpoints (AI analysis, downloads, webhook mutations) return `unknown` — cast to your own type as needed.

## Development

```bash
npm run build        # tsup -> dist (esm + cjs + d.ts)
npm test             # vitest (mocked fetch, no network) — includes the SDK ↔ OpenAPI drift checks
npm run typecheck    # tsc --noEmit

# Regenerate from the spec:
npm run codegen:spec                                       # swagger yaml / public openapi.json -> openapi.json
npm run codegen:endpoints                                  # openapi.json -> codegen.json (skips x-internal ops)
SPOTIFY_API_KEY=xxx npm run codegen:sample                 # sample endpoints -> fixtures
npm run codegen:types                                      # quicktype fixtures -> src/generated/responses.ts
npm run codegen:enhance                                    # upgrade unknown->typed returns, widen id arrays
npm run codegen:client                                     # assemble client.ts + index.ts
```

After changing resources, regenerate the Python SDK too (`node ../spotify-api-sdk-python/scripts/generate_resources.mjs`).

## License

MIT © eduair94
