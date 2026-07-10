import { Resource } from './base';
import type { RequestOverrides } from '../types/common';
import type { GetPlaylistData, GetPlaylistTracksData, GetSeedToPlaylistData } from '../generated/responses';

/** Parameters for {@link PlaylistsResource.get}. */
export interface PlaylistsGetParams {
  /** Spotify playlist ID. */
  id: string;
}

/** Parameters for {@link PlaylistsResource.tracks}. */
export interface PlaylistsTracksParams {
  /** Spotify playlist ID. */
  id: string;
  offset?: number;
  limit?: number;
}

/** Parameters for {@link PlaylistsResource.fromSeed}. */
export interface PlaylistsFromSeedParams {
  /** Spotify URI to seed the generated playlist from. */
  uri: string;
}

/** Playlist endpoints. */
export class PlaylistsResource extends Resource {
  /** Get a playlist by ID. */
  get(params: PlaylistsGetParams, options?: RequestOverrides): Promise<GetPlaylistData> {
    return this.client.get<GetPlaylistData>('/playlist', { id: params.id }, options);
  }

  /** Get a playlist's tracks (paginated). */
  tracks(params: PlaylistsTracksParams, options?: RequestOverrides): Promise<GetPlaylistTracksData> {
    return this.client.get<GetPlaylistTracksData>(
      '/playlist_tracks',
      { id: params.id, offset: params.offset, limit: params.limit },
      options,
    );
  }

  /** Generate a playlist from a seed URI. */
  fromSeed(params: PlaylistsFromSeedParams, options?: RequestOverrides): Promise<GetSeedToPlaylistData> {
    return this.client.get<GetSeedToPlaylistData>('/seed_to_playlist', { uri: params.uri }, options);
  }
}
