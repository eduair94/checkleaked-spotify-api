import { Resource } from './base';
import type { GetPartnerArtistDiscographyData, GetPartnerArtistOverviewData } from '../generated/responses';
import type { RequestOverrides } from '../types/common';
import type {
  GetPartnerPlaylistData,
  GetPartnerTrackData,
  GetPartnerTrackCountData,
  GetPartnerAlbumData,
} from '../generated/responses';

/** Parameters for {@link PartnerResource.playlist}. */
export interface PartnerPlaylistParams {
  /** 22-character Spotify playlist ID. */
  id: string;
  offset?: number;
  limit?: number;
}

/** Parameters for {@link PartnerResource.track}. */
export interface PartnerTrackParams {
  /** Spotify track ID. */
  id: string;
}

/** Parameters for {@link PartnerResource.trackCount}. */
export interface PartnerTrackCountParams {
  /** Spotify track ID. */
  spotify_track_id?: string;
  /** ISRC to look the track up by. */
  isrc?: string;
}

/** Parameters for {@link PartnerResource.album}. */
export interface PartnerAlbumParams {
  /** Spotify album ID. */
  id: string;
  /** Locale, e.g. `intl-es`. */
  locale?: string;
  offset?: number;
  limit?: number;
}

/** Parameters for {@link PartnerResource.artistOverview}. */
export interface PartnerArtistOverviewParams {
  /** Spotify artist ID. */
  id: string;
  /** Locale, e.g. `en`. */
  locale?: string;
  /** Include prerelease content. */
  includePrerelease?: boolean;
}

/** Parameters for {@link PartnerResource.artistDiscography}. */
export interface PartnerArtistDiscographyParams {
  /** Spotify artist ID. */
  id: string;
  offset?: number;
  limit?: number;
}

/** Spotify Partner (internal GraphQL) endpoints. */
export class PartnerResource extends Resource {
  /** Get partner playlist data (paginated). */
  playlist(params: PartnerPlaylistParams, options?: RequestOverrides): Promise<GetPartnerPlaylistData> {
    return this.client.get<GetPartnerPlaylistData>(
      '/partner/playlist',
      { id: params.id, offset: params.offset, limit: params.limit },
      options,
    );
  }

  /** Get partner track data. */
  track(params: PartnerTrackParams, options?: RequestOverrides): Promise<GetPartnerTrackData> {
    return this.client.get<GetPartnerTrackData>('/partner/track', { id: params.id }, options);
  }

  /** Get a track's play count by Spotify ID or ISRC. */
  trackCount(params: PartnerTrackCountParams, options?: RequestOverrides): Promise<GetPartnerTrackCountData> {
    return this.client.get<GetPartnerTrackCountData>(
      '/partner/track/count',
      { spotify_track_id: params.spotify_track_id, isrc: params.isrc },
      options,
    );
  }

  /** Get partner album data (paginated). */
  album(params: PartnerAlbumParams, options?: RequestOverrides): Promise<GetPartnerAlbumData> {
    return this.client.get<GetPartnerAlbumData>(
      '/partner/album',
      { id: params.id, locale: params.locale, offset: params.offset, limit: params.limit },
      options,
    );
  }

  /** Get partner artist overview. */
  artistOverview(
    params: PartnerArtistOverviewParams,
    options?: RequestOverrides,
  ): Promise<GetPartnerArtistOverviewData> {
    return this.client.get<GetPartnerArtistOverviewData>(
      '/partner/artist-overview',
      { id: params.id, locale: params.locale, includePrerelease: params.includePrerelease },
      options,
    );
  }

  /** Get partner artist discography (paginated). */
  artistDiscography(
    params: PartnerArtistDiscographyParams,
    options?: RequestOverrides,
  ): Promise<GetPartnerArtistDiscographyData> {
    return this.client.get<GetPartnerArtistDiscographyData>(
      '/partner/artist-discography',
      { id: params.id, offset: params.offset, limit: params.limit },
      options,
    );
  }
}
