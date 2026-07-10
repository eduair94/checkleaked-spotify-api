import { Resource, buildPath } from './base';
import type { RequestOverrides } from '../types/common';
import type { GetShowsData, GetShowsIdData } from '../generated/responses';

/** Parameters for {@link ShowsResource.get}. */
export interface ShowsGetParams {
  /** Comma-separated Spotify show IDs. */
  ids: string | readonly string[];
  /** ISO market code. */
  market?: string;
}

/** Parameters for {@link ShowsResource.getById}. */
export interface ShowsGetByIdParams {
  /** Spotify show ID. */
  id: string;
  /** ISO market code. */
  market?: string;
}

/** Parameters for {@link ShowsResource.episodes}. */
export interface ShowsEpisodesParams {
  /** Spotify show ID. */
  id: string;
  offset?: number;
  limit?: number;
}

/** Show (podcast) endpoints. */
export class ShowsResource extends Resource {
  /** Get one or more shows by ID. */
  get(params: ShowsGetParams, options?: RequestOverrides): Promise<GetShowsData> {
    return this.client.get<GetShowsData>('/shows', { ids: params.ids, market: params.market }, options);
  }

  /** Get a single show by ID. */
  getById(params: ShowsGetByIdParams, options?: RequestOverrides): Promise<GetShowsIdData> {
    const path = buildPath('/shows/{id}', { id: params.id });
    return this.client.get<GetShowsIdData>(path, { market: params.market }, options);
  }

  /** Get a show's episodes (paginated). */
  episodes(params: ShowsEpisodesParams, options?: RequestOverrides): Promise<unknown> {
    const path = buildPath('/shows/{id}/episodes', { id: params.id });
    return this.client.get<unknown>(path, { offset: params.offset, limit: params.limit }, options);
  }
}
