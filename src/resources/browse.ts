import { Resource, buildPath } from './base';
import type { GetBrowseFeaturedPlaylistsData, GetBrowseRecommendationsData } from '../generated/responses';
import type { RequestOverrides } from '../types/common';
import type {
  GetBrowseCategoriesData,
  GetBrowseCategoriesIdData,
  GetBrowseNewReleasesData,
} from '../generated/responses';

/** Parameters for {@link BrowseResource.categories}. */
export interface BrowseCategoriesParams {
  /** @deprecated Ignored by `/browse/categories`. */
  country?: string;
  /** Locale (e.g. `en_US`). */
  locale?: string;
  /** Default 20. */
  limit?: number;
  offset?: number;
}

/** Parameters for {@link BrowseResource.category}. */
export interface BrowseCategoryParams {
  /** Spotify category ID. */
  id: string;
  /** ISO country code (e.g. `US`). */
  country?: string;
  /** Locale (e.g. `en_US`). */
  locale?: string;
  /** Sections per page (1–50, default 10). */
  section_limit?: number;
  /** Section offset (default 0). */
  section_offset?: number;
  /** Items per section (1–50, default 10). */
  item_limit?: number;
  /** Item offset within each section (default 0). */
  item_offset?: number;
}

/** Parameters for {@link BrowseResource.featuredPlaylists}. */
export interface BrowseFeaturedPlaylistsParams {
  /** @deprecated Ignored by `/browse/featured-playlists`. */
  country?: string;
  /** Locale (e.g. `en_US`). */
  locale?: string;
  /** ISO 8601 local time used to pick time-of-day playlists. */
  timestamp?: string;
  /** Default 20. */
  limit?: number;
  offset?: number;
}

/** Parameters for {@link BrowseResource.newReleases}. */
export interface BrowseNewReleasesParams {
  /** ISO country code (e.g. `US`, the default). */
  country?: string;
  /** Default 20. */
  limit?: number;
  offset?: number;
}

/** Parameters for {@link BrowseResource.recommendations}. */
export interface BrowseRecommendationsParams {
  /** Comma-separated seed track IDs. */
  seed_tracks?: string | readonly string[];
  /** Comma-separated seed artist IDs. */
  seed_artists?: string | readonly string[];
  /** Comma-separated seed genres. */
  seed_genres?: string;
  /** Number of tracks (1–100, default 20). */
  limit?: number;
  /** ISO 3166-1 alpha-2 market code, e.g. `US`. */
  market?: string;
}

/** Browse endpoints. */
export class BrowseResource extends Resource {
  /** List browse categories. */
  categories(params?: BrowseCategoriesParams, options?: RequestOverrides): Promise<GetBrowseCategoriesData> {
    return this.client.get<GetBrowseCategoriesData>(
      '/browse/categories',
      {
        country: params?.country,
        locale: params?.locale,
        limit: params?.limit,
        offset: params?.offset,
      },
      options,
    );
  }

  /** Get a single browse category by ID. */
  category(params: BrowseCategoryParams, options?: RequestOverrides): Promise<GetBrowseCategoriesIdData> {
    const path = buildPath('/browse/categories/{id}', { id: params.id });
    return this.client.get<GetBrowseCategoriesIdData>(
      path,
      {
        country: params.country,
        locale: params.locale,
        section_limit: params.section_limit,
        section_offset: params.section_offset,
        item_limit: params.item_limit,
        item_offset: params.item_offset,
      },
      options,
    );
  }

  /** Get featured playlists. */
  featuredPlaylists(
    params?: BrowseFeaturedPlaylistsParams,
    options?: RequestOverrides,
  ): Promise<GetBrowseFeaturedPlaylistsData> {
    return this.client.get<GetBrowseFeaturedPlaylistsData>(
      '/browse/featured-playlists',
      {
        country: params?.country,
        locale: params?.locale,
        timestamp: params?.timestamp,
        limit: params?.limit,
        offset: params?.offset,
      },
      options,
    );
  }

  /** Get new album releases for a country. A `stale: true` flag marks an outdated upstream list. */
  newReleases(params?: BrowseNewReleasesParams, options?: RequestOverrides): Promise<GetBrowseNewReleasesData> {
    return this.client.get<GetBrowseNewReleasesData>(
      '/browse/new-releases',
      { country: params?.country, limit: params?.limit, offset: params?.offset },
      options,
    );
  }

  /** Get track recommendations from seed tracks, artists, and/or genres. */
  recommendations(
    params?: BrowseRecommendationsParams,
    options?: RequestOverrides,
  ): Promise<GetBrowseRecommendationsData> {
    return this.client.get<GetBrowseRecommendationsData>(
      '/browse/recommendations',
      {
        seed_tracks: params?.seed_tracks,
        seed_artists: params?.seed_artists,
        seed_genres: params?.seed_genres,
        limit: params?.limit,
        market: params?.market,
      },
      options,
    );
  }
}
