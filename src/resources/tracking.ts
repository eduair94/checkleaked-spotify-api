import { Resource, buildPath } from './base';
import { normalizeId } from '../ids';
import type { QueryParams, RequestOverrides } from '../types/common';
import type {
  GetTrackingItemsData,
  GetTrackingLogsData,
  GetTrackingStatsData,
  GetTrackingHealthData,
} from '../generated/responses';

/** Kind of Spotify entity that can be tracked. */
export type TrackingEntityType = 'track' | 'album' | 'artist' | 'playlist';

/** Change types recorded in the tracking log. */
export type TrackingChangeType =
  | 'popularity_change'
  | 'followers_change'
  | 'monthly_listeners_change'
  | 'track_count_change'
  | 'name_change'
  | 'snapshot_change'
  | 'initial_snapshot'
  | 'playlist_tracks_change'
  | 'album_tracks_change'
  | 'generic_change';

// Field order is type-then-id on purpose: the Python SDK is generated from these interfaces and
// keeps 1.0's positional order, `tracking.track("track", "<id>")`.

/** Parameters for {@link TrackingResource.track}. */
export interface TrackingTrackParams {
  /** Kind of Spotify entity to track. */
  spotifyType: TrackingEntityType;
  /** 22-character Spotify ID of the entity to track. */
  spotifyId: string;
  /** Optional label for your own reference. */
  label?: string;
}

/** Parameters for {@link TrackingResource.untrack}. */
export interface TrackingUntrackParams {
  /** Kind of Spotify entity. */
  spotifyType: TrackingEntityType;
  /** 22-character Spotify ID of the tracked entity. */
  spotifyId: string;
}

/** Parameters for {@link TrackingResource.items}. */
export interface TrackingItemsParams {
  /** @deprecated Ignored by the API: `items()` always returns every tracked item. */
  offset?: number;
  /** @deprecated Ignored by the API: `items()` always returns every tracked item. */
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
  /** Only changes of this Spotify ID. */
  spotifyId?: string;
  /** Only changes of this entity type. */
  spotifyType?: TrackingEntityType;
  /** Only this kind of change. */
  changeType?: TrackingChangeType;
  /** ISO 8601 date-time; only changes detected at or after it. */
  since?: string;
  /** ISO 8601 date-time; only changes detected at or before it. */
  until?: string;
  offset?: number;
  /** Max entries (default 50, max 200). */
  limit?: number;
}

/**
 * Tracking endpoints. Tracked items belong to the calling account: your RapidAPI account, or your
 * direct API key.
 */
export class TrackingResource extends Resource {
  /** Start tracking a Spotify item (HTTP 201). `spotifyId` may also be a URI or URL. */
  track(params: TrackingTrackParams, options?: RequestOverrides): Promise<unknown> {
    // Body fields skip the query-string id normalization, so reduce URIs/URLs here.
    return this.client.post<unknown>(
      '/tracking/track',
      { spotifyId: normalizeId(params.spotifyId), spotifyType: params.spotifyType, label: params.label },
      undefined,
      options,
    );
  }

  /** Stop tracking a Spotify item. */
  untrack(params: TrackingUntrackParams, options?: RequestOverrides): Promise<unknown> {
    return this.client.delete<unknown>(
      '/tracking/untrack',
      { spotifyId: params.spotifyId, spotifyType: params.spotifyType },
      options,
    );
  }

  /** List every item you track. */
  items(params: TrackingItemsParams = {}, options?: RequestOverrides): Promise<GetTrackingItemsData> {
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

  /** Get the tracking change log, optionally filtered. */
  logs(params: TrackingLogsParams = {}, options?: RequestOverrides): Promise<GetTrackingLogsData> {
    return this.client.get<GetTrackingLogsData>(
      '/tracking/logs',
      {
        spotifyId: params.spotifyId,
        spotifyType: params.spotifyType,
        changeType: params.changeType,
        since: params.since,
        until: params.until,
        offset: params.offset,
        limit: params.limit,
      },
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
