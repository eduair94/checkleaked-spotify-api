import { Resource } from './base';
import type { GetSearchTopResultsData } from '../generated/responses';
import type { RequestOverrides } from '../types/common';
import type { GetSearchData, GetSearchLyricsData, GetSearchSuggestionsData } from '../generated/responses';
import type { TrackListIncludeOption } from './tracks';

/** Search result types accepted by `/search` and `/search_multi_market`. */
export type SearchType =
  'multi' | 'tracks' | 'albums' | 'artists' | 'playlists' | 'podcasts' | 'episodes' | 'users' | 'genres';

/** Parameters for {@link SearchResource.search}. */
export interface SearchParams {
  /** Search query. */
  q: string;
  /** Result type. Default `multi` (every bucket plus top results). */
  type?: SearchType | (string & {});
  offset?: number;
  /** Page size (1–100, default 10). */
  limit?: number;
  numberOfTopResults?: number;
  /** ISO 3166-1 alpha-2 market code, e.g. `US`. */
  market?: string;
  includeAudiobooks?: boolean;
  /**
   * Time limit per search attempt, in milliseconds. It can only shorten a search: `/search` makes
   * at most two attempts of up to 8 s each and answers within about 20 s, so values above 8000
   * change nothing. Not the HTTP timeout (that is `timeoutMs` in the client config).
   */
  timeout?: number;
  /** Comma-separated providers to contrast against, e.g. `ytmusic,applemusic`. */
  contrast?: string;
  /**
   * Extra data on every tracks-bucket hit (`type` `tracks` or `multi`), next to the hit's `data`
   * fields: `playcount` (lifetime plays) and `insights` (genres, moods, BPM, credits).
   */
  include?: TrackListIncludeOption | readonly TrackListIncludeOption[];
}

/** Parameters for {@link SearchResource.topResults}. */
export interface SearchTopResultsParams {
  q: string;
  offset?: number;
  limit?: number;
  numberOfTopResults?: number;
  includeAudiobooks?: boolean;
  includeAuthors?: boolean;
  includePreReleases?: boolean;
  /** @deprecated Ignored by `/search_top_results`. */
  contrast?: string;
}

/** Parameters for {@link SearchResource.lyrics}. */
export interface SearchLyricsParams {
  q: string;
  /** Lyrics output format. */
  format?: 'json' | 'lrc' | 'srt' | 'raw';
}

/** Parameters for {@link SearchResource.suggestions}. */
export interface SearchSuggestionsParams {
  q: string;
  offset?: number;
  limit?: number;
  numberOfTopResults?: number;
  includeAuthors?: boolean;
  debug?: boolean;
  timeout?: number;
  contrast?: string;
}

/** Parameters for {@link SearchResource.multiMarket}. */
export interface SearchMultiMarketParams {
  q: string;
  /** Result type. Default `tracks`. */
  type?: SearchType | (string & {});
  /** Comma-separated market codes (max 10), e.g. `US,GB,DE`. Required by the API. */
  markets?: string;
  /** Results per market (1–50, default 10). */
  limit?: number;
}

/** Search endpoints. */
export class SearchResource extends Resource {
  /** Search Spotify across one or more types. */
  search(params: SearchParams, options?: RequestOverrides): Promise<GetSearchData> {
    return this.client.get<GetSearchData>(
      '/search',
      {
        q: params.q,
        type: params.type,
        offset: params.offset,
        limit: params.limit,
        numberOfTopResults: params.numberOfTopResults,
        market: params.market,
        includeAudiobooks: params.includeAudiobooks,
        timeout: params.timeout,
        contrast: params.contrast,
        include: params.include,
      },
      options,
    );
  }

  /** Search returning only the mixed top results (`topResultsV2.itemsV2`). */
  topResults(params: SearchTopResultsParams, options?: RequestOverrides): Promise<GetSearchTopResultsData> {
    return this.client.get<GetSearchTopResultsData>(
      '/search_top_results',
      {
        q: params.q,
        offset: params.offset,
        limit: params.limit,
        numberOfTopResults: params.numberOfTopResults,
        includeAudiobooks: params.includeAudiobooks,
        includeAuthors: params.includeAuthors,
        includePreReleases: params.includePreReleases,
        contrast: params.contrast,
      },
      options,
    );
  }

  /** Search and return synced lyrics for the best match. */
  lyrics(params: SearchLyricsParams, options?: RequestOverrides): Promise<GetSearchLyricsData> {
    return this.client.get<GetSearchLyricsData>('/search_lyrics', { q: params.q, format: params.format }, options);
  }

  /** Search suggestions / autocomplete. */
  suggestions(params: SearchSuggestionsParams, options?: RequestOverrides): Promise<GetSearchSuggestionsData> {
    return this.client.get<GetSearchSuggestionsData>(
      '/search_suggestions',
      {
        q: params.q,
        offset: params.offset,
        limit: params.limit,
        numberOfTopResults: params.numberOfTopResults,
        includeAuthors: params.includeAuthors,
        debug: params.debug,
        timeout: params.timeout,
        contrast: params.contrast,
      },
      options,
    );
  }

  /** Search across multiple markets at once. */
  multiMarket(params: SearchMultiMarketParams, options?: RequestOverrides): Promise<unknown> {
    return this.client.get<unknown>(
      '/search_multi_market',
      { q: params.q, type: params.type, markets: params.markets, limit: params.limit },
      options,
    );
  }
}
