import { Resource } from './base';
import type { RequestOverrides } from '../types/common';
import type { GetPlaylistData, GetPlaylistTracksData, GetSeedToPlaylistData } from '../generated/responses';
import type { TrackListIncludeOption } from './tracks';

/** Parameters for {@link PlaylistsResource.get}. */
export interface PlaylistsGetParams {
  /** Spotify playlist ID. */
  id: string;
  /** ISO 3166-1 alpha-2 market code, e.g. `US`. */
  market?: string;
}

/** Parameters for {@link PlaylistsResource.tracks}. */
export interface PlaylistsTracksParams {
  /** Spotify playlist ID. */
  id: string;
  offset?: number;
  /** Page size (1–100, default 100). */
  limit?: number;
  /** ISO 3166-1 alpha-2 market code, e.g. `US`. */
  market?: string;
  /**
   * Extra data on every track: `playcount` (lifetime plays as a number, user playlists included)
   * and `insights` (genres, moods, BPM, credits). Episodes and local files are left as they are.
   */
  include?: TrackListIncludeOption | readonly TrackListIncludeOption[];
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
    return this.client.get<GetPlaylistData>('/playlist', { id: params.id, market: params.market }, options);
  }

  /** Get a playlist's tracks (paginated). */
  tracks(params: PlaylistsTracksParams, options?: RequestOverrides): Promise<GetPlaylistTracksData> {
    return this.client.get<GetPlaylistTracksData>(
      '/playlist_tracks',
      { id: params.id, offset: params.offset, limit: params.limit, market: params.market, include: params.include },
      options,
    );
  }

  /** Generate a playlist from a seed URI. */
  fromSeed(params: PlaylistsFromSeedParams, options?: RequestOverrides): Promise<GetSeedToPlaylistData> {
    return this.client.get<GetSeedToPlaylistData>('/seed_to_playlist', { uri: params.uri }, options);
  }
}
