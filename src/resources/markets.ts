import { Resource } from './base';
import type { GetMarketsData } from '../generated/responses';
import type { QueryParams, RequestOverrides } from '../types/common';

/** Markets endpoints. */
export class MarketsResource extends Resource {
  /** List the markets (countries) where Spotify is available. */
  get(query?: QueryParams, options?: RequestOverrides): Promise<GetMarketsData> {
    return this.client.get<GetMarketsData>('/markets', query, options);
  }
}
