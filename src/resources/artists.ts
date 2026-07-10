import { Resource } from './base';
import type { RequestOverrides } from '../types/common';
import type {
  GetArtistsData,
  GetArtistOverviewData,
  GetArtistDiscographyOverviewData,
  GetArtistAlbumsData,
  GetArtistSinglesData,
  GetArtistAppearsOnData,
  GetArtistDiscoveredOnData,
  GetArtistFeaturingData,
  GetArtistRelatedData,
  GetArtistTopTracksData,
} from '../generated/responses';

/** Parameters for {@link ArtistsResource.get}. */
export interface ArtistsGetParams {
  /** Comma-separated artist IDs. */
  ids: string | readonly string[];
  /** Comma-separated providers to contrast against, e.g. `ytmusic,applemusic`. */
  contrast?: string;
}

/** Parameters for {@link ArtistsResource.overview}. */
export interface ArtistsOverviewParams {
  /** Spotify artist ID. */
  id: string;
  /** Comma-separated providers to contrast against, e.g. `ytmusic,applemusic`. */
  contrast?: string;
}

/** Parameters for {@link ArtistsResource.discographyOverview}. */
export interface ArtistsDiscographyOverviewParams {
  /** Spotify artist ID. */
  id: string;
}

/** Parameters for {@link ArtistsResource.albums}. */
export interface ArtistsAlbumsParams {
  /** Spotify artist ID. */
  id: string;
  offset?: number;
  limit?: number;
}

/** Parameters for {@link ArtistsResource.singles}. */
export interface ArtistsSinglesParams {
  /** Spotify artist ID. */
  id: string;
  offset?: number;
  limit?: number;
}

/** Parameters for {@link ArtistsResource.appearsOn}. */
export interface ArtistsAppearsOnParams {
  /** Spotify artist ID. */
  id: string;
}

/** Parameters for {@link ArtistsResource.discoveredOn}. */
export interface ArtistsDiscoveredOnParams {
  /** Spotify artist ID. */
  id: string;
}

/** Parameters for {@link ArtistsResource.featuring}. */
export interface ArtistsFeaturingParams {
  /** Spotify artist ID. */
  id: string;
}

/** Parameters for {@link ArtistsResource.related}. */
export interface ArtistsRelatedParams {
  /** Spotify artist ID. */
  id: string;
}

/** Parameters for {@link ArtistsResource.topTracks}. */
export interface ArtistsTopTracksParams {
  /** Spotify artist ID. */
  id: string;
  /** Market (country) code to localize results, e.g. `US`. */
  market?: string;
}

/** Artist endpoints. */
export class ArtistsResource extends Resource {
  /** Get one or more artists by ID. */
  get(params: ArtistsGetParams, options?: RequestOverrides): Promise<GetArtistsData> {
    return this.client.get<GetArtistsData>('/artists', { ids: params.ids, contrast: params.contrast }, options);
  }

  /** Get an artist overview. */
  overview(params: ArtistsOverviewParams, options?: RequestOverrides): Promise<GetArtistOverviewData> {
    return this.client.get<GetArtistOverviewData>(
      '/artist_overview',
      { id: params.id, contrast: params.contrast },
      options,
    );
  }

  /** Get an artist's discography overview. */
  discographyOverview(
    params: ArtistsDiscographyOverviewParams,
    options?: RequestOverrides,
  ): Promise<GetArtistDiscographyOverviewData> {
    return this.client.get<GetArtistDiscographyOverviewData>(
      '/artist_discography_overview',
      { id: params.id },
      options,
    );
  }

  /** Get an artist's albums (paginated). */
  albums(params: ArtistsAlbumsParams, options?: RequestOverrides): Promise<GetArtistAlbumsData> {
    return this.client.get<GetArtistAlbumsData>(
      '/artist_albums',
      { id: params.id, offset: params.offset, limit: params.limit },
      options,
    );
  }

  /** Get an artist's singles (paginated). */
  singles(params: ArtistsSinglesParams, options?: RequestOverrides): Promise<GetArtistSinglesData> {
    return this.client.get<GetArtistSinglesData>(
      '/artist_singles',
      { id: params.id, offset: params.offset, limit: params.limit },
      options,
    );
  }

  /** Get releases an artist appears on. */
  appearsOn(params: ArtistsAppearsOnParams, options?: RequestOverrides): Promise<GetArtistAppearsOnData> {
    return this.client.get<GetArtistAppearsOnData>('/artist_appears_on', { id: params.id }, options);
  }

  /** Get playlists an artist was discovered on. */
  discoveredOn(params: ArtistsDiscoveredOnParams, options?: RequestOverrides): Promise<GetArtistDiscoveredOnData> {
    return this.client.get<GetArtistDiscoveredOnData>('/artist_discovered_on', { id: params.id }, options);
  }

  /** Get tracks featuring an artist. */
  featuring(params: ArtistsFeaturingParams, options?: RequestOverrides): Promise<GetArtistFeaturingData> {
    return this.client.get<GetArtistFeaturingData>('/artist_featuring', { id: params.id }, options);
  }

  /** Get artists related to an artist. */
  related(params: ArtistsRelatedParams, options?: RequestOverrides): Promise<GetArtistRelatedData> {
    return this.client.get<GetArtistRelatedData>('/artist_related', { id: params.id }, options);
  }

  /** Get an artist's top tracks. */
  topTracks(params: ArtistsTopTracksParams, options?: RequestOverrides): Promise<GetArtistTopTracksData> {
    return this.client.get<GetArtistTopTracksData>(
      '/artist_top_tracks',
      { id: params.id, market: params.market },
      options,
    );
  }
}
