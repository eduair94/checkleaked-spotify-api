import { Resource } from './base';
import type {
  GetHealthClusterData,
  GetHealthClusterStrictData,
  GetHealthInstanceData,
  GetHealthProxiesData,
  GetPingData,
} from '../generated/responses';
import type { QueryParams, RequestOverrides } from '../types/common';

/** Health, readiness and diagnostics endpoints. */
export class HealthResource extends Resource {
  /** Lightweight liveness probe. */
  ping(query?: QueryParams, options?: RequestOverrides): Promise<GetPingData> {
    return this.client.get<GetPingData>('/ping', query, options);
  }

  /** Overall cluster health summary. */
  get(query?: QueryParams, options?: RequestOverrides): Promise<unknown> {
    return this.client.get<unknown>('/health', query, options);
  }

  /** Health of the individual instance serving the request. */
  instance(query?: QueryParams, options?: RequestOverrides): Promise<GetHealthInstanceData> {
    return this.client.get<GetHealthInstanceData>('/health/instance', query, options);
  }

  /** Cluster-wide health overview. */
  cluster(query?: QueryParams, options?: RequestOverrides): Promise<GetHealthClusterData> {
    return this.client.get<GetHealthClusterData>('/health/cluster', query, options);
  }

  /** Strict cluster health check (fails unless every instance is healthy). */
  clusterStrict(query?: QueryParams, options?: RequestOverrides): Promise<GetHealthClusterStrictData> {
    return this.client.get<GetHealthClusterStrictData>('/health/cluster/strict', query, options);
  }

  /** Health and statistics for the proxy pool. */
  proxies(query?: QueryParams, options?: RequestOverrides): Promise<GetHealthProxiesData> {
    return this.client.get<GetHealthProxiesData>('/health/proxies', query, options);
  }

  /** Clear accumulated proxy statistics. */
  clearProxies(body?: unknown, query?: QueryParams, options?: RequestOverrides): Promise<unknown> {
    return this.client.post<unknown>('/health/proxies/clear', body, query, options);
  }

  /** Clear accumulated error counters. */
  clearErrors(body?: unknown, query?: QueryParams, options?: RequestOverrides): Promise<unknown> {
    return this.client.post<unknown>('/health/clear-errors', body, query, options);
  }
}
