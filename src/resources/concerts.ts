import { Resource } from './base';
import type { RequestOverrides } from '../types/common';
import type {
  GetPartnerConcertLocationsData,
  GetPartnerConcertData,
  GetPartnerArtistConcertsData,
  GetPartnerSearchConcertArtistsData,
} from '../generated/responses';

/** Parameters for {@link ConcertsResource.locations}. */
export interface ConcertsLocationsParams {
  /** City, venue, or place name. */
  query: string;
}

/** Parameters for {@link ConcertsResource.feed}. */
export interface ConcertsFeedParams {
  /** Spotify geohash (from `/partner/concert-locations`). */
  geoHash: string;
  /** Geoname ID (from `/partner/concert-locations`). */
  geonameId: string;
  /** Start of date range (YYYY-MM-DD). */
  from?: string;
  /** End of date range (YYYY-MM-DD). */
  to?: string;
  radiusInKm?: number;
  /** Comma-separated Spotify concept URIs (e.g. `spotify:concept:rock,spotify:concept:pop`). */
  conceptUris?: string;
  /** Pass back the `paginationKey` from a prior response. */
  paginationKey?: string;
  /** Enrich each concert with full concert details in parallel. */
  details?: boolean;
  /** Max concerts to enrich per request (max 50). */
  detailsLimit?: number;
  /** Return a flat, normalized concert shape instead of raw GraphQL. */
  parsed?: boolean;
}

/** Parameters for {@link ConcertsResource.get}. */
export interface ConcertsGetParams {
  /** Concert ID, `spotify:concert:URI`, or `open.spotify.com/concert/<id>` URL. */
  id: string;
  /** Return a flat, normalized concert shape instead of raw GraphQL. */
  parsed?: boolean;
  /** Set `false` to query as anonymous user (omits `me.profile` block). */
  authenticated?: boolean;
}

/** Parameters for {@link ConcertsResource.byArtist}. */
export interface ConcertsByArtistParams {
  /** Artist ID, URI, or open.spotify.com URL. */
  id: string;
  /** Geohash for nearby-concert prioritization. `0` = global. */
  geoHash?: string;
  includeNearby?: boolean;
  /** Enrich each concert with full concert details in parallel. */
  details?: boolean;
  /** Max concerts to enrich per request (max 50). */
  detailsLimit?: number;
  /** Return a flat, normalized concert shape instead of raw GraphQL. */
  parsed?: boolean;
}

/** Parameters for {@link ConcertsResource.searchArtists}. */
export interface ConcertsSearchArtistsParams {
  /** Artist name to search. */
  query: string;
  geoHash?: string;
  includeNearby?: boolean;
  /** Number of artist matches to return concerts for. */
  limit?: number;
  /** Enrich each concert with full concert details in parallel. */
  details?: boolean;
  /** Max concerts to enrich per request (max 50). */
  detailsLimit?: number;
  /** Return a flat, normalized concert shape instead of raw GraphQL. */
  parsed?: boolean;
}

/** Concert endpoints. */
export class ConcertsResource extends Resource {
  /** Search concert locations by city, venue, or place name. */
  locations(params: ConcertsLocationsParams, options?: RequestOverrides): Promise<GetPartnerConcertLocationsData> {
    return this.client.get<GetPartnerConcertLocationsData>(
      '/partner/concert-locations',
      { query: params.query },
      options,
    );
  }

  /** Get the concert feed for a location. */
  feed(params: ConcertsFeedParams, options?: RequestOverrides): Promise<unknown> {
    return this.client.get<unknown>(
      '/partner/concert-feed',
      {
        geoHash: params.geoHash,
        geonameId: params.geonameId,
        from: params.from,
        to: params.to,
        radiusInKm: params.radiusInKm,
        conceptUris: params.conceptUris,
        paginationKey: params.paginationKey,
        details: params.details,
        detailsLimit: params.detailsLimit,
        parsed: params.parsed,
      },
      options,
    );
  }

  /** Get details for a single concert. */
  get(params: ConcertsGetParams, options?: RequestOverrides): Promise<GetPartnerConcertData> {
    return this.client.get<GetPartnerConcertData>(
      '/partner/concert',
      { id: params.id, parsed: params.parsed, authenticated: params.authenticated },
      options,
    );
  }

  /** Get an artist's upcoming concerts. */
  byArtist(params: ConcertsByArtistParams, options?: RequestOverrides): Promise<GetPartnerArtistConcertsData> {
    return this.client.get<GetPartnerArtistConcertsData>(
      '/partner/artist-concerts',
      {
        id: params.id,
        geoHash: params.geoHash,
        includeNearby: params.includeNearby,
        details: params.details,
        detailsLimit: params.detailsLimit,
        parsed: params.parsed,
      },
      options,
    );
  }

  /** Search concerts by artist name. */
  searchArtists(
    params: ConcertsSearchArtistsParams,
    options?: RequestOverrides,
  ): Promise<GetPartnerSearchConcertArtistsData> {
    return this.client.get<GetPartnerSearchConcertArtistsData>(
      '/partner/search-concert-artists',
      {
        query: params.query,
        geoHash: params.geoHash,
        includeNearby: params.includeNearby,
        limit: params.limit,
        details: params.details,
        detailsLimit: params.detailsLimit,
        parsed: params.parsed,
      },
      options,
    );
  }
}
