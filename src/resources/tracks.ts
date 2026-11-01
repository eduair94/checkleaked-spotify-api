import { Resource, buildPath } from './base';
import type { RequestOverrides } from '../types/common';
import type {
  GetTracksData,
  GetTrackCreditsData,
  GetTrackLyricsData,
  GetRecommendationsData,
} from '../generated/responses';

/** Ids a batch catalog call (`tracks.get`, `albums.get`, `artists.get`) has no object for. */
export interface CatalogBatchGaps {
  /** Ids Spotify does not know: asking again will not help. */
  missing?: string[];
  /** Ids that could not be fetched this time: ask for them again later. */
  unavailable?: string[];
  /** With `include`: per option, how many objects asked for it and how many got a value. */
  include_status?: Record<string, { requested: number; resolved: number }>;
}

/** `include` options of {@link TracksResource.get}. */
export type TrackIncludeOption = 'insights' | 'playcount' | 'total_tracks';

/**
 * Extra data on the tracks of a list (`playlists.tracks`, `tracks.recommendations`, `search.search`): `insights`
 * (genres, moods, BPM, credits per track) and `playcount` (lifetime plays, as a number).
 */
export type TrackListIncludeOption = 'insights' | 'playcount';

/** Parameters for {@link TracksResource.get}. */
export interface TracksGetParams {
  /**
   * Track IDs (max 50). Spotify may relink a track to another id: the returned object then has
   * `linked_from.id` set to the id you requested. Ids without a track are listed in `missing`
   * (Spotify does not know them) or `unavailable` (not fetched this time; retry them later). If no
   * id could be fetched the call throws a 503 `UPSTREAM_UNAVAILABLE` error.
   */
  ids: string | readonly string[];
  /**
   * Comma-separated list of streaming providers to contrast against.
   * Appends a `_contrast` field to the response with cross-platform matching data.
   * Available providers: `ytmusic`, `applemusic`, `amazonmusic`, `tencentmusic`, `pandora`, `gaana`.
   */
  contrast?: string;
  /**
   * Extra data per track (each adds a little time; values that could not be fetched are `null`):
   * `insights` → `insights` (genres, moods, activities, tags, bpm, credits, has_lyrics, languages),
   * `playcount` → lifetime `playcount`, `total_tracks` → fills `album.total_tracks`.
   */
  include?: TrackIncludeOption | readonly TrackIncludeOption[];
}

/** Parameters for {@link TracksResource.getById}. */
export interface TracksGetByIdParams {
  /** Spotify track ID. */
  id: string;
  /** ISO 3166-1 alpha-2 market code, e.g. `US`. */
  market?: string;
  /** Comma-separated providers to contrast against, e.g. `ytmusic,applemusic`. */
  contrast?: string;
}

/** Parameters for {@link TracksResource.counts}. */
export interface TracksCountsParams {
  /** 1–50 track IDs. */
  ids: string | readonly string[];
}

/** One entry of {@link TrackPlayCounts}. */
export interface TrackPlayCountEntry {
  id: string;
  name?: string | null;
  artists?: Array<{ id: string | null; name: string | null }>;
  /** Lifetime plays; Spotify reports 0 for tracks with fewer than 1,000 plays. null when unavailable. */
  playcount: number | null;
  /** Album release date: `YYYY-MM-DD`, or `YYYY-MM` / `YYYY` at coarser precision. */
  releaseDate?: string | null;
  status: 'ok' | 'not_found' | 'error';
  /** Present when `status` is `error`. */
  error?: string;
}

/** Response of {@link TracksResource.counts}. */
export interface TrackPlayCounts {
  /** One entry per requested id, in request order. */
  tracks: TrackPlayCountEntry[];
  /** Requested ids whose `status` is not `ok`. */
  missing: string[];
}

/** Parameters for {@link TracksResource.insights}. */
export interface TracksInsightsParams {
  /** 1–50 track IDs (bare ids, `spotify:track:` URIs or open.spotify.com URLs). */
  ids: string | readonly string[];
}

/** A genre, mood or activity descriptor of a track, with Spotify's weight. */
export interface TrackInsightTag {
  /** Lower-case tag, e.g. `dance pop`. */
  name: string;
  /** Display name, e.g. `Dance Pop`. */
  display_name: string;
  /** Spotify's confidence, 0–1 (strongest first). */
  weight: number;
}

/** One entry of {@link TrackInsights}. */
export interface TrackInsightsEntry {
  id: string;
  status: 'ok' | 'not_found' | 'error';
  name: string | null;
  artists: Array<{ id: string | null; name: string }>;
  /**
   * Set when Spotify serves another track id for this one (relinking): `id` is the id it serves.
   * `tracks.get` reports a relink from the other side (`id` = served, `linked_from.id` = requested).
   */
  relinked_to: { id: string } | null;
  isrc: string | null;
  duration_ms: number | null;
  explicit: boolean | null;
  popularity: number | null;
  /** `YYYY-MM-DD`, or `YYYY-MM` / `YYYY` at coarser precision. */
  release_date: string | null;
  /** 30-second MP3 preview, when Spotify has one. */
  preview_url: string | null;
  /** Tempo from Spotify's automix analysis; null when the track has none. */
  bpm: number | null;
  genres: TrackInsightTag[];
  moods: TrackInsightTag[];
  /** e.g. `gaming`, `workout`. */
  activities: TrackInsightTag[];
  /** Other descriptors. */
  tags: TrackInsightTag[];
  /** Performers, writers, producers… in Spotify's order. `role` is e.g. `Main Artist`, `Composer`, `Producer`. */
  credits: Array<{ name: string; role: string; artist_id: string | null }>;
  has_lyrics: boolean | null;
  /** ISO 639 codes of the vocals, e.g. `['en']`. */
  languages: string[];
  /** Present when `status` is `error`. */
  error?: string;
}

/** Response of {@link TracksResource.insights}. */
export interface TrackInsights {
  /** One entry per requested id, in request order. */
  tracks: TrackInsightsEntry[];
  /** Ids Spotify does not have (`status` `not_found`). */
  missing: string[];
  /** Ids that could not be answered this time (`status` `error`): ask again later. */
  unavailable: string[];
}

/** Parameters for {@link TracksResource.credits}. */
export interface TracksCreditsParams {
  /** Spotify track ID. */
  id: string;
}

/** Parameters for {@link TracksResource.lyrics}. */
export interface TracksLyricsParams {
  /** Spotify track ID. */
  id: string;
  /** Lyrics output format. Default `json`. */
  format?: 'json' | 'lrc' | 'srt' | 'raw';
  /** Whether to request the vocal-removal (instrumental) variant. Default `false`. */
  vocalRemoval?: boolean;
}

/** Parameters for {@link TracksResource.recommendations}. */
export interface TracksRecommendationsParams {
  /** Number of recommended tracks to return (1–100, default 20). */
  limit?: number;
  /** Comma-separated seed track IDs. */
  seed_tracks?: string | readonly string[];
  /** Comma-separated seed artist IDs. */
  seed_artists?: string | readonly string[];
  /** Comma-separated seed genres. */
  seed_genres?: string;
  /** ISO 3166-1 alpha-2 market code, e.g. `US`. */
  market?: string;
  /**
   * Extra data on every recommended track (each option adds time; a value that could not be
   * fetched is `null`, and `include_status` reports how many resolved).
   */
  include?: TrackListIncludeOption | readonly TrackListIncludeOption[];
}

/** Track endpoints. */
export class TracksResource extends Resource {
  /** Get up to 50 tracks by ID. */
  get(params: TracksGetParams, options?: RequestOverrides): Promise<GetTracksData & CatalogBatchGaps> {
    return this.client.get<GetTracksData & CatalogBatchGaps>(
      '/tracks',
      { ids: params.ids, contrast: params.contrast, include: params.include },
      options,
    );
  }

  /**
   * Get one track (`GET /tracks/{id}`): the track object itself. Throws a `SpotifyApiError` with
   * status 404 when Spotify does not know the id, or 503 when it could not be fetched right now
   * (retryable).
   */
  getById(params: TracksGetByIdParams, options?: RequestOverrides): Promise<unknown> {
    const path = buildPath('/tracks/{id}', { id: params.id });
    return this.client.get<unknown>(path, { market: params.market, contrast: params.contrast }, options);
  }

  /**
   * Lifetime play counts for up to 50 tracks in one call (`GET /partner/tracks/count`).
   * Needs an API release that serves this route; older ones answer 404 — fall back to
   * `partner.trackCount()` per id in that case.
   */
  counts(params: TracksCountsParams, options?: RequestOverrides): Promise<TrackPlayCounts> {
    return this.client.get<TrackPlayCounts>('/partner/tracks/count', { ids: params.ids }, options);
  }

  /**
   * Genres, moods and activities (with weights), BPM, credits with roles, the 30-second preview,
   * `has_lyrics` and vocal languages for up to 50 tracks in one call (`GET /track_insights`).
   * Throws a 503 `UPSTREAM_UNAVAILABLE` error (retried) when no id could be answered. Needs an API
   * release that serves this route; older ones answer 404.
   */
  insights(params: TracksInsightsParams, options?: RequestOverrides): Promise<TrackInsights> {
    return this.client.get<TrackInsights>('/track_insights', { ids: params.ids }, options);
  }

  /** Get a track's credits (writers, producers, performers). */
  credits(params: TracksCreditsParams, options?: RequestOverrides): Promise<GetTrackCreditsData> {
    return this.client.get<GetTrackCreditsData>('/track_credits', { id: params.id }, options);
  }

  /** Get a track's lyrics. */
  lyrics(params: TracksLyricsParams, options?: RequestOverrides): Promise<GetTrackLyricsData> {
    return this.client.get<GetTrackLyricsData>(
      '/track_lyrics',
      { id: params.id, format: params.format, vocalRemoval: params.vocalRemoval },
      options,
    );
  }

  /** Get track recommendations from seed tracks, artists and/or genres. */
  recommendations(params: TracksRecommendationsParams, options?: RequestOverrides): Promise<GetRecommendationsData> {
    return this.client.get<GetRecommendationsData>(
      '/recommendations',
      {
        limit: params.limit,
        seed_tracks: params.seed_tracks,
        seed_artists: params.seed_artists,
        seed_genres: params.seed_genres,
        market: params.market,
        include: params.include,
      },
      options,
    );
  }
}
