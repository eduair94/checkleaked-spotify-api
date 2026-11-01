import { Resource } from './base';
import type { GetPlaylistSnapshotData } from '../generated/responses';
import type { RequestOverrides } from '../types/common';

/** Parameters for {@link SnapshotsResource.list}. */
export interface SnapshotsListParams {
  /** Spotify playlist ID. */
  id: string;
  /** Snapshots per page (1–100, default 10). */
  limit?: number;
  offset?: number;
  /** Set `false` to omit the stored track lists. Default `true`. */
  include_tracks?: boolean;
}

/** Parameters for {@link SnapshotsResource.create}. */
export interface SnapshotsCreateParams {
  /** Spotify playlist ID to snapshot. */
  id?: string;
  /**
   * @deprecated Ignored by the API. Register webhooks with `webhooks.register()`; every
   * snapshot notifies the webhooks registered for its playlist.
   */
  webhook?: string;
}

/** Playlist snapshot endpoints. */
export class SnapshotsResource extends Resource {
  /** List the snapshots taken for a playlist. */
  list(params: SnapshotsListParams, options?: RequestOverrides): Promise<GetPlaylistSnapshotData> {
    return this.client.get<GetPlaylistSnapshotData>(
      '/playlist_snapshot',
      { id: params.id, limit: params.limit, offset: params.offset, include_tracks: params.include_tracks },
      options,
    );
  }

  /** Capture the playlist now and diff it against the previous snapshot. */
  create(params: SnapshotsCreateParams, options?: RequestOverrides): Promise<GetPlaylistSnapshotData> {
    return this.client.post<GetPlaylistSnapshotData>(
      '/playlist_snapshot',
      { id: params.id, webhook: params.webhook },
      undefined,
      options,
    );
  }
}
