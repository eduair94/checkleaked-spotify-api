import { Resource, buildPath } from './base';
import type { RequestOverrides } from '../types/common';
import type { GetEpisodesData } from '../generated/responses';

/** Parameters for {@link EpisodesResource.get}. */
export interface EpisodesGetParams {
  /** Comma-separated Spotify episode IDs. */
  ids: string | readonly string[];
  /** ISO 3166-1 alpha-2 market code. */
  market?: string;
}

/** Parameters for {@link EpisodesResource.byId}. */
export interface EpisodesByIdParams {
  /** Spotify episode ID. */
  id: string;
  /** ISO 3166-1 alpha-2 market code. */
  market?: string;
}

/** Episode endpoints. */
export class EpisodesResource extends Resource {
  /** Get one or more episodes by ID. */
  get(params: EpisodesGetParams, options?: RequestOverrides): Promise<GetEpisodesData> {
    return this.client.get<GetEpisodesData>('/episodes', { ids: params.ids, market: params.market }, options);
  }

  /** Get a single episode by ID. */
  byId(params: EpisodesByIdParams, options?: RequestOverrides): Promise<unknown> {
    const path = buildPath('/episodes/{id}', { id: params.id });
    return this.client.get<unknown>(path, { market: params.market }, options);
  }
}
