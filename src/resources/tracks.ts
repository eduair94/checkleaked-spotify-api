import { Resource } from './base';
import type { RequestOverrides } from '../types/common';
import type {
  GetTracksData,
  GetTrackCreditsData,
  GetTrackLyricsData,
  GetRecommendationsData,
} from '../generated/responses';

/** Parameters for {@link TracksResource.get}. */
export interface TracksGetParams {
  /** Comma-separated track IDs. */
  ids: string | readonly string[];
  /**
   * Comma-separated list of streaming providers to contrast against.
   * Appends a `_contrast` field to the response with cross-platform matching data.
   * Available providers: `ytmusic`, `applemusic`, `amazonmusic`, `tencentmusic`, `pandora`, `gaana`.
   */
  contrast?: string;
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
  /** Number of recommended tracks to return. */
  limit?: number;
  /** Comma-separated seed track IDs. */
  seed_tracks?: string | readonly string[];
  /** Comma-separated seed artist IDs. */
  seed_artists?: string | readonly string[];
  /** Comma-separated seed genres. */
  seed_genres?: string;
}

/** Track endpoints. */
export class TracksResource extends Resource {
  /** Get one or more tracks by ID. */
  get(params: TracksGetParams, options?: RequestOverrides): Promise<GetTracksData> {
    return this.client.get<GetTracksData>('/tracks', { ids: params.ids, contrast: params.contrast }, options);
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
      },
      options,
    );
  }
}
