import { Resource } from './base';
import type { RequestOverrides } from '../types/common';
import type {
  GetAlbumMetadataBatchData,
  GetArtistOverviewBatchData,
  GetTrackCreditsBatchData,
  GetTrackLyricsBatchData,
  GetTrackPopularityBatchData,
} from '../generated/responses';

/** Parameters for {@link BatchResource.albumMetadata}. */
export interface BatchAlbumMetadataParams {
  /** Comma-separated album IDs (max 25). */
  ids: string | readonly string[];
}

/** Parameters for {@link BatchResource.artistOverview}. */
export interface BatchArtistOverviewParams {
  /** Comma-separated artist IDs (max 25). */
  ids: string | readonly string[];
}

/** Parameters for {@link BatchResource.trackCredits}. */
export interface BatchTrackCreditsParams {
  /** Comma-separated track IDs (max 25). */
  ids: string | readonly string[];
}

/** Parameters for {@link BatchResource.trackLyrics}. */
export interface BatchTrackLyricsParams {
  /** Comma-separated track IDs. */
  ids: string | readonly string[];
  /** Lyrics output format. Default `json`. */
  format?: 'json' | 'lrc' | 'srt' | 'raw';
}

/** Parameters for {@link BatchResource.trackPopularity}. */
export interface BatchTrackPopularityParams {
  /** Comma-separated track IDs. */
  ids: string | readonly string[];
}

/** Batch endpoints — fetch metadata for many IDs in one call. */
export class BatchResource extends Resource {
  /** Get extended album metadata for many albums at once. */
  albumMetadata(params: BatchAlbumMetadataParams, options?: RequestOverrides): Promise<GetAlbumMetadataBatchData> {
    return this.client.get<GetAlbumMetadataBatchData>('/album_metadata_batch', { ids: params.ids }, options);
  }

  /** Get artist overviews for many artists at once. */
  artistOverview(params: BatchArtistOverviewParams, options?: RequestOverrides): Promise<GetArtistOverviewBatchData> {
    return this.client.get<GetArtistOverviewBatchData>('/artist_overview_batch', { ids: params.ids }, options);
  }

  /** Get credits for many tracks at once. */
  trackCredits(params: BatchTrackCreditsParams, options?: RequestOverrides): Promise<GetTrackCreditsBatchData> {
    return this.client.get<GetTrackCreditsBatchData>('/track_credits_batch', { ids: params.ids }, options);
  }

  /** Get synced lyrics for many tracks at once. */
  trackLyrics(params: BatchTrackLyricsParams, options?: RequestOverrides): Promise<GetTrackLyricsBatchData> {
    return this.client.get<GetTrackLyricsBatchData>(
      '/track_lyrics_batch',
      { ids: params.ids, format: params.format },
      options,
    );
  }

  /** Get popularity scores for many tracks at once. */
  trackPopularity(
    params: BatchTrackPopularityParams,
    options?: RequestOverrides,
  ): Promise<GetTrackPopularityBatchData> {
    return this.client.get<GetTrackPopularityBatchData>('/track_popularity_batch', { ids: params.ids }, options);
  }
}
