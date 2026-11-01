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
  /** Album IDs (max 20). */
  ids: string | readonly string[];
}

/** Parameters for {@link BatchResource.artistOverview}. */
export interface BatchArtistOverviewParams {
  /** Artist IDs (max 10). */
  ids: string | readonly string[];
}

/** Parameters for {@link BatchResource.trackCredits}. */
export interface BatchTrackCreditsParams {
  /** Track IDs (max 20). */
  ids: string | readonly string[];
}

/** Parameters for {@link BatchResource.trackLyrics}. */
export interface BatchTrackLyricsParams {
  /** Track IDs (max 10). Tracks without lyrics come back as `{id, lyrics: null, error, notFound: true}`. */
  ids: string | readonly string[];
  /** Lyrics output format. Default `json`. */
  format?: 'json' | 'lrc' | 'srt' | 'raw';
  /** Request the vocal-removal (instrumental) variant. */
  vocalRemoval?: boolean;
}

/** Parameters for {@link BatchResource.trackPopularity}. */
export interface BatchTrackPopularityParams {
  /** Track IDs (max 50). */
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
      { ids: params.ids, format: params.format, vocalRemoval: params.vocalRemoval },
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
