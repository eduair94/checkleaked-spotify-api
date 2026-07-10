import { Resource } from './base';
import type { GetSearchTopResultsData } from '../generated/responses';
import type { RequestOverrides } from '../types/common';
import type { GetSearchData, GetSearchLyricsData, GetSearchSuggestionsData } from '../generated/responses';

/** Parameters for {@link SearchResource.search}. */
export interface SearchParams {
  /** Search query. */
  q: string;
  /** Search type: `multi`, `tracks`, `albums`, `artists`, `playlists`, etc. Default `multi`. */
  type?: string;
  offset?: number;
  limit?: number;
  numberOfTopResults?: number;
  /** Comma-separated providers to contrast against, e.g. `ytmusic,applemusic`. */
  contrast?: string;
}

/** Parameters for {@link SearchResource.topResults}. */
export interface SearchTopResultsParams {
  q: string;
  numberOfTopResults?: number;
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
  type?: string;
  markets?: string;
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
        contrast: params.contrast,
      },
      options,
    );
  }

  /** Search returning only the top results. */
  topResults(params: SearchTopResultsParams, options?: RequestOverrides): Promise<GetSearchTopResultsData> {
    return this.client.get<GetSearchTopResultsData>(
      '/search_top_results',
      { q: params.q, numberOfTopResults: params.numberOfTopResults, contrast: params.contrast },
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
