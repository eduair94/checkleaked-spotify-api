import { Resource } from './base';
import type { RequestOverrides } from '../types/common';
import type { GetAlbumsData, GetAlbumTracksData, GetAlbumMetadataData } from '../generated/responses';

/** Parameters for {@link AlbumsResource.get}. */
export interface AlbumsGetParams {
  /** Comma-separated Spotify album IDs. */
  ids: string | readonly string[];
  /** Comma-separated providers to contrast against, e.g. `ytmusic,applemusic`. */
  contrast?: string;
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
  get(params: AlbumsGetParams, options?: RequestOverrides): Promise<GetAlbumsData> {
    return this.client.get<GetAlbumsData>('/albums', { ids: params.ids, contrast: params.contrast }, options);
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
