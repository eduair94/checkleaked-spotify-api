# @checkleaked/spotify-api

**Website:** [spotify.checkleaked.cc](https://spotify.checkleaked.cc) · **npm:** [@checkleaked/spotify-api](https://www.npmjs.com/package/@checkleaked/spotify-api)

Zero-dependency, fully-typed TypeScript SDK for the **Spotify Data API** — 110 typed methods across 25 namespaces covering search, artists, tracks, albums, lyrics, playlists, charts, browse, podcasts, concerts, tracking, webhooks and AI analysis.

- 🟢 **Zero runtime dependencies** — built on native `fetch`.
- 🌐 Runs on **Node 18+, Deno, Bun, edge runtimes and the browser**.
- 📦 Ships **ESM + CJS** with complete `.d.ts` types.
- 🆔 Pass a Spotify **ID, URI (`spotify:…`) or URL** anywhere an id is expected — and **arrays** for multi-id endpoints.
- 🔁 Built-in **timeouts, retries with backoff** (honors `Retry-After`), **lifecycle hooks** and **uniform error handling**.
- 📄 **Pagination helpers** for every `offset`/`limit` endpoint.
- 🔌 **RapidAPI-compatible** out of the box (`spotify81.p.rapidapi.com`), with a `proxy` preset.

## Install

```bash
npm install @checkleaked/spotify-api
```

## Quick start

```ts
import { createClient } from '@checkleaked/spotify-api';

const spotify = createClient({ apiKey: process.env.RAPIDAPI_KEY! });
// …or just `createClient()` and set SPOTIFY_API_KEY / RAPIDAPI_KEY in the env.

// Search
const results = await spotify.search.search({ q: 'daft punk', type: 'artists', limit: 5 });

// Artists — id, URI, or URL all work
const artist = await spotify.artists.overview({ id: 'spotify:artist:4tZwfgrHOc3mvqYlEYSvVi' });
const top = await spotify.artists.topTracks({ id: '4tZwfgrHOc3mvqYlEYSvVi', market: 'US' });

// Tracks & lyrics — pass an array of ids
const tracks = await spotify.tracks.get({ ids: ['0DiWol3AO6WpXZgp0goxAV', '7ouMYWpwJ422jRcDASZB7P'] });
const lyrics = await spotify.tracks.lyrics({ id: '0DiWol3AO6WpXZgp0goxAV', format: 'lrc' });

// Charts
const top200 = await spotify.charts.top200Tracks({ country: 'US' });
```

Methods return the **unwrapped payload** (the API's `data` field) directly, so there is no `.data` to peel off at every call site.

## IDs, URIs & URLs

Anywhere an `id` or `ids` is accepted you can pass a bare Spotify ID, a URI, or an open.spotify.com URL — they're reduced to the bare ID automatically. Multi-id endpoints also accept an **array**. Non-Spotify values (category slugs, webhook IDs) pass through untouched.

```ts
await spotify.artists.overview({ id: 'https://open.spotify.com/intl-es/artist/4tZwfgrHOc3mvqYlEYSvVi' });
await spotify.artists.get({ ids: ['spotify:artist:4tZwfgrHOc3mvqYlEYSvVi', '06HL4z0CvFAxyc27GXpf02'] });

// Or normalize yourself:
import { normalizeId, normalizeIds } from '@checkleaked/spotify-api';
normalizeId('spotify:track:0DiWol3AO6WpXZgp0goxAV'); // '0DiWol3AO6WpXZgp0goxAV'
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
  headers: { 'x-my-header': '1' }, // merged into every request
  // fetch: customFetch,      // inject a fetch implementation
  // userAgent: 'my-app/1.0',
  // debug: true,             // log every request/response/retry
  // onRequest, onResponse, onRetry,  // lifecycle hooks (see below)
});
```

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

### Providers

| Provider | Base URL | Notes |
| --- | --- | --- |
| `rapidapi` (default) | `https://spotify81.p.rapidapi.com` | Adds `x-rapidapi-host`. Use your RapidAPI key. |
| `proxy` | `https://spotify-proxy.checkleaked.cc/spotify-data` | Direct proxy. |

## Return shape & raw envelope

Every response is wrapped by the API in `{ success, data, metadata }`. Methods return `data`. To read `metadata` (pagination cursors, timings, etc.), call the low-level request:

```ts
const envelope = await spotify.request({ method: 'GET', path: '/search', query: { q: 'muse' } });
// { success: true, data: {...}, metadata: {...} }
```

## Error handling

Any non-2xx response, or a body with `success: false`, throws a `SpotifyApiError`:

```ts
import { SpotifyApiError } from '@checkleaked/spotify-api';

try {
  await spotify.artists.overview({ id: 'bad-id' });
} catch (err) {
  if (err instanceof SpotifyApiError) {
    console.log(err.status);       // HTTP status (e.g. 404)
    console.log(err.code);         // upstream error code, or TIMEOUT/NETWORK/ABORTED/CONFIG
    console.log(err.url);          // request URL
    console.log(err.body);         // parsed response body
    console.log(err.isRateLimit, err.isServerError, err.isTimeout);
  }
}
```

## Timeouts, retries & cancellation

- Requests time out after `timeoutMs` (default 30s) and raise a `SpotifyApiError` with `code: 'TIMEOUT'`.
- `429` and `5xx` responses are retried up to `retries` times with exponential backoff + jitter, honoring the `Retry-After` header.
- Cancel a request with an `AbortSignal`:

```ts
const controller = new AbortController();
setTimeout(() => controller.abort(), 1000);
await spotify.search.search({ q: 'muse' }, { signal: controller.signal });
```

## Custom `fetch` (edge / browser / testing)

```ts
const spotify = createClient({ apiKey, fetch: (url, init) => myFetch(url, init) });
```

## API reference

All 25 namespaces and their methods. Every method takes a typed `params` object (where applicable) and an optional trailing `options?: { signal?, headers? }`.

| Namespace | # | Methods |
| --- | --- | --- |
| `search` | 5 | `search`, `topResults`, `lyrics`, `suggestions`, `multiMarket` |
| `albums` | 3 | `get`, `tracks`, `metadata` |
| `artists` | 10 | `get`, `overview`, `discographyOverview`, `albums`, `singles`, `appearsOn`, `discoveredOn`, `featuring`, `related`, `topTracks` |
| `tracks` | 4 | `get`, `credits`, `lyrics`, `recommendations` |
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
| `cache` | 2 | `stats`, `invalidate` |
| `tracking` | 7 | `track`, `untrack`, `items`, `item`, `logs`, `stats`, `health` |
| `ai` | 13 | `health`, `types`, `analyze`, `chartTrends`, `artistSummary`, `albumReview`, `trackDeepDive`, `playlistCurator`, `marketComparison`, `genreLandscape`, `moodProfile`, `viralPotential`, `custom` |
| `health` | 8 | `ping`, `get`, `instance`, `cluster`, `clusterStrict`, `proxies`, `clearProxies`, `clearErrors` |
| `credentials` | 2 | `status`, `redisCookies` |

> **Response typing.** Request parameters are precisely typed from the API's OpenAPI spec. Response payload types for **74 endpoints** were inferred from real API responses (via [quicktype](https://quicktype.io/)); the remaining endpoints (AI analysis, downloads, webhooks mutations) return `unknown` — cast to your own type as needed. Some endpoints exposed on the direct proxy are not available on all RapidAPI plans.

## Development

```bash
npm run build        # tsup -> dist (esm + cjs + d.ts)
npm test             # vitest (mocked fetch, no network)
npm run typecheck    # tsc --noEmit

# Regenerate types from the live API (needs a key):
npm run codegen:endpoints                                  # openapi.json -> codegen.json
SPOTIFY_API_KEY=xxx npm run codegen:sample                 # sample endpoints -> fixtures
npm run codegen:types                                      # quicktype fixtures -> src/generated/responses.ts
npm run codegen:enhance                                    # upgrade unknown->typed returns, widen id arrays
npm run codegen:client                                     # assemble client.ts + index.ts
```

## License

MIT © eduair94
