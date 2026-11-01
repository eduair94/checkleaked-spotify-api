# Changelog

## 2.1.0 - Unreleased

### Added

- `tracks.insights({ ids })` (`GET /track_insights`): genres, moods and activities with Spotify's weights, BPM,
  credits with roles, the 30-second preview MP3, `has_lyrics`, vocal languages, ISRC and release date for up to 50
  tracks per call. Entries in request order with `status` (`ok`, `not_found`, `error`), plus `missing` and
  `unavailable`. Types `TrackInsights`, `TrackInsightsEntry`, `TrackInsightTag`, `TracksInsightsParams`.
- `artists.insights({ ids })` (`GET /artist_insights`): genres, moods and activities with weights and the tempo range
  of up to 20 artists, aggregated from Spotify's descriptors of each artist's top tracks. Types `ArtistInsights`,
  `ArtistInsightsEntry`, `ArtistInsightTag`, `ArtistsInsightsParams`.
- `include` option on `tracks.get` (`insights`, `playcount`, `total_tracks`), `albums.get` (`playcounts`) and
  `artists.get` (`stats`, `insights`): play counts, genres / moods / BPM and artist stats in the same call. Responses
  carry `include_status`. Type `TrackIncludeOption`.
- `include` option on `playlists.tracks`, `tracks.recommendations`, `search.search` (tracks bucket),
  `charts.top200Tracks` and `charts.viralTracks` (in each entry's `trackMetadata`; `insights`, `playcount`), and
  `artists.overview` (`insights`, in `data.artistUnion.insights`): every track's
  lifetime play count (user playlists included) and genres / moods / BPM / credits. Type `TrackListIncludeOption`.
- User agent `@checkleaked/spotify-api/2.1.0`.

### API changes this release documents (2026-10-21)

- `tracks.get` (and album tracks in `albums.get`) now fill `preview_url` for most tracks (it was always `null`), and
  album tracks list their own artists (featured artists included) instead of repeating the album artists.

## 2.0.1 - Unreleased

The first 2.x release on npm: 2.0.0 was never published there, so coming from 1.x read the 2.0.0 section below as
well. Matches the Python SDK `checkleaked-spotify-api` 2.0.1 and the Spotify Data API as of 2026-10-13.

### Changed

- A timeout counts against `gatewayTimeoutRetries` (default 1) in every form it arrives in: a 503 whose `code` is
  `UPSTREAM_TIMEOUT` (the API's answer since 2026-10), an HTTP 504, or Cloudflare's HTTP 524 (the API did not answer
  within about 100 s). 2.0.0 recognised only the 504. Other 5xx, a plain-text 502 from the network edge included, still
  use every retry.
- User agent `@checkleaked/spotify-api/2.0.1`.

### API changes this release documents (2026-10-13)

- Timeouts are HTTP 503 with `code: UPSTREAM_TIMEOUT` and `Retry-After: 5` (they were 504 with `Retry-After: 30`). The
  network edge in front of the API replaced 502/504 bodies with plain text, so the JSON error never reached you. The API
  answers no 502 or 504 at all now: lane failures that were 502 are 503 `UPSTREAM_UNAVAILABLE`. A 503 that names no
  other wait carries `Retry-After: 5`, and the 503 bodies some endpoints build themselves (`/upc_lookup`,
  `/artist_compare`, `/playlist_analysis`, `/browse/*`) now carry every error field (`retryable`, `status`,
  `retry_after_s`, `timestamp`).
- These resolved to `null` (an HTTP 200 with an empty body) when Spotify did not answer, and now throw a 503 that the
  SDK retries: `artists.topTracks` (`UPSTREAM_UNAVAILABLE`), `browse.categories` and `browse.featuredPlaylists`
  (`UPSTREAM_TIMEOUT`), and `lookups.isrc` (`UPSTREAM_TIMEOUT` after about 12 s).
- `lookups.isrc` and `lookups.upc` throw 404 for an ISRC or UPC Spotify does not have, and a repeat within about 10
  minutes throws the same 404 at once. `lookups.upc` answers 404 only when Spotify answered for every barcode form (as
  given, padded to 14 digits, and the 12-digit UPC-A form); when one of those searches failed it throws 503
  `UPSTREAM_UNAVAILABLE` (retried) instead of a 404, or of an album only the shorter UPC-A form matched (that form can
  match another album). Its timeouts and lane failures are 503 (they were 504 and 502).
- `tracks.getById`: every error the route itself answers has Spotify's `error` object (`error.body.error.status`), the
  503 for a track that could not be fetched included, also through the direct API; a timeout is 503 `UPSTREAM_TIMEOUT`
  (was 504). The exception is a 503 `LOAD_SHED` from the overload guard, which any route can answer and whose
  `error.body.error` is `true`: branch on `error.code` first.
- A 503 `OUTCOME_UNKNOWN` (new code) means a request that changes something (e.g. `webhooks.test`, `tracking.track`,
  `snapshots.create`) may or may not have run: it is never retried automatically (`retryable: false`, no `Retry-After`;
  added to `NON_RETRYABLE_CODES`). Check its effect before sending it again.
- `error.code` changes on 400s that moved to the standard envelope: `MISSING_PARAMETER` / `INVALID_PARAMETER` instead
  of the title strings on every `/partner/*` parameter error (e.g. was `'Track ID is required'`); `INVALID_PARAMETER`
  instead of `'Too many ids'` on `/albums` with more than 50 ids; `INVALID_PARAMETER` instead of
  `'pagination_not_supported'` on `/artist_appears_on` and `/artist_discovered_on` with `offset` / `limit` (the reason
  stays in `error.body.reason` and `error.body.error`); `MISSING_PARAMETER` / `INVALID_PARAMETER` (was no code) on
  `/search` with an invalid `type` and on `/search_top_results`, `/search_suggestions` and `/search_lyrics` without
  `q`. Every old body field is still in `error.body`. Branch on `error.status === 400` or the new codes.

## 2.0.0 - never published to npm

This version was never published to npm (npm's `latest` is still 1.0.0; 2.0.1 is the first 2.x release there). It
matched the Spotify Data API spec 1.2.0 and the Python SDK `checkleaked-spotify-api` 2.0.0 (on PyPI since 2026-10-13).
Prepared as 1.1.0 (never published) and versioned as a major release because of the breaking changes below, so
`^1.0.0` ranges do not pick it up automatically.

### Breaking changes

- 2xx responses that report a failure now throw a `SpotifyApiError` (1.x returned them as data): `success: false`,
  `error: true`, or an error `code` such as `LYRICS_NOT_AVAILABLE`. Catch `LYRICS_NOT_AVAILABLE` if a track without
  lyrics is a normal result for you.
- `error.code` is the API's machine-readable `code` (e.g. `INVALID_PARAMETER`) instead of the `error` title; the
  title is still in `error.message` / `error.body`.
- Removed the operator-only methods (they need an operator key): `health.proxies`, `health.clearProxies`,
  `health.clearErrors`, the `cache` namespace (`stats`, `invalidate`) and the `credentials` namespace (`status`,
  `redisCookies`).
- `tracking.track` / `tracking.untrack` take `{ spotifyType, spotifyId, label? }` instead of `{ type, id }`, and
  `webhooks.register` takes `{ playlistId, callbackUrl, events?, secret? }` instead of `{ url, … }` (the 1.x shapes
  never worked; see Fixed).
- `ErrorEnvelope` is widened: `error` is `string | boolean` and every field, `success` included, is optional.
- `snapshots.list()` entries no longer have `capturedBy`: the API stopped returning who took a snapshot.
- `health.instance()`, `health.cluster()` and `health.clusterStrict()` type the per-request records (`lastRequests`,
  and `failedRequests` / `lastUpdateTimestamp` in `lastRequestsTracking.instances[]`) as optional: the API sends them
  only to its operator. `lastRequestsTracking.instances[]` has `failedRequestsCount` (plus `isStale` and
  `staleReason` for a stale instance) instead.

### Added

- `client.status()` (also `client.health.status()`): public service status from `GET /status`, with
  per-endpoint-family success rates and latency. Typed as `ApiStatus`.
- `client.tracks.counts({ ids })`: play counts for up to 50 tracks in one call (`GET /partner/tracks/count`),
  typed as `TrackPlayCounts`. API deployments older than 1.2.0 answer 404; fall back to `partner.trackCount()` per id.
- `client.tracks.getById({ id, market? })`: `GET /tracks/{id}`, which answers 404 for an id Spotify does not know.
- `market` on `albums.get`, `artists.get`, `playlists.get`, `playlists.tracks`, `search.search`, `lookups.upc`,
  `tracks.recommendations` and `browse.recommendations`.
- `slim` on `partner.track`, `artists.overview` and `partner.artistOverview` (drops the heavy embedded blocks; play
  counts and stats are kept).
- More typed parameters: chart `date` on every Spotify chart and `city` on the top 200; the download options;
  `includeAudiobooks` and `timeout` on search; the top-results flags; browse category section paging; snapshot list
  paging; tracking log filters; `limit` on webhook deliveries; `vocalRemoval` on batch lyrics.
- `options.query` on every method: extra query parameters merged over the method's own, e.g. `{ cache: false }`.
- `SpotifyApiError` exposes `requestId`, `retryAfterMs`, `retryable` and `param`; `SpotifyApiErrorCode` lists the
  API's error codes. `SDK_VERSION` is exported.
- Client options `maxRetryDelayMs` (default 10 s) and `gatewayTimeoutRetries` (default 1), exported as
  `DEFAULT_MAX_RETRY_DELAY_MS` and `DEFAULT_GATEWAY_TIMEOUT_RETRIES`.
- `tracks.get`, `albums.get` and `artists.get` results are typed with the optional `missing` and `unavailable` id
  arrays (`CatalogBatchGaps`).

### Changed

- Errors reported inside a 2xx body now throw: `success: false`, `error: true`, or an error `code` such as
  `LYRICS_NOT_AVAILABLE`.
- `error.code` prefers the API's machine-readable `code` over the `error` title.
- 429 and 5xx responses are not retried when waiting cannot help (`QUOTA_EXCEEDED`, a revoked or invalid key,
  `retryable: false`, or RapidAPI's monthly-quota message). RapidAPI's message-only 429s get the code
  `QUOTA_EXCEEDED` or `RATE_LIMITED`. Retry waits fall back to the body's `retry_after_s`.
- A wait before a retry never exceeds `maxRetryDelayMs` (default 10 s), even when `Retry-After` asks for more (the API
  sends up to 30 s on 503/504); the error's `retryAfterMs` still reports the requested wait.
- A 504 (`UPSTREAM_TIMEOUT`) is retried at most `gatewayTimeoutRetries` times (default once): the API already spent
  its whole time budget on that request. With the defaults, a call whose every attempt times out after 20 s now gives
  up after about 50 s instead of about 2 minutes.
- Response bodies are read before a retry, so connections can be reused.
- User agent `@checkleaked/spotify-api/2.0.0`.
- Docs: `search.search({ timeout })` can only shorten a search (about 20 s at most); `tracks.get`, `albums.get` and
  `artists.get` list ids Spotify does not know in `missing` and ids to retry later in `unavailable`;
  `tracks.getById` throws 404 for an unknown id and 503 when it could not be fetched; webhooks need a RapidAPI
  account.
- `repository` / `bugs` point to the public repository again and `homepage` to the API reference.

### Fixed

- `tracking.track` / `tracking.untrack` send `spotifyId` / `spotifyType` (and `label`), the names the API reads.
  1.0 sent `id` / `type` and always got a 400. URIs/URLs are reduced to bare ids.
- `webhooks.register({ playlistId, callbackUrl, events?, secret? })` sends the body the API expects. 1.0 sent `url`,
  which always failed.
- Batch limits in the docs match the API (`artistOverview` 10, `albumMetadata` / `trackCredits` 20,
  `trackLyrics` 10, `artistCompare` 2–5).

### Removed

- Operator-only methods, which now need an operator key: `health.proxies`, `health.clearProxies`,
  `health.clearErrors`, the `cache` namespace (`stats`, `invalidate`) and the `credentials` namespace (`status`,
  `redisCookies`).

### Deprecated

- `health.instance`, `health.cluster` and `health.clusterStrict`: internal diagnostics, use `status()`.
- Parameters the API ignores, kept for compatibility: `country` on `browse.categories` and
  `browse.featuredPlaylists`, `authenticated` on `concerts.get`, `webhook` on `snapshots.create`, `contrast` on
  `search.topResults`, `period` on `charts.topAlbums`, `offset` / `limit` on `tracking.items`.

## 1.0.1

- Regenerated against the 109-path spec (not published to npm).

## 1.0.0 - 2026-07-10

- Initial release: 110 typed methods across 25 namespaces, RapidAPI and direct-proxy presets.
