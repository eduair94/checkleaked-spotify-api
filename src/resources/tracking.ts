import { Resource, buildPath } from './base';
import type { QueryParams, RequestOverrides } from '../types/common';
import type {
  GetTrackingItemsData,
  GetTrackingLogsData,
  GetTrackingStatsData,
  GetTrackingHealthData,
} from '../generated/responses';

/** Parameters for {@link TrackingResource.track}. */
export interface TrackingTrackParams {
  /** Kind of Spotify entity to track. */
  type: 'track' | 'album' | 'artist' | 'playlist';
  /** Spotify ID of the entity to track. */
  id: string;
}

/** Parameters for {@link TrackingResource.untrack}. */
export interface TrackingUntrackParams {
  /** Kind of Spotify entity to untrack. */
  type: string;
  /** Spotify ID of the entity to untrack. */
  id: string;
}

/** Parameters for {@link TrackingResource.items}. */
export interface TrackingItemsParams {
  offset?: number;
  limit?: number;
}

/** Parameters for {@link TrackingResource.item}. */
export interface TrackingItemParams {
  /** Kind of Spotify entity. */
  spotifyType: string;
  /** Spotify ID of the tracked entity. */
  spotifyId: string;
}

/** Parameters for {@link TrackingResource.logs}. */
export interface TrackingLogsParams {
  offset?: number;
  limit?: number;
}

/** Tracking endpoints. */
export class TrackingResource extends Resource {
  /** Start tracking a Spotify item. */
  track(params: TrackingTrackParams, options?: RequestOverrides): Promise<unknown> {
    return this.client.post<unknown>('/tracking/track', { type: params.type, id: params.id }, undefined, options);
  }

  /** Stop tracking a Spotify item. */
  untrack(params: TrackingUntrackParams, options?: RequestOverrides): Promise<unknown> {
    return this.client.delete<unknown>('/tracking/untrack', { type: params.type, id: params.id }, options);
  }

  /** List tracked items (paginated). */
  items(params: TrackingItemsParams, options?: RequestOverrides): Promise<GetTrackingItemsData> {
    return this.client.get<GetTrackingItemsData>(
      '/tracking/items',
      { offset: params.offset, limit: params.limit },
      options,
    );
  }

  /** Get the detail of a single tracked item. */
  item(params: TrackingItemParams, options?: RequestOverrides): Promise<unknown> {
    const path = buildPath('/tracking/items/{spotifyType}/{spotifyId}', {
      spotifyType: params.spotifyType,
      spotifyId: params.spotifyId,
    });
    return this.client.get<unknown>(path, undefined, options);
  }

  /** Get the tracking change log (paginated). */
  logs(params: TrackingLogsParams, options?: RequestOverrides): Promise<GetTrackingLogsData> {
    return this.client.get<GetTrackingLogsData>(
      '/tracking/logs',
      { offset: params.offset, limit: params.limit },
      options,
    );
  }

  /** Get tracking statistics. */
  stats(query?: QueryParams, options?: RequestOverrides): Promise<GetTrackingStatsData> {
    return this.client.get<GetTrackingStatsData>('/tracking/stats', query, options);
  }

  /** Get tracking subsystem health. */
  health(query?: QueryParams, options?: RequestOverrides): Promise<GetTrackingHealthData> {
    return this.client.get<GetTrackingHealthData>('/tracking/health', query, options);
  }
}
