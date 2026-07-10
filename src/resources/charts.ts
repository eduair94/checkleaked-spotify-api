import { Resource } from './base';
import type { QueryParams, RequestOverrides } from '../types/common';
import type {
  GetTop20ByMonthlyListenersData,
  GetTop200TracksData,
  GetTopArtistsData,
  GetTopAlbumsData,
  GetViralTracksData,
  GetTop20ByFollowersData,
} from '../generated/responses';

/** Parameters for {@link ChartsResource.top200Tracks}. */
export interface ChartsTop200TracksParams {
  /** Chart period, e.g. `daily` or `weekly`. Default `daily`. */
  period?: string;
  /** Country code or `global`. Default `global`. */
  country?: string;
  /** Chart date (`YYYY-MM-DD`). Defaults to the latest available. */
  date?: string;
}

/** Parameters for {@link ChartsResource.topArtists}. */
export interface ChartsTopArtistsParams {
  /** Chart period, e.g. `daily` or `weekly`. Default `daily`. */
  period?: string;
  /** Country code or `global`. Default `global`. */
  country?: string;
}

/** Parameters for {@link ChartsResource.topAlbums}. */
export interface ChartsTopAlbumsParams {
  /** Chart period, e.g. `daily` or `weekly`. Default `daily`. */
  period?: string;
  /** Country code or `global`. Default `global`. */
  country?: string;
}

/** Parameters for {@link ChartsResource.viralTracks}. */
export interface ChartsViralTracksParams {
  /** Country code or `global`. Default `global`. */
  country?: string;
}

/** Spotify Charts endpoints. */
export class ChartsResource extends Resource {
  /** Top 20 artists by monthly listeners. */
  topByMonthlyListeners(query?: QueryParams, options?: RequestOverrides): Promise<GetTop20ByMonthlyListenersData> {
    return this.client.get<GetTop20ByMonthlyListenersData>('/top_20_by_monthly_listeners', query, options);
  }

  /** Top 200 tracks chart. */
  top200Tracks(params: ChartsTop200TracksParams, options?: RequestOverrides): Promise<GetTop200TracksData> {
    return this.client.get<GetTop200TracksData>(
      '/top_200_tracks',
      { period: params.period, country: params.country, date: params.date },
      options,
    );
  }

  /** Top artists chart. */
  topArtists(params: ChartsTopArtistsParams, options?: RequestOverrides): Promise<GetTopArtistsData> {
    return this.client.get<GetTopArtistsData>(
      '/top_artists',
      { period: params.period, country: params.country },
      options,
    );
  }

  /** Top albums chart. */
  topAlbums(params: ChartsTopAlbumsParams, options?: RequestOverrides): Promise<GetTopAlbumsData> {
    return this.client.get<GetTopAlbumsData>(
      '/top_albums',
      { period: params.period, country: params.country },
      options,
    );
  }

  /** Viral tracks chart. */
  viralTracks(params: ChartsViralTracksParams, options?: RequestOverrides): Promise<GetViralTracksData> {
    return this.client.get<GetViralTracksData>('/viral_tracks', { country: params.country }, options);
  }

  /** Top 20 artists by followers. */
  topByFollowers(query?: QueryParams, options?: RequestOverrides): Promise<GetTop20ByFollowersData> {
    return this.client.get<GetTop20ByFollowersData>('/top_20_by_followers', query, options);
  }
}
