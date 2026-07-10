import { Resource } from './base';
import type { GetCacheStatsData } from '../generated/responses';
import type { QueryParams, RequestOverrides } from '../types/common';

/** Parameters for {@link CacheResource.invalidate}. */
export interface CacheInvalidateParams {
  /** Exact cache key to invalidate. */
  key?: string;
  /** Glob/prefix pattern matching multiple cache keys to invalidate. */
  pattern?: string;
}

/** Cache administration endpoints. */
export class CacheResource extends Resource {
  /** Get cache statistics (hits, misses, size, etc.). */
  stats(query?: QueryParams, options?: RequestOverrides): Promise<GetCacheStatsData> {
    return this.client.get<GetCacheStatsData>('/cache/stats', query, options);
  }

  /** Invalidate cached entries by exact key or by matching pattern. */
  invalidate(params: CacheInvalidateParams, options?: RequestOverrides): Promise<unknown> {
    return this.client.post<unknown>(
      '/cache/invalidate',
      { key: params.key, pattern: params.pattern },
      undefined,
      options,
    );
  }
}
