import { Resource } from './base';
import type { GetPlaylistSnapshotData } from '../generated/responses';
import type { RequestOverrides } from '../types/common';

/** Parameters for {@link SnapshotsResource.list}. */
export interface SnapshotsListParams {
  /** Spotify playlist ID. */
  id: string;
}

/** Parameters for {@link SnapshotsResource.create}. */
export interface SnapshotsCreateParams {
  /** Spotify playlist ID to snapshot. */
  id?: string;
  /** Webhook URL notified when the snapshot completes. */
  webhook?: string;
}

/** Playlist snapshot endpoints. */
export class SnapshotsResource extends Resource {
  /** List the snapshots taken for a playlist. */
  list(params: SnapshotsListParams, options?: RequestOverrides): Promise<GetPlaylistSnapshotData> {
    return this.client.get<GetPlaylistSnapshotData>('/playlist_snapshot', { id: params.id }, options);
  }

  /** Create a new snapshot of a playlist. */
  create(params: SnapshotsCreateParams, options?: RequestOverrides): Promise<GetPlaylistSnapshotData> {
    return this.client.post<GetPlaylistSnapshotData>(
      '/playlist_snapshot',
      { id: params.id, webhook: params.webhook },
      undefined,
      options,
    );
  }
}
