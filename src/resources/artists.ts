import { Resource } from './base';
import type { CatalogBatchGaps } from './tracks';
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
  /**
   * Artist IDs (max 50). Ids without an artist are listed in `missing` (Spotify does not know
   * them) or `unavailable` (retry them later).
   */
  ids: string | readonly string[];
  /** ISO 3166-1 alpha-2 market code, e.g. `US`. */
  market?: string;
  /** Comma-separated providers to contrast against, e.g. `ytmusic,applemusic`. */
  contrast?: string;
  /**
   * Extra data per artist: `stats` → `stats` (followers, monthly_listeners, world_rank, top_cities;
   * also fills `followers.total`), `insights` → `insights` (genre / mood / tempo profile from the top
   * tracks). Values that could not be fetched are `null`.
   */
  include?: 'stats' | 'insights' | readonly ('stats' | 'insights')[];
}

/** Parameters for {@link ArtistsResource.insights}. */
export interface ArtistsInsightsParams {
  /** 1–20 artist IDs (bare ids, `spotify:artist:` URIs or open.spotify.com URLs). */
  ids: string | readonly string[];
}

/** A genre, mood or activity of an artist, aggregated over the artist's top tracks. */
export interface ArtistInsightTag {
  name: string;
  display_name: string;
  /** Mean weight over the artist's top tracks (0–1). */
  weight: number;
  /** How many of those tracks carry the tag. */
  tracks: number;
}

/** One entry of {@link ArtistInsights}. */
export interface ArtistInsightsEntry {
  id: string;
  status: 'ok' | 'not_found' | 'error';
  name: string | null;
  /** Market of the top-tracks list the figures come from. */
  country: string | null;
  /** The top tracks the figures are computed over, in Spotify's order. */
  top_track_ids: string[];
  genres: ArtistInsightTag[];
  moods: ArtistInsightTag[];
  activities: ArtistInsightTag[];
  /** Tempo of the top tracks that have an analysis. */
  bpm: { average: number; min: number; max: number; tracks: number } | null;
  basis: 'top_tracks';
  /** Present when `status` is `error`. */
  error?: string;
}

/** Response of {@link ArtistsResource.insights}. */
export interface ArtistInsights {
  /** One entry per requested id, in request order. */
  artists: ArtistInsightsEntry[];
  missing: string[];
  unavailable: string[];
}

/** Parameters for {@link ArtistsResource.overview}. */
export interface ArtistsOverviewParams {
  /** Spotify artist ID. */
  id: string;
  /** Drop the heavy music-video, merch and visual-identity blocks (stats and top tracks are kept). */
  slim?: boolean;
  /** Comma-separated providers to contrast against, e.g. `ytmusic,applemusic`. */
  contrast?: string;
  /** `insights`: the artist's genre / mood / tempo profile in `data.artistUnion.insights`. */
  include?: 'insights' | readonly 'insights'[];
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
  get(params: ArtistsGetParams, options?: RequestOverrides): Promise<GetArtistsData & CatalogBatchGaps> {
    return this.client.get<GetArtistsData & CatalogBatchGaps>(
      '/artists',
      { ids: params.ids, market: params.market, contrast: params.contrast, include: params.include },
      options,
    );
  }

  /**
   * Genres, moods and activities (with weights) and tempo range for up to 20 artists
   * (`GET /artist_insights`), aggregated from Spotify's descriptors of each artist's top tracks.
   * Needs an API release that serves this route; older ones answer 404.
   */
  insights(params: ArtistsInsightsParams, options?: RequestOverrides): Promise<ArtistInsights> {
    return this.client.get<ArtistInsights>('/artist_insights', { ids: params.ids }, options);
  }

  /** Get an artist overview. */
  overview(params: ArtistsOverviewParams, options?: RequestOverrides): Promise<GetArtistOverviewData> {
    return this.client.get<GetArtistOverviewData>(
      '/artist_overview',
      { id: params.id, slim: params.slim, contrast: params.contrast, include: params.include },
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
