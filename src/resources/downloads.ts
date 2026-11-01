import { Resource } from './base';
import type { RequestOverrides } from '../types/common';

/** Parameters for {@link DownloadsResource.track}. */
export interface DownloadsTrackParams {
  /** Track query — a Spotify track ID, a free-text search string, or a YouTube URL. */
  q: string;
  /** Custom YouTube search query (overrides the one derived from `q`). */
  q_youtube?: string;
  /** Return only the download object, without Spotify track data. */
  onlyLinks?: boolean;
  /** Search YouTube with `q` as-is, skipping the Spotify lookup. */
  bypassSpotify?: boolean;
  /** Download the video instead of audio only. */
  downloadFullVideo?: boolean;
  /** yt-dlp format selector. */
  quality?: string;
  /** Include alternative download URLs. */
  extraUrls?: boolean;
}

/** Parameters for {@link DownloadsResource.soundcloud}. */
export interface DownloadsSoundcloudParams {
  /** Track query — a Spotify track ID or a free-text search string. */
  q: string;
  /** Return only the download object, without Spotify track data. */
  onlyLinks?: boolean;
}

/** Track download endpoints. */
export class DownloadsResource extends Resource {
  /**
   * Download a track via YouTube. Videos that cannot be served fail fast with a 422
   * (`VIDEO_UNAVAILABLE`, `AGE_RESTRICTED`, `PREMIUM_ONLY`).
   */
  track(params: DownloadsTrackParams, options?: RequestOverrides): Promise<unknown> {
    return this.client.get<unknown>(
      '/download_track',
      {
        q: params.q,
        q_youtube: params.q_youtube,
        onlyLinks: params.onlyLinks,
        bypassSpotify: params.bypassSpotify,
        downloadFullVideo: params.downloadFullVideo,
        quality: params.quality,
        extraUrls: params.extraUrls,
      },
      options,
    );
  }

  /** Download a track from SoundCloud. */
  soundcloud(params: DownloadsSoundcloudParams, options?: RequestOverrides): Promise<unknown> {
    return this.client.get<unknown>('/download_track_sc', { q: params.q, onlyLinks: params.onlyLinks }, options);
  }
}
