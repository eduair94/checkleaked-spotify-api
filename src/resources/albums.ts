import { Resource } from './base';
import type { CatalogBatchGaps } from './tracks';
import type { RequestOverrides } from '../types/common';
import type { GetAlbumsData, GetAlbumTracksData, GetAlbumMetadataData } from '../generated/responses';

/** Parameters for {@link AlbumsResource.get}. */
export interface AlbumsGetParams {
  /**
   * Spotify album IDs (max 50; API releases before 1.2.0 accept 20). Ids without an album are
   * listed in `missing` (Spotify does not know them) or `unavailable` (retry them later).
   */
  ids: string | readonly string[];
  /** ISO 3166-1 alpha-2 market code, e.g. `US`. */
  market?: string;
  /** Comma-separated providers to contrast against, e.g. `ytmusic,applemusic`. */
  contrast?: string;
  /** `playcounts` adds `playcount` (lifetime plays, `null` if unknown) to every album track. */
  include?: 'playcounts' | readonly 'playcounts'[];
}

/** Parameters for {@link AlbumsResource.tracks}. */
export interface AlbumTracksParams {
  /** Spotify album ID. */
  id: string;
  offset?: number;
  limit?: number;
}

/** Parameters for {@link AlbumsResource.metadata}. */
export interface AlbumMetadataParams {
  /** Spotify album ID. */
  id: string;
  contrast?: string;
}

/** Album endpoints. */
export class AlbumsResource extends Resource {
  /** Get one or more albums by ID. */
  get(params: AlbumsGetParams, options?: RequestOverrides): Promise<GetAlbumsData & CatalogBatchGaps> {
    return this.client.get<GetAlbumsData & CatalogBatchGaps>(
      '/albums',
      { ids: params.ids, market: params.market, contrast: params.contrast, include: params.include },
      options,
    );
  }

  /** Get an album's tracks (paginated). */
  tracks(params: AlbumTracksParams, options?: RequestOverrides): Promise<GetAlbumTracksData> {
    return this.client.get<GetAlbumTracksData>(
      '/album_tracks',
      { id: params.id, offset: params.offset, limit: params.limit },
      options,
    );
  }

  /** Get extended album metadata. */
  metadata(params: AlbumMetadataParams, options?: RequestOverrides): Promise<GetAlbumMetadataData> {
    return this.client.get<GetAlbumMetadataData>(
      '/album_metadata',
      { id: params.id, contrast: params.contrast },
      options,
    );
  }
}
