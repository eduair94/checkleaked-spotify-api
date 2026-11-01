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
import type { TrackListIncludeOption } from './tracks';

/** Parameters for {@link ChartsResource.top200Tracks}. */
export interface ChartsTop200TracksParams {
  /** Chart period: `daily` (default) or `weekly`. */
  period?: 'daily' | 'weekly' | (string & {});
  /** ISO country code of a Spotify Charts market, or `global` (default). */
  country?: string;
  /** Chart date (`YYYY-MM-DD`). Defaults to the latest available. */
  date?: string;
  /** City chart instead of a country chart, e.g. `saopaulo`. */
  city?: string;
  /**
   * Extra data in every entry's `trackMetadata`: `insights` (genres, moods, BPM, credits) and
   * `playcount` (lifetime plays). The response stays a list; the `X-Include-Status` header reports
   * how many resolved.
   */
  include?: TrackListIncludeOption | readonly TrackListIncludeOption[];
}

/** Parameters for {@link ChartsResource.topArtists}. */
export interface ChartsTopArtistsParams {
  /** Chart period: `daily` (default) or `weekly`. */
  period?: 'daily' | 'weekly' | (string & {});
  /** ISO country code of a Spotify Charts market, or `global` (default). */
  country?: string;
  /** Chart date (`YYYY-MM-DD`). Defaults to the latest available. */
  date?: string;
}

/** Parameters for {@link ChartsResource.topAlbums}. Album charts are weekly only. */
export interface ChartsTopAlbumsParams {
  /** @deprecated Album charts are weekly only; the API ignores this. */
  period?: string;
  /** ISO country code of a Spotify Charts market, or `global` (default). */
  country?: string;
  /** Chart date (`YYYY-MM-DD`). Defaults to the latest available. */
  date?: string;
}

/** Parameters for {@link ChartsResource.viralTracks}. Viral charts are daily only. */
export interface ChartsViralTracksParams {
  /** ISO country code of a Spotify Charts market, or `global` (default). */
  country?: string;
  /** Chart date (`YYYY-MM-DD`). Defaults to the latest available. */
  date?: string;
  /**
   * Extra data in every entry's `trackMetadata`: `insights` (genres, moods, BPM, credits) and
   * `playcount` (lifetime plays). The response stays a list; the `X-Include-Status` header reports
   * how many resolved.
   */
  include?: TrackListIncludeOption | readonly TrackListIncludeOption[];
}

/** Spotify Charts endpoints. */
export class ChartsResource extends Resource {
  /** Most-listened artists (Wikipedia list; `monthlyListeners` is in millions). */
  topByMonthlyListeners(query?: QueryParams, options?: RequestOverrides): Promise<GetTop20ByMonthlyListenersData> {
    return this.client.get<GetTop20ByMonthlyListenersData>('/top_20_by_monthly_listeners', query, options);
  }

  /** Top 200 tracks chart. */
  top200Tracks(params: ChartsTop200TracksParams, options?: RequestOverrides): Promise<GetTop200TracksData> {
    return this.client.get<GetTop200TracksData>(
      '/top_200_tracks',
      { period: params.period, country: params.country, date: params.date, city: params.city, include: params.include },
      options,
    );
  }

  /** Top artists chart. */
  topArtists(params: ChartsTopArtistsParams, options?: RequestOverrides): Promise<GetTopArtistsData> {
    return this.client.get<GetTopArtistsData>(
      '/top_artists',
      { period: params.period, country: params.country, date: params.date },
      options,
    );
  }

  /** Top albums chart. */
  topAlbums(params: ChartsTopAlbumsParams, options?: RequestOverrides): Promise<GetTopAlbumsData> {
    return this.client.get<GetTopAlbumsData>(
      '/top_albums',
      { period: params.period, country: params.country, date: params.date },
      options,
    );
  }

  /** Viral tracks chart. */
  viralTracks(params: ChartsViralTracksParams, options?: RequestOverrides): Promise<GetViralTracksData> {
    return this.client.get<GetViralTracksData>(
      '/viral_tracks',
      { country: params.country, date: params.date, include: params.include },
      options,
    );
  }

  /** Most-followed artists (Wikipedia list; followers in millions). */
  topByFollowers(query?: QueryParams, options?: RequestOverrides): Promise<GetTop20ByFollowersData> {
    return this.client.get<GetTop20ByFollowersData>('/top_20_by_followers', query, options);
  }
}
