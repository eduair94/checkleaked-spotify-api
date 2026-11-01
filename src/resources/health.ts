import { Resource } from './base';
import type {
  GetHealthClusterData,
  GetHealthClusterStrictData,
  GetHealthInstanceData,
  GetPingData,
} from '../generated/responses';
import type { QueryParams, RequestOverrides } from '../types/common';

/** Overall service state reported by `GET /status`. */
export type ApiStatusState = 'operational' | 'degraded' | 'major_outage' | 'unknown';

/** One endpoint family in {@link ApiStatus}. */
export interface ApiStatusComponent {
  /** `catalog`, `play_counts`, `artists`, `search`, `playlists`, `lyrics`, `charts`, `concerts` or `downloads`. */
  id: string;
  name: string;
  status: ApiStatusState;
  /** Percentage (0–100) of requests in the last 15 minutes that did not fail (5xx/timeout); null without traffic. */
  successRate15m?: number | null;
  /** Same over the last 24 hours. */
  successRate24h?: number | null;
  p50Ms?: number | null;
  p95Ms?: number | null;
  requests15m?: number;
}

/** Public service status (`GET /status`). */
export interface ApiStatus {
  status: ApiStatusState;
  updatedAt: string;
  /** Identifier of the API build serving the request. */
  version?: string;
  /** Human-readable status page. */
  statusPage?: string;
  components: ApiStatusComponent[];
}

/** Health, status and liveness endpoints. */
export class HealthResource extends Resource {
  /** Lightweight liveness probe. */
  ping(query?: QueryParams, options?: RequestOverrides): Promise<GetPingData> {
    return this.client.get<GetPingData>('/ping', query, options);
  }

  /**
   * Public service status: overall state plus per-endpoint-family success rates and
   * latency (`GET /status`). Also available as `client.status()`.
   */
  status(options?: RequestOverrides): Promise<ApiStatus> {
    return this.client.get<ApiStatus>('/status', undefined, options);
  }

  /** Basic health check. Prefer {@link HealthResource.status} for monitoring. */
  get(query?: QueryParams, options?: RequestOverrides): Promise<unknown> {
    return this.client.get<unknown>('/health', query, options);
  }

  /**
   * Health of the individual instance serving the request.
   * @deprecated Internal diagnostics; use {@link HealthResource.status}.
   */
  instance(query?: QueryParams, options?: RequestOverrides): Promise<GetHealthInstanceData> {
    return this.client.get<GetHealthInstanceData>('/health/instance', query, options);
  }

  /**
   * Cluster-wide health overview.
   * @deprecated Internal diagnostics; use {@link HealthResource.status}.
   */
  cluster(query?: QueryParams, options?: RequestOverrides): Promise<GetHealthClusterData> {
    return this.client.get<GetHealthClusterData>('/health/cluster', query, options);
  }

  /**
   * Strict cluster health check (fails unless every instance is healthy).
   * @deprecated Internal diagnostics; use {@link HealthResource.status}.
   */
  clusterStrict(query?: QueryParams, options?: RequestOverrides): Promise<GetHealthClusterStrictData> {
    return this.client.get<GetHealthClusterStrictData>('/health/cluster/strict', query, options);
  }
}
