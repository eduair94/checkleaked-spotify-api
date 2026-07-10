import { Resource } from './base';
import type { RequestOverrides } from '../types/common';

/** Parameters for {@link DownloadsResource.track}. */
export interface DownloadsTrackParams {
  /** Track query — a Spotify track URL/ID or a free-text search string. */
  q: string;
}

/** Parameters for {@link DownloadsResource.soundcloud}. */
export interface DownloadsSoundcloudParams {
  /** Track query — a SoundCloud track URL or a free-text search string. */
  q: string;
}

/** Track download endpoints. */
export class DownloadsResource extends Resource {
  /** Download a track. */
  track(params: DownloadsTrackParams, options?: RequestOverrides): Promise<unknown> {
    return this.client.get<unknown>('/download_track', { q: params.q }, options);
  }

  /** Download a track from SoundCloud. */
  soundcloud(params: DownloadsSoundcloudParams, options?: RequestOverrides): Promise<unknown> {
    return this.client.get<unknown>('/download_track_sc', { q: params.q }, options);
  }
}
