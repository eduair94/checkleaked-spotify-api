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
  /** ISO country code (e.g. `US`). */
  country?: string;
  /** Locale (e.g. `en_US`). */
  locale?: string;
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
}

/** Parameters for {@link BrowseResource.featuredPlaylists}. */
export interface BrowseFeaturedPlaylistsParams {
  /** ISO country code (e.g. `US`). */
  country?: string;
  /** Locale (e.g. `en_US`). */
  locale?: string;
  limit?: number;
  offset?: number;
}

/** Parameters for {@link BrowseResource.newReleases}. */
export interface BrowseNewReleasesParams {
  /** ISO country code (e.g. `US`). */
  country?: string;
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
  limit?: number;
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
      { country: params.country, locale: params.locale },
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
        limit: params?.limit,
        offset: params?.offset,
      },
      options,
    );
  }

  /** Get new album releases. */
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
      },
      options,
    );
  }
}
