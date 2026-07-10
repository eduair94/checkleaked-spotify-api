import { Resource } from './base';
import type { GetCookiesRedisData, GetCredentialsStatusData } from '../generated/responses';
import type { QueryParams, RequestOverrides } from '../types/common';

/** Credentials / cookie-pool status endpoints. */
export class CredentialsResource extends Resource {
  /** Get the current credentials status. */
  status(query?: QueryParams, options?: RequestOverrides): Promise<GetCredentialsStatusData> {
    return this.client.get<GetCredentialsStatusData>('/credentials/status', query, options);
  }

  /** Get the Redis-backed cookie pool status. */
  redisCookies(query?: QueryParams, options?: RequestOverrides): Promise<GetCookiesRedisData> {
    return this.client.get<GetCookiesRedisData>('/cookies/redis', query, options);
  }
}
